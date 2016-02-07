"use strict";
const events = require('events');
const serialport = require('serialport');

class Arduino extends events.EventEmitter {
    constructor(opts) {
        super();
        this.update('disconnected'); // Start the state machine
    }

    update(state, data) {
        this.state = state;
        switch(state) {
        case 'disconnected':
            setTimeout(this._findArduinoComPort.bind(this), 1000);
            break;
        case 'discovered':
            this.device = data.comName;
            this.init();
            break;
        case 'connected':
            // do nothing
            break;
        case 'closed':
            setTimeout(this._findArduinoComPort.bind(this), 1000);
            break;
        case 'error':
            setTimeout(this._findArduinoComPort.bind(this), 1000);
            break;
        }
    }

    _findArduinoComPort() {
        var self = this;
        console.log('Looking for a serial port with an Arduino connected to it.');
        serialport.list(function (err, ports) {
            if (err) {
                self.update('error');
                return; // Retry after a delay
            }
            let port = ports.find( (port) => {
                if (port.manufacturer && port.manufacturer.match(/Arduino/gi) !== null) {
                    console.log('Arduino on serial port %s.', port.comName);
                    return true;
                }
            });
            if (port) {
                self.update('discovered', {comName: port.comName});
            } else {
                self.update('disconnected');
            }
        });
    }

    init() {
        this.serialPort = new serialport.SerialPort(this.device, {
            baudrate: 9600,
            parser: serialport.parsers.readline('\n')
        });

        let self = this;
        this.serialPort.on('open', function() {
            console.log('Serial communication with device %s is open.', self.device);
            self.update('connected');

            self.serialPort.on('data', function(data) {
                self.sendToServer(data);
            });

            self.serialPort.on('close', function() {
                console.log('Serial communication with device %s has been closed.', self.device);
                self.update('closed');
            });

            self.serialPort.on('error', function() {
                console.log('Serial communication with device %s has failed.', self.device);
                self.update('error');
            });
        });
    }

    sendToServer(data) {
        let obj;
        try {
            // console.log('Data received from Arduino:', data);
            obj = JSON.parse(data);
        } catch(err) {
            console.log('Invalid data received from Arduino:', data);
        }
        if (obj) {
            // console.log('Data sent to server:', obj);
            this.emit('data', obj);
        }
    }
}

module.exports = Arduino;
