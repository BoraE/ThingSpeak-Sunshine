"use strict";
const events = require('events');
const serialport = require('serialport');

class Arduino extends events.EventEmitter {
    constructor(opts) {
        super();
        this.options = opts || {};
        this.baudrate = this.options.baudrate || 9600;

        this.update('disconnected'); // Start the state machine
    }

    update(state, data) {
        this.state = state;
        switch(state) {
        case 'disconnected':
            this.resetDevice();
            setTimeout(this.findArduinoComPort.bind(this), 1000);
            break;
        case 'discovered':
            this.device = data.comName;
            this.initArduinoComPort();
            break;
        case 'connected':
            // do nothing
            break;
        case 'closed':
            this.resetDevice();
            setTimeout(this.findArduinoComPort.bind(this), 1000);
            break;
        case 'error':
            this.resetDevice();
            setTimeout(this.findArduinoComPort.bind(this), 1000);
            break;
        }
    }

    resetDevice() {
        this.device = this.options.device || null;
    }

    findArduinoComPort() {
        console.log('Looking for a serial port with an Arduino connected to it.');
        serialport.list( (err, ports) => {
            if (err) {
                this.update('error');
                return; // Retry after a delay
            }

            let port = ports.find( (port) => {
                if (port.manufacturer && port.manufacturer.match(/Arduino/i) !== null) {
                    console.log('Found an Arduino connected to serial port %s.', port.comName);
                    if (this.device === null || this.device === port.comName) {
                        // Pick first Arduino device or the specified one if its port is found
                        return true;
                    }
                }
            });

            if (port) {
                this.update('discovered', {comName: port.comName});
            } else {
                // port === undefined if no Arduino device is connected to a serial port
                this.update('disconnected');
            }
        });
    }

    initArduinoComPort() {
        this.serialPort = new serialport.SerialPort(this.device, {
            baudrate: this.baudrate,
            parser: serialport.parsers.readline('\n')
        });

        this.serialPort.on('open', () => {
            console.log('Serial communication with device %s is open.', this.device);
            this.update('connected');

            this.serialPort.on('data', (data) => {
                this.sendToClient(data);
            });

            this.serialPort.on('close', () => {
                console.log('Serial communication with device %s has been closed.', this.device);
                this.update('closed');
            });

            this.serialPort.on('error', (error) => {
                console.log('Serial communication with device %s has failed.', this.device);
                console.log(error);
                this.update('error');
            });
        });
    }

    sendToClient(data) {
        let obj;
        try {
            // console.log('Data received from Arduino:', data);
            obj = JSON.parse(data);
        } catch(err) {
            console.log('Invalid data received from Arduino:', data);
        }
        if (obj) {
            // console.log('Data sent to client:', obj);
            this.emit('data', obj);
        }
    }

    sendToArduino(data) {
        let obj;
        try {
            // console.log('Data received from client:', data);
            obj = JSON.stringify(data);
        } catch(err) {
            console.log('Invalid data received from client:', data);
        }
        if (obj) {
            // console.log('Data sent to Arduino:', obj);
            this.serialPort.write(obj);
        }
    }
}

module.exports = Arduino;
