//
// gpio.js
//

var bonescript = require('bonescript'),
    // bonescript = require('./bonescript-stub'),
    events = require('events'),
    userPins = {},
    userGPIO = {};

// define the GPIO pins
userPins.LED = "USR3";
userPins.SCL = "P9_24";
userPins.SDA = "P9_26";
userPins.M_CRDY = "P9_12";
userPins.A_INT1 = "P9_14";
userPins.G_INT = "P9_16";
userPins.P_XCLR = "P9_18";
userPins.P_ECC = "P9_22";
userPins.F_MODE = "P9_42";

// return the internal pin identifier when given the external identifier.
function getPin(pin) {
    return userPins[pin];
}

// return the GPIO object for the requested pin
function getGPIO(pin) {
    return userGPIO[pin];
}

// create the GPIO object for the requested pin
function setGPIO(inputPin, event, command, stateChangeCallback) {
    if (userGPIO[inputPin] === undefined) {
        userGPIO[inputPin] = {
            pin: inputPin,
            state: bonescript.LOW,
            stateChange: stateChangeCallback,
            eventHandle: event,
            telemetryCmd: command,
            toggle: function() {
                // callback function that is executed when the toggle method is called
                    
                // switch the state of the pin
                if (userGPIO[inputPin].state == bonescript.LOW) {
                    userGPIO[inputPin].state = bonescript.HIGH;
                } else {
                    userGPIO[inputPin].state = bonescript.LOW;
                }

                // write the new state of the pin to the GPIO
                bonescript.digitalWrite(userGPIO[inputPin].pin, userGPIO[inputPin].state);
                // emit the event for the state change
		        userGPIO[inputPin].eventEmitter.emit(userGPIO[inputPin].eventHandle, userGPIO[inputPin].state);
            },
            eventEmitter: new events.EventEmitter()
        };
    }
    
    return userGPIO[inputPin];
}

// set an interrupt for the GPIO pin
function setInterrupt(inputPin) {
    var intPin = {
        value: inputPin,
        callback: function(x) {
            console.log(JSON.stringify(x));
        },
        detach: function() {
            bonescript.detachInterrupt(inputPin);
        }
    };
    
    // set the GPIO pin mode for this pin to INPUT
    bonescript.pinMode(intPin.value, bonescript.INPUT);
    // attach the interrupt to the GPIO pin
    bonescript.attachInterrupt(intPin.value, true, 'both', intPin.callback);
    // set a timout for the interrupt
    setTimeout(intPin.detach, 12000);
}

// get information about the GPIO board
function getInfo(gpioUser) {
    var printData = function(x) {
        gpioUser.message = 'version info:<br>' +
            'name = ' + x.name + '<br>' +
            'version = ' + x.version + '<br>' +
            'serialNumber = ' + x.serialNumber + '<br>' +
            'bonescript = ' + x.bonescript;
    };
    
    // call the printData function to place the data in the GPIO User's message
    if (gpioUser.name === undefined) {
        // allows this function to work before the GPIO user has been conncected to the communication service
        bonescript.getPlatform(printData);
    } else {
        // used after the GPIO user has been connected to the communication service
        printData(gpioUser);
    }
}

// toggle the selected pin
function blinkled(led, timeout, event, command, gpioUser) {
    var userLED = getGPIO(led);
    
    // setup the object for the pin, if it hasn't been initialized
    if (userLED === undefined) {
        userLED = setGPIO(led, event, command, function(state) {
            // callback function that is executed when the state is changed for the pin
            
            // create the message to the user for the current state of the pin
            if (state == bonescript.LOW) {
                gpioUser.message = "LED off";
            } else {
                gpioUser.message = "LED on";
            }
                
            console.log(gpioUser.message);
            // send the message to the user
            gpioUser.chat(userLED.telemetryCmd);
        });
        
        // create the event listener for the pin
        userLED.eventEmitter.addListener(userLED.eventHandle, userLED.stateChange);
        // set the GPIO pin mode for this pin to OUTPUT
	    bonescript.pinMode(userLED.pin, bonescript.OUTPUT);
        // write the state of the pin to the GPIO
        bonescript.digitalWrite(userLED.pin, userLED.state);
    }
    
    // set a recurring interval to toggle the state of the pin
    userLED.timer = setInterval(userLED.toggle, timeout);
}

// return the GPIO pin to its original state
function resetled(led, gpioUser) {
    var userLED = getGPIO(led),
        message = gpioUser.message;
    
    // reset the state to LOW, if necessary
    if (userLED.state == bonescript.HIGH) {
        // set the state
        userLED.state = bonescript.LOW;
        // write the state of the pin to the GPIO
        bonescript.digitalWrite(userLED.pin, userLED.state);
        // emit the event for the state change
        userLED.eventEmitter.emit(userLED.eventHandle, userLED.state);
        console.log("LED off");
    }
    
    // recover the saved message to the user
    gpioUser.message = message;
    // send the message to the user
    gpioUser.chat(userLED.telemetryCmd);
    // terminate the recurring interval to toggle the state of the pin
    clearInterval(userLED.timer);
}

