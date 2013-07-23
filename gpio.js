//
// gpio.js
//

var // bonescript = require('bonescript'),
    bonescript = require('./bonescript-stub'),
    events = require('events'),
    util = require('util'),
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
    console.log(util.inspect(userLED.eventEmitter.listeners(userLED.eventHandle)));
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
    // begin toggling the USR3 LED
    blinkled(getPin("LED"), 1000, 'LEDStateChange', 'heartbeat', gpioUser);
    
    // setup the telemetry callback
    gpioUser.telemetryCmd = 'telemetry';
    gpioUser.sendTelemetry = function() {
        // send the message to the user
        gpioUser.message = 'telemetry goes here';
        gpioUser.chat(gpioUser.telemetryCmd);
    };
    
    // begin sending telemetry
    gpioUser.timer = setInterval(gpioUser.sendTelemetry, 100);
}

// stop sending telemetry to the clients
function stopTelemetry(gpioUser) {
    // stop toggling the USR3 LED
    resetled(getPin("LED"), gpioUser);
    
    // stop sending telemetry
    clearInterval(gpioUser.timer);
}

// starts the Flight Controller service
function startClient(gpioUser, callback) {
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
        //send telemetry
        startTelemetry(gpioUser);
        
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
        // stop sending telemetry
        stopTelemetry(gpioUser);
        
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
exports.stopClient = stopClient;
exports.setInterrupt= setInterrupt;
exports.getInfo = getInfo;
exports.getGPIO = getGPIO;
exports.getPin = getPin;