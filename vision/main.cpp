#include <opencv2/opencv.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <iostream>
#include <stdio.h>
#include <unistd.h>

using namespace std;
using namespace cv;

// http://docs.opencv.org/modules/highgui/doc/reading_and_writing_images_and_video.html
// 分离颜色通道&多通道图像混合：http://blog.csdn.net/poem_qianmo/article/details/21176257

// 摄像头共两个，在小车两侧的边缘底部挂着。接近地面。摄像头距离小树轴心 16cm。
// https://github.com/zenozeng/ASABE-Robotics-Competition/issues/61

int main()
{
    cout << "Vision Started." << endl;

    VideoCapture capture(0);

    if (capture.isOpened()) {
        cout << "Video opened." << endl;
    } else {
        cout << "Fail to open video" << endl;
        return -1;
    }

    capture.set(CV_CAP_PROP_FRAME_WIDTH, 320);
    capture.set(CV_CAP_PROP_FRAME_HEIGHT, 240);

    // create window for debug
    if (DEBUG) {
        namedWindow("frame");
        namedWindow("roi-bottom-s");
        namedWindow("roi-top-s");
    }

    while (true)
    {
        Mat frame;
        capture >> frame;

        // narrow to 1:1 rect based on height
        int width = frame.cols;
        int height = frame.rows;
        frame = frame(Rect((width - height) / 2, 0, height, height));
        width = height;

        Mat hls;
        cvtColor(frame, hls, CV_BGR2HLS);

        // HSL 通道分离
        vector<Mat> hlsChannels;
        Mat h, s;
        split(hls, hlsChannels);
        h = hlsChannels.at(0);
        s = hlsChannels.at(2);

        // http://docs.opencv.org/doc/tutorials/imgproc/threshold/threshold.html
        // 30 - 255 -> 255; 0 - 30 -> 0
        threshold(s, s, 30, 255, 0);

        // 判断树是否存在
        Rect bottom(0, height * 0.75, width, height * 0.24); // x, y, width, height
        Mat bottomROI = s(bottom);

        double rate = sum(bottomROI)[0] / (bottomROI.rows * bottomROI.cols * 255);
        bool exists = rate > 0.1;

        cout << endl;
        cout << "<Tree Detect Loop>" << endl;

        cout << "Tree Exists? " << exists << ", (BottomROI Rate: "<< rate << ")" << endl;

        // 若树存在，判断其颜色类型
        if (exists) {
            int count = 0;
            int hueSum = 0;
            for (int y = 0; y < bottomROI.rows; y++) {
                for (int x = 0; x < bottomROI.cols; x++) {
                    if (s.at<Vec3b>(x, y)[0] == 255) {
                        count++;
                        hueSum += h.at<Vec3b>(x, y)[0];
                    }
                }
            }
            double hue = 1.0 * hueSum / count / 255 * 360;
            string color;
            if (hue > 35 && hue < 70) {
                color = "Yellow";
            } else if (hue > 70 && hue < 240) {
                color = "Green";
            } else {
                color = "Brown";
            }
            cout << "Color: " << color << ", Ava Hue [0-360): " << hue << endl;
        }

        // 若树存在，判断高矮
        if (exists) {
            Rect top(0, height * 0.2, width, height * 0.05); // x, y, width, height
            Mat topROI = s(top);
            double topROIRate = sum(topROI)[0] / (topROI.rows * topROI.cols * 255);
            bool isHigh = topROIRate > 0.1;
            cout << "Tree is High? " << isHigh << ", (TopROI Rate: " << topROIRate << ")" << endl;

            if (DEBUG) {
                imshow("roi-top-s", topROI);
            }
        }

        Scalar grey(255 * 0.1, 255 * 0.1, 255 * 0.1);
        // 下边界标示
        rectangle(frame, Point(0, height * 0.65), Point(width, height * 0.75), grey, -1, 8);
        // 上边界标示
        rectangle(frame, Point(0, height * 0.25), Point(width, height * 0.3), grey, -1, 8);
        rectangle(frame, Point(0, height * 0.15), Point(width, height * 0.2), grey, -1, 8);

        imwrite("../console/frame.jpg", frame);

        if (DEBUG) {
            imshow("frame", frame);
            imshow("roi-bottom-s", bottomROI);
            waitKey(100);
        }
    }

    return 0;
}
