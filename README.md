# msw_webrtc_crow

This repository was developed using WebRTC and a video capture board to stream video from the drone.
In addition, it runs on a Raspberry Pi-based mission computer called CROW.
***

### 1. Install
- `Chrome Driver` - WebDriver for running WebRTC
```shell
sh ready_to_WebRTC.sh
```
- `pyvirtualdisplay dependencies` - for virtual display
```shell
sudo apt-get install -y xvfb xserver-xephyr tigervnc-standalone-server x11-utils

python3 -m pip install pyvirtualdisplay pillow EasyProcess
```
- `node package` - Node.js package
```shell
npm install
```

### 2. Add Mission
```
"mission" : {
    "msw_webrtc_crow": {
        "container" : ["camera=webcam"],
        "sub_container" : ["Control"],
        "git" : "https://github.com/IoTKETI/msw_webrtc_crow.git"
    }
}
```
