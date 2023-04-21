# msw_webrtc_crow

This repository was developed using WebRTC and a video capture board to stream video from the drone.
In addition, it runs on a Raspberry Pi-based mission computer called CROW.
***

### 1. Install
- `Chrome Driver` - WebDriver for running WebRTC
```shell
sh ready_to_WebRTC.sh
```
- `xvfb` - for virtual display
```shell
sudo apt-get install xvfb
```
- `node package` - Node.js package
```shell
npm install
```

### 2. Add Mission
```
"mission" : {
    "containor" : ["room_name"],
    "subcontainor" : ["Control"],
    "git" : "https://github.com/IoTKETI/msw_webrtc_crow.git"
}
```
