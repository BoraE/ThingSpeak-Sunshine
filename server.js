/**
 * Example code to send data to ThingSpead channel
 */

'use strict';

const http = require('http');
const Arduino = require('./arduino');
let arduino = new Arduino();

const api_key = '4A2TGQH341HCQ17T';
const url = 'http://api.thingspeak.com/update.json';

class Server {
    constructor() {
        arduino.on('data', this.sendData.bind(this));
    }

    sendData(data) {
        let light_current = data.light_level_current;
        let light_average = data.light_level_average;
        let temperature = (25.0*data.temperature/1023) + 10.0;
        let query = `api_key=${api_key}&field1=${light_current}&field2=${light_average}&field4=${temperature}`;
        let path = url + '?' + query;

        http.get(path, (res) => {
            // console.log(`Got response: ${res.statusCode}`);
            res.on('data', function(chunk) {
                // console.log(`Got data ${chunk}`);
            });
        }).on('error', (e) => {
            console.log(`Got error: ${e.message}`);
        });
    }
}

module.exports = Server;
