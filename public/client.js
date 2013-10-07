//
// client.js
//

window.onload = function() {
    var socket = io.connect(window.location.href),
        handle = {},
        graphs = {},
        history = {},
        currentState = 'standby',
        currentMode = 'off',
        MAX_USERS = 6;

    // dependency injection - initialize array to loosely couple event callbacks and their actions
    handle.senduser = sendUser;
    handle.connect = sendUser;
    handle.updatechat = updateChat;
    handle.updateusers = updateUsers;
    handle.heartbeat = heartbeat;
    handle.telemetry = updateTelemetry;
    handle.standby = setState;
    handle.armed = setState;
    handle.flight = setState;
    handle.failsafe = setState;
    handle.rocket = setMode;
    handle.airplane = setMode;
    handle.initiateTelemetry = updateGraphs;
    handle.initiateLaunch = updateGraphs;
    handle.resetLaunch = updateGraphs;
    handle.terminateLaunch = updateGraphs;
    handle.terminateTelemetry = updateGraphs;
    handle.version = displayVersion;
    
    //
    // Socket IO Methods
    //
    
    // event handler, called whenever the 'senduser' event is triggered
    function sendUser(username, data) {
        // call the server-side function 'adduser' and send one parameter (value of prompt)
        socket.emit('adduser', prompt("What's your name?"));
    }
    
    // event handler, called whenever the 'updatechat' event is triggered
    function updateChat(action, data) {
        var textarea = document.getElementById("log");
        
        // determine if the action is a telemetry command or chat message
        if (handle[action] === undefined) {
            // echo the chat message to the log
            $('#log').append('<div><b>' + action + ':</b> ' + data + '</div>');
            // set the scrollbar to the bottom
            textarea.scrollTop = textarea.scrollHeight;
        } else {
            handle[action](action, data);
        }
    }
        
    // event handler, called whenever the 'updateusers' event is triggered
    function updateUsers(username, data) {
        var i = 0;
        
        // append the new username to the list of connected users
        //$('#users').empty();
        //$('#users').append('<b>USERS</b>');
        $.each(data, function(key, value) {
			//$('#users').append('<div>' + key + '</div>');
            if (i < MAX_USERS) {
                updateLEDGraph(graphs['user' + i++], key);
            }
		});
        
        while (i < MAX_USERS) {
            updateLEDGraph(graphs['user' + i++], "");
        }
    }
    
    //
    // Event Handler Methods
    //
    
    // update the UI based on the telemetry received from the server
    function updateTelemetry(action, data) {
        // simulated
        updateGauge(graphs.ailerons, data.ailerons, '\u00B0');
        updateGauge(graphs.elevator, data.elevator, '\u00B0');
        updateGauge(graphs.rudder, data.rudder, '\u00B0');
        updateOdometer(graphs.compass, data.compass);
        updateScatterGraph(graphs.range, [data.radial, data.distance, 'red']);
        updateGauge(graphs.altitude, data.altitude, ' ft x100', history.altitude);
        updateGauge(graphs.airspeed, data.airspeed, ' ft/sec', history.velocity);
        updateGauge(graphs.vertspeed, data.vertspeed, ' ft/sec');
        updateGauge(graphs.bank, data.bank, '\u00B0');
        updateGauge(graphs.slip, data.slip, '\u00B0');
        updateGauge(graphs.aoa, data.aoa, '\u00B0');
        //updateGauge(graphs.acceleration, RGraph.random(-20, 100), ' ft/sec\u00B2', history.acceleration);
        graphs.altitudehistory = drawLineGraph("altitudehistory", 'Altitude', 'sec', 'ft', 'bottom', history.altitude);
        graphs.velocityhistory = drawLineGraph("velocityhistory", 'Velocity', 'sec', 'ft/sec', 'bottom', history.velocity);
        graphs.accelerationhistory = drawLineGraph("accelerationhistory", 'Acceleration', 'sec', 'ft/sec\u00B2', 'center', history.acceleration);
        history.acceleration.push(data.acceleration);
        history.time++;
    }
    
    // update the UI for the status light when the heartbeat event is received
    function heartbeat(action, data) {
        var image,
            element = document.getElementById("led");
        
        // determine which image is the correct one, based on the callback data
        switch (data) {
            case 'LED on':
                image = 'images/telemetryOnHigh.png';
                break;
                
            case 'LED off':
                image = 'images/telemetryOnLow.png';
                break;
                
            default:
                image = 'images/telemetryOff.png';
        }
                
        // replace the UI image for the status light
        element.src = image;
    }
    
    // update the graphs for the current state of the system
    function updateGraphs(action, message) {
        var textarea = document.getElementById("log");
        
        console.log(action);
        switch (action) {
            case 'initiateLaunch':
            case 'resetLaunch':
            case 'terminateTelemetry':
                updateGauge(graphs.altitude, 0, ' ft x100', history.altitude, true);
                updateGauge(graphs.airspeed, 0, ' ft/sec', history.velocity, true);
                updateGauge(graphs.vertspeed, 0, ' ft/sec', null, true);
                //updateGauge(graphs.acceleration, 0, ' ft/sec\u00B2', history.velocity, true);
                updateScatterGraph(graphs.range, [[0, 0, 'red']], true);
                history.altitude = [0];
                history.velocity = [0];
                history.acceleration = [0];
                graphs.altitudehistory = drawLineGraph("altitudehistory", 'Altitude', 'sec', 'ft', 'bottom', history.altitude);
                graphs.velocityhistory = drawLineGraph("velocityhistory", 'Velocity', 'sec', 'ft/sec', 'bottom', history.velocity);
                graphs.accelerationhistory = drawLineGraph("accelerationhistory", 'Acceleration', 'sec', 'ft/sec\u00B2', 'center', history.acceleration);
                break;
                
            case 'terminateLaunch':
                updateGauge(graphs.ailerons, 0, '\u00B0');
                updateGauge(graphs.elevator, 0, '\u00B0');
                updateGauge(graphs.rudder, 0, '\u00B0');
                updateOdometer(graphs.compass, 0);
                updateGauge(graphs.altitude, 0, ' ft x100');
                updateGauge(graphs.airspeed, 0, ' ft/sec');
                updateGauge(graphs.vertspeed, 0, ' ft/sec');
                updateGauge(graphs.bank, 0, '\u00B0');
                updateGauge(graphs.slip, 0, '\u00B0');
                updateGauge(graphs.aoa, 0, '\u00B0');
                //updateGauge(graphs.acceleration, 0, ' ft/sec\u00B2');
                break;
        }
        
        // echo the chat message to the log
        if (message !== undefined) {
            $('#log').append('<div>' + message + '</div>');
            // set the scrollbar to the bottom
            textarea.scrollTop = textarea.scrollHeight;
        }
    }
    
    //display an alert with the version info
    function displayVersion(action, message) {
        alert(message);
    }
    
    // set the flight mode
    function setMode(action, message) {
        var textarea = document.getElementById("log"),
            rocketMode = document.getElementById("rocketmode"),
            airplaneMode = document.getElementById("airplanemode"),
            newMode = action,
            rocketModeOn,
            rocketModeOff,
            airplaneModeOn,
            airplaneModeOff;
        
        console.log('setting mode: ' + action);
        rocketModeOff = 'images/rocketModeOff.png';
        airplaneModeOff = 'images/airplaneModeOff.png';
        
        // determine the correct set of button images, based on the current state of the system
        switch (currentState) {
            case 'flight':
                rocketModeOn = 'images/rocketModeOn.png';
                airplaneModeOn = 'images/airplaneModeOn.png';
                break;
                
            case 'standby':
                rocketModeOn = 'images/rocketModeOff.png';
                airplaneModeOn = 'images/airplaneModeOff.png';
                newMode = 'off';
                break;
                
            default:
                rocketModeOn = 'images/rocketModeStandby.png';
                airplaneModeOn = 'images/airplaneModeStandby.png';
        }
        
        // set the proper button to 'on', based on the current flight mode
        switch (newMode) {
            case 'rocket':
                rocketMode.src = rocketModeOn;
                airplaneMode.src = airplaneModeOff;
                break;
                
            case 'airplane':
                rocketMode.src = rocketModeOff;
                airplaneMode.src = airplaneModeOn;
                break;
                
            default:
                rocketMode.src = rocketModeOff;
                airplaneMode.src = airplaneModeOff;
        }
        
        // save the current state of the system
        currentMode = newMode;
        
        // echo the chat message to the log
        if (message !== undefined) {
            $('#log').append('<div>' + message + '</div>');
            // set the scrollbar to the bottom
            textarea.scrollTop = textarea.scrollHeight;
        }
    }
    
    // set the state of the system
    function setState(action, message) {
        var armButton = document.getElementById("arm"),
            launchButton = document.getElementById("launch"),
            failsafeButton = document.getElementById("failsafe"),
            resetButton = document.getElementById("reset"),
            textarea = document.getElementById("log");
        
        console.log("changing to " + message);
        
        // update the UI based on the current state of the system
        switch (action) {
            case 'standby':
                armButton.src = 'images/armStandby.png';
                launchButton.src = 'images/launchOff.png';
                resetButton.src = 'images/resetOff.png';

                break;
                
            case 'armed':
                armButton.src = 'images/armEnabled.png';
                launchButton.src = 'images/launchOn.png';
                resetButton.src = 'images/resetOff.png';
                break;
            
            case 'flight':
                armButton.src = 'images/armOff.png';
                launchButton.src = 'images/launchOff.png';
                failsafeButton.src = 'images/failsafeOn.png';
                break;
                
            case 'failsafe':
                armButton.src = 'images/armReset.png';
                resetButton.src = 'images/resetOn.png';
                failsafeButton.src = 'images/failsafeOff.png';
                break;
        }
        
        // save the current state of the system
        currentState = action;
        setMode(currentMode);
        
        // echo the chat message to the log
        if (message !== undefined) {
            $('#log').append('<div>' + message + '</div>');
            // set the scrollbar to the bottom
            textarea.scrollTop = textarea.scrollHeight;
        }
    }
    
    //
    // RGraph Configuration Methods
    //
    
    // initialize the Telemetry gauges
    function drawGauge(id, min, max, current, small, large, count, colors, title, value, unit) {
        var chart = new RGraph.Gauge(id, min, max, current);
            
        chart.Set('chart.scale.decimals', 0);
        chart.Set('chart.tickmarks.small', small);
        chart.Set('chart.tickmarks.big', large);
        chart.Set('chart.title.top', title);
        chart.Set('chart.title.top.pos', -0.75);
        chart.Set('chart.title.bottom', value + unit);
        chart.Set('chart.title.bottom.color', '#aaa');
        chart.Set('chart.labels.count', count);
        chart.Set('chart.needle.colors',  ['#D5604D', 'red', 'black', 'blue']);
        chart.Set('chart.needle.size', [null, 50]);
        chart.Set('chart.centerpin.radius', 8);
        chart.Set('chart.angles.start', PI);
        chart.Set('chart.angles.end', TWOPI);
        chart.Set('chart.colors.ranges', colors);
        chart.Draw();
        
        return chart;
    }
    
    // update the Telemetry gauges, based on current input
    function updateGauge(chart, current, unit, history, reset) {
        var bottomTitle,
            dirlow = '-- ',
            dirhigh = '-- ';
        
        // determine which gauge is being operated on
        switch (chart.id) {
            case 'ailerons':
            case 'elevator':
            case 'rudder':
            case 'bank':
            case 'slip':
            case 'aoa':
                // set the direction indicator
                switch (chart.id) {
                    case 'ailerons':
                    case 'rudder':
                    case 'bank':
                    case 'slip':
                        dirlow = 'L ';
                        dirhigh = 'R ';
                        break;
                        
                    case 'elevator':
                    case 'aoa':
                        dirlow = 'D ';
                        dirhigh = 'U ';
                }
                
                // update the bottom title with the current data
                if (current !== 0) {
                    if (current < 0) {
                        bottomTitle = dirlow + Math.abs(current) + unit;
                    } else {
                        bottomTitle = dirhigh + current + unit;
                    } 
                } else {
                    bottomTitle = '-- ' + current + unit;
                }
                
                chart.value = current;
                break;
                        
            // case 'acceleration':
            case 'vertspeed':
                // determine if we're reinitializing the gauge
                if (reset === true) {
                    chart.value[2] = 0;
                } else {
                    // update the min needle if the current value is less than the previous min
                    if (chart.value[2] > current) {
                        chart.value[2] = current;
                    }
                }
                // continue on
                
            case 'altitude':
            case 'airspeed':
                // update the bottom title with the current data
                bottomTitle = current + unit;
                
                // move the needle to the current value
                chart.value[0] = current;
                
                // determine if we're reinitializing the gauge
                if (reset === true) {
                    chart.value[1] = 0;
                } else {
                    // update the max needle if the current value is greater than the previous max
                    if (chart.value[1] < current) {
                        chart.value[1] = current;
                    }
                }
                break;
        }
        
        // determine if we're capturing history data for the line graph
        if (history !== undefined) {
            // determine if we're reinitializing the gauge
            if (reset === true) {
                history = [0];
            } else {
                // append the current data to the array
                history.push(current);
            }
        }
        
        // update the gauge
        chart.Set('chart.title.bottom',bottomTitle);
        //RGraph.Effects.Gauge.Grow(chart);
        RGraph.Clear(chart.canvas);
        chart.Draw();
    }
    
    // initialize the User LED graph
    function drawLEDGraph(id, text) {
        var chart = new RGraph.LED(id, text);
            
        chart.Set('chart.light', 'blue');
        chart.Draw();
        
        return chart;
    }
    
    // update the User LED graphs, based on current input
    function updateLEDGraph(chart, text) {
        var MAX_TEXT_LENGTH = 15;
        
        //if (chart.text != text) {
            // pad the text with blanks
            while (text.length < MAX_TEXT_LENGTH) {
                text = text + ' ';
            }
            
            // update the graph
            chart.text = text.toLowerCase();
            RGraph.Clear(chart.canvas);
            chart.Draw();
        //}
    }
    
    // initialize the Telemetry Radial Scatter graph
    function drawScatterGraph(id, data) {
        var chart = new RGraph.RScatter(id, data);
        
        chart.Set('chart.labels.axes', 'n');
        chart.Set('chart.labels.position', 'edge');
        chart.Set('chart.labels', ['NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', '']);
        chart.Set('chart.text.size', 8);
        chart.Set('chart.tickmarks', 'diamond');
        chart.Set('chart.gutter.left', 50);
        chart.Set('chart.gutter.top', 0);
        chart.Set('chart.gutter.bottom', 0);
        //chart.Set('chart.title.color', 'black');
        //chart.Set('chart.title', 'Position');
        //chart.Set('chart.title.vpos', 0.3);
        chart.Draw();
        
        return chart;
    }
    
    // update the Telemetry Radial Scatter graphs, based on current input
    function updateScatterGraph(chart, current, reset) {
        // determine if we're reinitializing the graph
        if (reset === true) {
            chart.data[0] = current;
        } else {
            // append the current data to the array
            chart.data[0].push(current);
        }
        
        // update the graph
        RGraph.Clear(chart.canvas);
        chart.Draw();
    }
    
    // initialize the Telemetry Odometer graph
    function drawOdometer(id, min, max, current) {
        var chart = new RGraph.Odometer(id, min, max, current);
        
        chart.Set('chart.needle.color', 'blue');
        chart.Set('chart.needle.tail', false);
        //chart.Set('chart.needle.type', 'triangle')
        chart.Set('chart.labels', ['N','NE','E','SE','S','SW','W','NW']);
        chart.Set('chart.value.text', true);
        chart.Set('chart.value.units.post', '°');
        chart.Set('chart.green.color', 'Gradient(white:#ccc)');
        chart.Set('chart.yellow.color', 'Gradient(white:#ccc)');
        chart.Set('chart.red.color', 'Gradient(white:#ccc)');
        chart.Set('chart.gutter.left', 50);
        chart.Set('chart.gutter.top', 0);
        chart.Set('chart.gutter.bottom', 0);
        chart.Draw();
        
        return chart;
    }
    
    // update the Telemetry Odometer graphs, based on current input
    function updateOdometer(chart, current) {
        chart.value = current;
        //RGraph.Effects.Odo.Grow(chart);
        RGraph.Clear(chart.canvas);
        chart.Draw();
    }
      
    // initialize the Telemetry Line graph
    function drawLineGraph(id, title, xtitle, ytitle, xaxispos, data) {
        var chart = new RGraph.Line(id, data);
            
        chart.Set('chart.title', title);
        chart.Set('chart.xaxispos', xaxispos);
        //chart.Set('chart.title.xaxis', xtitle);
        //chart.Set('chart.title.xaxis.pos', 1);
        //chart.Set('chart.title.yaxis', ytitle);
        chart.Set('chart.gutter.left', 50);
        //chart.Set('chart.gutter.bottom', 30);
        RGraph.Clear(chart.canvas);
        chart.Draw();
        
        return chart;
    }
    
    // update the Telemetry Line graphs, based on current input
    //function updateLineGraph(chart, current) {
    //    console.log(chart.id);
    //    chart.data_arr.push(current);
    //    RGraph.Clear(chart.canvas);
    //    chart.Draw();
    //}
    
    //
    // Misc. Methods
    //
    
     // parses the URL for the image path name
    function parseUrl(url) {
        var a = document.createElement('a');
        
        a.href = url;
        
        return a;
    }
    
    //
    // functional processing on load of page
    //
    
	// listener, on connection to server, ask for user's name with an anonymous callback
	socket.on('connect', function(){
		handle.connect();
	});

    // listener, whenever the server emits 'senduser', prompt the user to enter their name
    socket.on('senduser', function() {
        handle.senduser();
    });
    
	// listener, whenever the server emits 'updatechat', this updates the chat body
	socket.on('updatechat', function (username, data) {
		handle.updatechat(username, data);
	});

	// listener, whenever the server emits 'updateusers', this updates the username list
	socket.on('updateusers', function(data) {
		handle.updateusers(null, data);
	});

	// set the focus for input
    $('#data').focus();
        
	// when the client clicks SEND
	$('#datasend').click(function() {
		var message = $('#data').val();
            
		$('#data').val('');
            
		// tell server to execute 'sendchat' and send along one parameter
		socket.emit('sendchat', message);
	});

	// when the client hits ENTER on their keyboard
	$('#data').keypress(function(e) {
		if(e.which == 13) {
			$(this).blur();
			$('#datasend').focus().click();
            $('#data').focus();
		}
	});
    
    // when the client clicks the Arm button
    $('#arm').click(function() {
		var message = 'armed';

        if (currentState != 'standby') {
            message = 'standby';
        }
        
		// tell server to execute 'sendchat' and send along one parameter to execute the appropriate callback function
		socket.emit('sendchat', message);
	});
    
    // when the client clicks the Launch button
    $('#launch').click(function() {
    	var message = 'flight';
        
		// tell server to execute 'sendchat' and send along one parameter to execute the appropriate callback function
		socket.emit('sendchat', message);
	});
    
    // when the client clicks the Failsafe button
    $('#failsafe').click(function() {
    	var message = 'failsafe';
        
		// tell server to execute 'sendchat' and send along one parameter to execute the appropriate callback function
		socket.emit('sendchat', message);
	});
    
    // when the client clicks the Reset button
    $('#reset').click(function() {
    	var message = 'armed';
        
		// tell server to execute 'sendchat' and send along one parameter to execute the appropriate callback function
		socket.emit('sendchat', message);
	});
    
    // when the client clicks the Info button
    $('#info').click(function() {
        // tell server to execute 'sendchat' and send along one parameter to execute the appropriate callback function
        socket.emit('sendchat', 'version');
    });
    
    // create RGraphs
    graphs.ailerons = drawGauge("ailerons", -90, 90, 0, 36, 12, 6,
        [[-90, -60, 'red'], [-60, -30, 'yellow'], [-30, 30, 'green'], [30, 60, 'yellow'], [60, 90, 'red']], "Ailerons", '-- 0', '\u00B0');
    graphs.elevator = drawGauge("elevator", -90, 90, 0, 36, 12, 6,
        [[-90, -60, 'red'], [-60, -30, 'yellow'], [-30, 30, 'green'], [30, 60, 'yellow'], [60, 90, 'red']], "Elevator", '-- 0', '\u00B0');
    graphs.rudder = drawGauge("rudder", -90, 90, 0, 36, 12, 6,
        [[-90, -60, 'red'], [-60, -30, 'yellow'], [-30, 30, 'green'], [30, 60, 'yellow'], [60, 90, 'red']], "Rudder", '-- 0', '\u00B0');
    graphs.range = drawScatterGraph("range", [[0, 0, 'red']]);
    graphs.compass = drawOdometer("compass", 0, 360, 0);
    graphs.altitude = drawGauge("altitude", 0, 30, [0, 0], 40, 6, 4,
        [[0, 15, 'green'], [15, 20, 'yellow'], [20, 30, 'red']], "Altitude", '0', ' ft x100');
    graphs.airspeed = drawGauge("airspeed", 0, 100, [0, 0], 30, 10, 4,
        [[0, 60, 'green'], [60, 80, 'yellow'], [80, 100, 'red']], "Airspeed", '0', ' ft/sec');
    graphs.vertspeed = drawGauge("vertspeed", -1000, 1000, [0, 0, 0], 40, 8, 4,
        [[-1000, -750, 'red'], [-750, -500, 'yellow'], [-500, 500, 'green'], [500, 750, 'yellow'], [750, 1000, 'red']], "V-Speed", '0', ' ft/sec');
    graphs.bank = drawGauge("bank", -90, 90, 0, 36, 12, 6,
        [[-90, -45, 'red'], [-45, -30, 'yellow'], [-30, 30, 'green'], [30, 45, 'yellow'], [45, 90, 'red']], "Bank", '-- 0', '\u00B0');
    graphs.slip = drawGauge("slip", -90, 90, 0, 36, 12, 6,
        [[-90, -45, 'red'], [-45, -30, 'yellow'], [-30, 30, 'green'], [30, 45, 'yellow'], [45, 90, 'red']], "Slip", '-- 0', '\u00B0');
    graphs.aoa = drawGauge("aoa", -30, 30, 0, 36, 12, 6,
        [[-30, -20, 'red'], [-20, -15, 'yellow'], [-15, 15, 'green'], [15, 20, 'yellow'], [20, 30, 'red']], "AOA", '-- 0', '\u00B0');
    //graphs.acceleration = drawGauge("acceleration", -20, 100, [0, 0, 0], 24, 6, 6,
    //    [[-20, -15, 'red'], [-15, -10, 'yellow'], [-10, 20, 'green'], [20, 60, 'yellow'], [60, 100, 'red']], "Accel.", '0', ' ft/sec\u00B2');
    graphs.altitudehistory = drawLineGraph("altitudehistory", 'Altitude', 'sec', 'ft', 'bottom', [0]);
    graphs.velocityhistory = drawLineGraph("velocityhistory", 'Velocity', 'sec', 'ft/sec', 'bottom', [0]);
    graphs.accelerationhistory = drawLineGraph("accelerationhistory", 'Acceleration', 'sec', 'ft/sec\u00B2', 'center', [0]);
    history.altitude = [0];
    history.velocity = [0];
    history.acceleration = [0];
    history.time = 0;
    
    for (var i=0; i<MAX_USERS; i++) {
        graphs['user' + i] = drawLEDGraph("user" + i, "");
    }
    
};
