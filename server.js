#!/usr/bin/env node

//
// server.js
//

// main function for the server
(function main() {
    var express = require('express'),
        jade = require('jade'),
        stylus = require('stylus'),
        nib = require('nib'),
        handlers = require('./handlers'),
        port = 8888,
        app = express(),
        server = app.listen(port),
        io = require('socket.io').listen(server);
 
    // include nib
    function compile(str, path) {
        return stylus(str)
            .set('filename', path)
            .use(nib());
    }
    
    // tell Express that we want to use Jade, and where we will keep our views
    app.set('views', __dirname + '/views');
    app.set('view engine', "jade");
    
    // middleware to put the Express logger in 'dev' mode
    app.use(express.logger('dev'));
    
    // the Stylus middleware, which will compile our .styl files to CSS
    app.use(stylus.middleware(
        {
            src: __dirname + '/public', 
            compile: compile
        }
    ));
    
    
    // the Express static middleware, which is used for serving static files from /public
    app.use(express.static(__dirname + '/public'));
    
    // routing (jade)
    app.get("/", function(req, res){
        res.render("page");
    });
    
    // routing (non-jade)
    //app.get('/', function (req, res) {
    //    res.sendfile(__dirname + '/index.html');
    //});
    
    console.log("Listening on port " + port);
    
    // event handlers
    handlers.initialize(io);
})();