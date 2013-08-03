var bonescript = require('bonescript');
    // bonescript = require('./bonescript-stub');

// respond to the parent when there is a state change in the pin
function readPin(pin) {
    var mode,
        flightMode;
    
    console.log('CHILD got message:', pin);
    
    //continually poll the pin
    while (pin) {
        // initialize the pin mode
        if (flightMode === undefined) {
            bonescript.pinMode(pin, bonescript.INPUT);
        }
        
        // read the pin
        if (bonescript.digitalRead(pin)) {
            mode = bonescript.HIGH;
        } else {
            mode = bonescript.LOW;
        }
        
        // tell the parent that the state of the pin has changed
        if (mode != flightMode) {
            flightMode = mode;
            process.send(mode);
        }
    }
}

// initialize the child process
(function main() {
    console.log("child process started");
    process.on('message', readPin);
})();