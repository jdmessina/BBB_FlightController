var cp = require('child_process');

// fork a process to continually read a pin and send back an event upon state change in real time
function setReadEvent(pin, callback) {
    var child = cp.fork(__dirname + '/child.js');
    
    // initialize the callback function that is executed when the pin state changes
    child.on('message', callback);
    // tell the child process what pin to poll
    child.send(pin);
        
    return child;
}

// terminate the child process that is polling the pin
function clearReadEvent(child) {
    child.kill('SIGHUP');
}

exports.setReadEvent = setReadEvent;
exports.clearReadEvent = clearReadEvent;