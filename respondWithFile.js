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