var http = require("http");
var url = require("url");
var path = require("path");

function start(route, handle) {
    function onRequest(request, response) {
        var upathname = path.normalize(url.parse(request.url).pathname);
        var paths = upathname.split('/');
        var pathname = '/'+paths[1];
        paths.shift();
        paths.shift();
        console.log("Request for " + pathname + " received.");
        if (paths.length) {
            console.log('  Arguments found!');
            console.log(paths);
        }
        route(handle, pathname, response, request, paths);
    }
    
    http.createServer(onRequest).listen(8888);
    console.log("Server has started.");
}

exports.start = start;
