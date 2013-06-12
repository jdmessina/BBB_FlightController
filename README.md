BBB_FlightController
====================

Airplane/Rocket flight controller for the BeagleBone Black using a GY-81-3205 flight controller board

Currently, this is just a test setup.
- uses the Node.js beaglescript library
- rudimentary web server that handles requests
    - asynchronously searches for a file
    - echos input text
    - executes getPlatform()
- interface to beaglescript toggles USR3 LED

ToDo:
- figure out how to display telemetry on the web site
    - current/max altitude
    - current/max g
    - x/y range
    - graph flight path
    - display live video from onboard camera
    - launch/abort sequence
- figure out how to read inputs from the flight controller board
- figure out how to control the servos