// initialize the telemetry callbacks to the clients
function startTelemetry(gpioUser) {
    // setup the telemetry callback
    gpioUser.telemetryCmd = 'telemetry';
    gpioUser.sendTelemetry = function() {
        // send the message to the user
        gpioUser.message = {
            ailerons: Math.floor((Math.random()*180)-90),
            elevator: Math.floor((Math.random()*180)-90),
            rudder: Math.floor((Math.random()*180)-90),
            compass: Math.floor((Math.random()*360)),
            radial: Math.floor((Math.random()*360)),
            distance: Math.floor((Math.random()*100)),
            altitude: Math.floor((Math.random()*30)),
            airspeed: Math.floor((Math.random()*100)),
            vertspeed: Math.floor((Math.random()*2000)-1000),
            bank: Math.floor((Math.random()*180)-90),
            slip: Math.floor((Math.random()*180)-90),
            aoa: Math.floor((Math.random()*60)-30),
            acceleration: Math.floor((Math.random()*120)-20)
        };
        gpioUser.chat(gpioUser.telemetryCmd);
    };
    
    gpioUser.timer = setInterval(gpioUser.sendTelemetry, 100);
}

// stop sending telemetry to the clients
function stopTelemetry(gpioUser) {
    // stop sending telemetry
    clearInterval(gpioUser.timer);
}

// starts the Flight Controller service
function startClient(gpioUser, callback) {
    // callback to set the flight mode when the flight mode pin changes state
    function modeStatus(x) {
        var mode;
        
        switch (x.value) {
            // set the flight mode to mode 0
            case 0:
            case '0\n':
                mode = bonescript.LOW;
                break;
            
            // set the flight mode to mode 1
            case 1:
            case '1\n':
                mode = bonescript.HIGH;
                break;
        }
        
        // if this is a valid flight mode, set the correct mode and inform the client of the mode change
        if (mode !== undefined) {
            console.log(userPins.F_MODE + ': ' + mode);
            gpioUser.message = '<b>' + gpioUser.name + '</b> changing to mode ' + gpioUser.mode[mode];
            console.log('mode is ' + gpioUser.mode[mode]);
            gpioUser.chat(gpioUser.mode[mode]);
        }
    }
    
    // make sure we haven't already started the service
    if (gpioUser.name === undefined) {
        // initialize the GPIO user information
        bonescript.getPlatform(function(x) {
            gpioUser.name = x.name;
            gpioUser.version = x.version;
            gpioUser.serialNumber = x.serialNumber;
            gpioUser.bonescript = x.bonescript;
        });
        
        console.log("starting BeagleBone");
        
        // begin toggling the USR3 LED
        blinkled(getPin("LED"), 1000, 'LEDStateChange', 'heartbeat', gpioUser);

        // start polling for chages to the F_MODE pin
        console.log("starting telemetry");
        // set the pin mode to read
        bonescript.pinMode(userPins.F_MODE, bonescript.INPUT);
        // set an interrupt to read changes to the pin value
        if (bonescript.attachInterrupt(userPins.F_MODE, true, 'both', modeStatus)) {
            // read the current state of the flight mode pin once the interrupt is successfully initialized
            bonescript.digitalRead(userPins.F_MODE, modeStatus);
        }
        
        // execute the user defined callback function, if registered
        if (callback !== undefined) {
            callback(gpioUser);
        }
    }
}

// terminates the Flight Controller service
function stopClient(gpioUser, callback) {
    // make sure we haven't already haven't terminated the service
    if (gpioUser.name !== undefined) {
        console.log("stopping BeagleBone");
        
        // stop toggling the USR3 LED
        resetled(getPin("LED"), gpioUser);
        
        // stop telemetry child process
        console.log("stopping telemetry");
        // clear the interrupt for the flight mode pin
        bonescript.detachInterrupt(userPins.F_MODE);
        
        // execute the user defined callback function, if registered
        if (callback !== undefined) {
            callback(gpioUser);
        }
        
        // uninitialize the GPIO user information
        gpioUser.name = undefined;
        gpioUser.version = undefined;
        gpioUser.serialNumber = undefined;
        gpioUser.bonescript = undefined;
    }
}

// export the public functions
exports.startClient = startClient;
exports.startTelemetry = startTelemetry;
exports.stopTelemetry = stopTelemetry;
exports.stopClient = stopClient;
exports.setInterrupt= setInterrupt;
exports.getInfo = getInfo;
exports.getGPIO = getGPIO;
exports.getPin = getPin;
