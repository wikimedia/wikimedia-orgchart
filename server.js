/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

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
        route(handle, pathname, response, request, paths);
    }
    
    http.createServer(onRequest).listen(8888);
    console.log("Server has started.");
}

exports.start = start;
