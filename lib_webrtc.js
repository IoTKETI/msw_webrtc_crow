const open = require('open')

let host = process.argv[2]
let drone = process.argv[3]

open('https://gcs.iotocean.org:7598/drone?id=KETI_AIoT_02&audio=true')
open('https://' + host + '/drone?id=' + drone + '&audio=true')
