/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var fs = require("fs");

function respondWithFile(response, fname, mtype) {
    mtype = mtype || 'text/html';
    fs.readFile(fname, function (error, file){
        if(error) {
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write(error + "\n");
            response.end();
        } else {
            response.writeHead(200, {"Content-Type": mtype});
            response.write(file);
            response.end();
        }
    });
}

exports.respondWithFile = respondWithFile;