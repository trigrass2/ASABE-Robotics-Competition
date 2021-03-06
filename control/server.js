console.log('[OK] Server started. Service will be ready in a few seconds.');

var express = require('express');
var serveStatic = require('serve-static');
var cp = require('child_process');
var fs = require('fs');

var car = null;
var serverStartTimestamp = Date.now();
var processStartTimestamp = null;

// this will also lunch vision (note: moudle will be cached, so don't worry)

// var tree = require('./lib/tree');

console.log('[OK] Server ready.');

var carLogs = [];
var carStatus = {};

var app = express();

app.post('/control/start', function (req, res) {
    console.log('server.js: start');
    if (car) {
        return;
    }
    car = cp.fork(__dirname + '/index.js');
    car.on('message', function(msg) {
        if (msg.logs) {
            carLogs = msg.logs;
        }
        if (msg.status) {
            carStatus = msg.status;
        }
    });
    processStartTimestamp = Date.now();
    res.send('I am happy.');
});

app.post('/control/pause', function(req, res) {
    console.log('server.js: pause');
    if (car) {
        car.send({command: 'pause'});
    }
    res.send('I am happy.');
});

app.post('/control/resume', function(req, res) {
    console.log('server.js: resume');
    if (car) {
        car.send({command: 'resume'});
    }
    res.send('I am happy.');
});

app.post('/control/stop', function(req, res) {
    console.log('server.js: stop');
    if (car) {
        // 注意 vision cpp 进程不会被杀死，但是它会被复用，所以不用担心
        // 估计是 Node 的 module 缓存做的好事。
        car.kill('SIGHUP');
        // console.log('Index.js killed, try to pkill vision');
        // cp.exec('sudo pkill vision');
    }
    car = null;
    processStartTimestamp = null;
    goStartTimestamp = null;
    res.send('I am happy.');
});

var goStartTimestamp = null;

app.post('/control/go', function(req, res) {
    console.log('server.js: go');
    goStartTimestamp = Date.now();
    if (car) {
        car.send({command: 'go'});
    }
    res.send('I am happy.');
});

app.post('/control/debug', function(req, res) {
    console.log('server.js: debug');
    if (car) {
        car.send({command: 'debug'});
    }
    res.send('I am happy.');
});

app.post('/control/unit-test', function(req, res) {
    console.log('server.js: test');
    if (car) {
        car.send({command: 'test'});
    }
    res.send('I am happy.');
});

app.post('/control/eval', function(req, res) {
    var car = require('./lib/car');
    req.rawBody = '';
    req.setEncoding('utf8');

    req.on('data', function(chunk) {
        req.rawBody += chunk;
    });

    req.on('end', function() {
        console.log('/control/eval:', req.rawBody);
        try {
            eval(req.rawBody);
        } catch(e) {
            console.warn(e);
        }
        res.send('I am happy.');
    });

});

// from: http://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
var HHMMSS = function(sec_num) {
    sec_num = parseInt(sec_num, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time  = hours+':'+minutes+':'+seconds;
    return time;
};

// setInterval(function() {
//     if (fs.existsSync('/run/shm/data.json')) {
//         try {
//             var data = JSON.parse(fs.readFileSync('/run/shm/data.json'));
//             carLogs = data.logs;
//             carStatus = data.status;
//         } catch(e) {
//             // console.log(e);
//         }
//     }
// }, 100);

app.get('/logs', function(req, res) {
    if (fs.existsSync('/run/shm/data.json')) {
        fs.createReadStream('/run/shm/data.json').pipe(res);
    } else {
        res.end();
    }
});

app.get('/status', function(req, res) {
    var status = {}; // JSON.parse(JSON.stringify(carStatus));

    status.uptime = {
        server: HHMMSS((Date.now() - serverStartTimestamp) / 1000),
        process: processStartTimestamp ? HHMMSS((Date.now() - processStartTimestamp) / 1000) : null,
        go: goStartTimestamp ? HHMMSS((Date.now() - goStartTimestamp) / 1000) : null
    };

    res.send(JSON.stringify(status));
});

app.get('/frame.jpg', function(req, res) {
    // console.log('fetch /run/shm/frame.jpg');
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    if (fs.existsSync('/run/shm/vision.jpg')) {
        fs.createReadStream('/run/shm/vision.jpg').pipe(res);
    } else {
        res.end();
    }
});

app.use(serveStatic('../console', {'index': ['index.html', 'index.htm']}));

app.listen(80);
