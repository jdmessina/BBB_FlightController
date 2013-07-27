//
// handlers.js
//

var gpio = require("./gpio"),
    gpioUser = {},
    handle = {},
    usernames = {}; // usernames which are currently connected to the chat

//dependency injection - initialize array to loosely couple event callbacks and their actions
handle.connection = connection;
handle.sendchat = sendChat;
handle.adduser = addUser;
handle.disconnect = disconnect;
handle.version = version;
handle.launch = launch;
handle.shutdown = shutdown;
handle.error = error;

// initialize the initial listener for connections by the client
function initialize(io) {
    io.sockets.on('connection', function (socket) {
        routeHandle(io, socket, 'connection');
    });
}

// routine to route actions from event callbacks
function routeHandle(io, socket, command, data) {
    // if we know what the command is, route it.  Otherwise throw an error
    if (typeof handle[command] === 'function') {
        console.log("route command: " + command);
        handle[command](io, socket, data);
    } else {
        handle.error(io, socket, command);
    }
}

// routine to setup listeners for events when a client connects to the server
function connection(io, socket, data) {
    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
        routeHandle(io, socket, 'sendchat', data);
    });

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function(username){
        routeHandle(io, socket, 'adduser', username);
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function(){
        routeHandle(io, socket, 'disconnect');
    });
}

// event handler, called when the 'sendchat' event is triggered
function sendChat (io, socket, data) {
    // we tell the client to execute 'updatechat' with 2 parameters
    io.sockets.emit('updatechat', socket.username, data);
    console.log("updatechat: " + data);
    
    // route the action to the correct callback function
    routeHandle(io, socket, data);
}

// event handler, called when the 'adduser' event is triggered
function addUser(io, socket, username) {
    // ensure that the username has been set
    if (username !== "" && username !== null) {
        // we store the username in the socket session for this client
        socket.username = username;
	    // add the client's username to the global list
	    usernames[username] = username;
	    // echo to client they've connected
	    socket.emit('updatechat', 'SERVER', 'you have connected');
	    // echo globally (all clients) that a person has connected
	    socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
	    // update the list of users in chat, client-side
	    io.sockets.emit('updateusers', usernames);
	    console.log("updateusers: " + username + ' has connected');
    } else {
        // emit the event to request the user enter their name to connect
        socket.emit('updatechat', 'SERVER', 'Enter your name to connect');
        socket.emit('senduser');
    }
}

// event handler, called when the 'disconnect' event is triggered
function disconnect(io, socket, data) {
    // remove the username from global usernames list
    delete usernames[socket.username];
    // update list of users in chat, client-side
    io.sockets.emit('updateusers', usernames);
    // echo globally that this client has left
    socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    console.log("updatechat: " + socket.username + " has disconnected");
}

// event handler, called when the 'error' command is sent
function error(io, socket, command) {
    console.log("ERROR: Command " + command + "not found");
    //io.sockets.emit('updatechat', 'SERVER', "<b>ERROR:</b> Command <b>" + command + "</b> not found");
}

// event handler, called when the 'version' command is sent
function version(io, socket, data) {
    gpio.getInfo(gpioUser);
    io.sockets.emit('updatechat', 'SERVER', gpioUser.message);
}

// event handler, called when the 'launch' command is sent
function launch(io, socket, data) {
    // make sure we haven't already started the service
    if (gpioUser.name === undefined) {
        // setup the communication function to be used when events are triggered by the GPIO
        gpioUser.chat = function(command) {
            io.sockets.emit('updatechat', command, gpioUser.message);
        };
        // start the Flight Controller service
        gpio.startClient(gpioUser, function(gpioUser) {
            // callback function to be executed when the GPIO has completed its processing
            
            // store the GPIO username
            usernames[gpioUser.name] = gpioUser.name;
            // echo globally (all clients) that a person has connected
            io.sockets.emit('updatechat', 'SERVER', gpioUser.name + ' has connected');
            // update the list of users in chat, client-side
            io.sockets.emit('updateusers', usernames);
            // tell the client that the launch has been initiated
            io.sockets.emit('updatechat', 'initiateLaunch', '<b>' + gpioUser.name + ':</b> Launch initiated');
        });
    } else {
        // log the fact that the Flight Controller service has already been started
        io.sockets.emit('updatechat', 'SERVER', gpioUser.name + ' is already connected');
    }
}

// event handler, called when the 'launch' command is sent
function shutdown(io, socket, data) {
    // make sure we haven't already haven't terminated the service
    if (gpioUser.name !== undefined) {
        // message to send once the service has been terminated
        gpioUser.message = 'dead';
        // terminate the Flight Controller service
        gpio.stopClient(gpioUser, function(gpioUser) {
            // callback function to be executed when the GPIO has completed its processing
            
            // tell the client that the launch has been initiated
            io.sockets.emit('updatechat', 'terminateLaunch', '<b>' + gpioUser.name + ':</b> Flight terminated');
            // remove the username from global usernames list
            delete usernames[gpioUser.name];
            // update list of users in chat, client-side
            io.sockets.emit('updateusers', usernames);
            // echo globally that this client has left
            io.sockets.emit('updatechat', 'SERVER', gpioUser.name + ' has disconnected');
            console.log("updatechat: " + gpioUser.name + " has disconnected");
            // uninitialize the GPIO user information
            gpioUser.message = undefined;
            gpioUser.chat = undefined;
        });
    } else {
        // log the fact that the Flight Controller service has already been terminated
        io.sockets.emit('updatechat', 'SERVER', 'GPIO client is already shutdown.  Initiate <b>launch</b> to connect the GPIO client');
    }
}

// export the public functions
exports.initialize = initialize;