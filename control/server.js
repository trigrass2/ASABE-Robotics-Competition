var express = require('express');
var serveStatic = require('serve-static');
var cp = require('child_process');
var fs = require('fs');

var car = null;
var status = {};

var app = express();

app.post('/control/start', function (req, res) {
    console.log('server.js: start');
    if (car) {
        return;
    }
    car = cp.fork(__dirname + '/index.js');
    car.on('message', function(msg) {
        Object.keys(msg).forEach(function(k) {
            status[k] = msg[k];
        });
    });
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
    }
    car = null;
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

app.get('/status', function(req, res) {
    res.send(JSON.stringify(status));
});

app.get('/frame.jpg', function(req, res) {
    // console.log('fetch /run/shm/frame.jpg');
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    if (fs.existsSync('/run/shm/frame.jpg')) {
        fs.createReadStream('/run/shm/frame.jpg').pipe(res);
    } else {
        res.end();
    }
});

app.use(serveStatic('../console', {'index': ['index.html', 'index.htm']}));

app.listen(80);
