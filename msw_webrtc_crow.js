/**
 * Created by Wonseok Jung in KETI on 2021-06-28.
 */

    // for TAS of mission
const mqtt = require('mqtt');
const fs = require('fs');
const {exec, spawn} = require('child_process');
const {nanoid} = require('nanoid');
const util = require("util");
const os = require('os');

global.sh_man = require('./http_man');

let my_msw_name = 'msw_webrtc_crow';

let config = {};

config.name = my_msw_name;
global.drone_info = '';

try {
    drone_info = JSON.parse(fs.readFileSync('../drone_info.json', 'utf8'));

    config.directory_name = my_msw_name + '_' + my_msw_name;
    // config.sortie_name = '/' + sortie_name;
    config.gcs = drone_info.gcs;
    config.drone = drone_info.drone;
    config.lib = [];
}
catch (e) {
    // config.sortie_name = '';
    config.directory_name = '';
    config.gcs = 'KETI_MUV';
    config.drone = 'FC_MUV_01';
    config.lib = [];
}

// library 추가
let add_lib = {};
try {
    add_lib = JSON.parse(fs.readFileSync('./lib_webrtc_crow.json', 'utf8'));
    if (drone_info.mission[my_msw_name].container !== add_lib.data) {
        add_lib.data = drone_info.mission[my_msw_name].container
    }
    if (drone_info.mission[my_msw_name].sub_container !== add_lib.control) {
        add_lib.control = drone_info.mission[my_msw_name].sub_container
    }
    config.lib.push(add_lib);
}
catch (e) {
    add_lib = {
        name: 'lib_webrtc_crow',
        description: '[name] [WebRTCpath] [Drone Name] [GCS Name]',
        scripts: 'lib_webrtc_crow.py gcs.iotocean.org:7598 drone1 KETI_GCS',
        data: [
            "camera:webcam"
        ],
        control: ['Control']
    };
    config.lib.push(add_lib);
}

let mobius_control_msw_topic = [];
let lib_data_msw_topic = [];

function init() {
    if (config.lib.length > 0) {
        for (let idx in config.lib) {
            if (config.lib.hasOwnProperty(idx)) {
                if (local_mqtt_client) {
                    for (let i = 0; i < config.lib[idx].control.length; i++) {
                        let sub_container_name = config.lib[idx].control[i];
                        let _topic = '/Tele/' + my_msw_name + '/' + sub_container_name;
                        local_mqtt_client.subscribe(_topic);
                        mobius_control_msw_topic.push(_topic);
                        console.log('[local_mqtt] mobius_control_msw_topic[' + i + ']: ' + _topic);
                    }
                }

                let obj_lib = config.lib[idx];
                setTimeout(runLib,  60 * 1000, JSON.parse(JSON.stringify(obj_lib)));
            }
        }
    }
}

let runLibState = '';

function runLib(obj_lib) {
    try {
        let scripts_arr = obj_lib.scripts.split(' ');

        process.argv.splice(0, 2);

        let webrtc_port = scripts_arr[1].split(':')[1];
        let video_source;
        if (process.argv.length > 0) video_source = process.argv[0];
        else video_source = 'camera=webcam';

        console.log('python3 ' + scripts_arr[0] + ' ' + drone_info.host + ':' + webrtc_port + ' ' + drone_info.drone + ' ' + drone_info.gcs + ' ' + video_source);
        exec('python3 ' + scripts_arr[0] + ' ' + drone_info.host + ':' + webrtc_port + ' ' + drone_info.drone + ' ' + drone_info.gcs + ' ' + video_source, (error, stdout, stderr)=>{
            if (error) {
                console.log('error: ' + error);
                exec('pm2 restart ' + my_msw_name + '_' + video_source.split('=')[0], (error, stdout, stderr) => {
                    if (error) {
                        console.log('error: ' + error);
                    }
                    if (stdout) {
                        console.log('stdout: ' + stdout);
                    }
                    if (stderr) {
                        console.log('stderr: ' + stderr);
                    }
                });
            }
            if (stdout) {
                console.log('stdout: ' + stdout);
            }
            if (stderr) {
                console.log('stderr: ' + stderr);
                if (stderr.includes("Failed to execute script 'lib_webrtc_crow' due to unhandled exception!")) {
                    runLibState = 'error';
                }
            }
        });
    }
    catch (e) {
        console.log(e.message);
    }
}

