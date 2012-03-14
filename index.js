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
handle["/jquery.form.js"] = requestHandlers.jqueryform;
handle["/list"] = requestHandlers.list;
handle["/details"] = requestHandlers.details;
handle["/modify"] = requestHandlers.modify;
handle["/of.css"] = requestHandlers.style;
handle["/of-print.css"] = requestHandlers.pstyle;

server.start(router.route, handle);
