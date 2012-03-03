var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.start;
handle["/start"] = requestHandlers.start;
handle["/upload"] = requestHandlers.upload;
handle["/upform"] = requestHandlers.upform;
handle["/of.js"] = requestHandlers.script;
handle["/jquery.js"] = requestHandlers.jquery;
handle["/list"] = requestHandlers.list;
handle["/details"] = requestHandlers.details;
handle["/of.css"] = requestHandlers.style;
handle["/colors"] = requestHandlers.colors;

server.start(router.route, handle);