let local_mqtt_client = null;

local_msw_mqtt_connect('localhost', 1883);

function local_msw_mqtt_connect(broker_ip, port) {
    if (!local_mqtt_client) {
        let connectOptions = {
            host: broker_ip,
            port: port,
            protocol: "mqtt",
            keepalive: 10,
            protocolId: "MQTT",
            protocolVersion: 4,
            clientId: config.name + '_mqttjs_' + nanoid(15),
            clean: true,
            reconnectPeriod: 2 * 1000,
            connectTimeout: 30 * 1000,
            queueQoSZero: false,
            rejectUnauthorized: false
        };

        local_mqtt_client = mqtt.connect(connectOptions);

        local_mqtt_client.on('connect', () => {
            console.log('[local_msw_mqtt_connect] connected to ' + broker_ip);
        });

        local_mqtt_client.on('message', (topic, message) => {
            if (mobius_control_msw_topic.includes(topic)) {
                setTimeout(on_receive_from_muv, parseInt(Math.random() * 5), topic, message.toString());
            }
        });

        local_mqtt_client.on('error', (err) => {
            console.log(err.message);
        });
    }
}

function on_receive_from_muv(topic, str_message) {
    console.log('[' + topic + '] ' + str_message);

    parseControlMission(topic, str_message);
}

let sequence = 0;

function on_receive_from_lib(topic, str_message) {
    console.log('[' + topic + '] ' + str_message + '\n');

    if (getType(str_message) === 'string') {
        str_message = (sequence.toString(16).padStart(2, '0')) + str_message;
    }
    else {
        str_message = JSON.parse(str_message);
        str_message.sequence = sequence;
        str_message = JSON.stringify(str_message);
    }

    sequence++;
    sequence %= 255;

    parseDataMission(topic, str_message);
}

function on_process_fc_data(topic, str_message) {
    // console.log('[' + topic + '] ' + str_message + '\n');

    let topic_arr = topic.split('/');
    try {
        fc[topic_arr[topic_arr.length - 1]] = JSON.parse(str_message.toString());
    }
    catch (e) {
    }

    parseFcData(topic, str_message);
}

setTimeout(init, 1000);

// 유저 디파인 미션 소프트웨어 기능
///////////////////////////////////////////////////////////////////////////////
function parseDataMission(topic, str_message) {
    try {
        // let obj_lib_data = JSON.parse(str_message);
        // if (fc.hasOwnProperty('global_position_int')) {
        //     Object.assign(obj_lib_data, JSON.parse(JSON.stringify(fc['global_position_int'])));
        // }
        // str_message = JSON.stringify(obj_lib_data);


        let topic_arr = topic.split('/');
        let data_topic = '/' + config.name + '/Tele/' + topic_arr[topic_arr.length - 1];
        if (local_mqtt_client) {
            local_mqtt_client.publish(data_topic, str_message);
        }
    }
    catch (e) {
        console.log('[parseDataMission] data format of lib is not json');
    }
}

///////////////////////////////////////////////////////////////////////////////

function parseControlMission(topic, str_message) {
    try {
        let topic_arr = topic.split('/');
        let cam_name = str_message.split('=')[0]
        let _topic = '/MUV/control/' + config.lib[0].name + '/' + topic_arr[topic_arr.length - 1] + '/' + cam_name;
        local_mqtt_client.publish(_topic, str_message.split('=')[1], () => {
            console.log('publish ' + _topic, str_message.split('=')[1])
        });
    }
    catch (e) {
        console.log('[parseControlMission] data format of lib is not json');
    }
}

function parseFcData(topic, str_message) {
    // let topic_arr = topic.split('/');
    // if (topic_arr[topic_arr.length - 1] === 'system_time') {
    //     let _topic = '/MUV/control/' + config.lib[0].name + '/' + config.lib[0].control[0]; // 'system_time'
    //     local_mqtt_client.publish(_topic, str_message);
    // } else if (topic_arr[topic_arr.length - 1] === 'timesync') {
    //     let _topic = '/MUV/control/' + config.lib[0].name + '/' + config.lib[0].control[1]; // 'timesync'
    //     local_msw_mqtt_clint.publish(_topic, str_message);
    // } else {
    // }
}
