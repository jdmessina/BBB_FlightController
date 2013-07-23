var	LOW = 0,
	HIGH = 1,
	INPUT = "in",
	OUTPUT = "out";

function digitalWrite(pin, value, callback) {
	if (callback) {
		callback();
	}

	return(true);
}

function attachInterrupt(pin, handler, mode, callback){
	if (callback) {
		callback({'pin':pin, 'attached':true});
	}

	return(true);
}

function detachInterrupt(pin, callback) {
	if (callback) {
		callback({'pin':pin, 'detached':true});
	}

	return(true);
}

function pinMode(pin, direction, mux, pullup, slew, callback) {
	if (callback) {
		callback({value:true});
	}

	return(true);
}

function getPlatform(callback) {
	var platform = {'name': "BeagleBone Black", 'bonescript': "0.2", 'version': "0A5A", 'serialNumber': "1813BBBK1524"};

	if (callback) {
		callback(platform);
	}

	return(platform);
}

exports.LOW = LOW;
exports.HIGH = HIGH;
exports.INPUT = INPUT;
exports.OUTPUT = OUTPUT;
exports.digitalWrite = digitalWrite;
exports.attachInterrupt = attachInterrupt;
exports.detachInterrupt = detachInterrupt;
exports.pinMode = pinMode;
exports.getPlatform = getPlatform;

