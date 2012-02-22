var querystring = require("querystring"),
exec = require("child_process").exec,
fs = require("fs"),
formidable = require("formidable"),
csv = require("csv"),
jsonify = require("JSON").stringify,
loads = require("JSON").parse,
respondWithFile = require("./respondWithFile").respondWithFile;

var db = [],
fpath = "./db.csv";

csv()
    .fromPath(fpath)
    .on('data', function (data, index) {
        db.push(data);
    });

function upform(response) {
    respondWithFile(response, 'templates/upform.html');
}

function upload(response, request) {
    var serror = null, sfields = null, sfiles = null, cpath = null;

    function moveDb(error, fields, files) {
        fs.readFile(files.csv.path, function (error, file) {
            fs.writeFile(fpath, file);
            csv()
                .fromPath(fpath)
                .on('data', function (data, index) {
                    db.push(data);
                });
        });
    }

    var form = new formidable.IncomingForm();

    exec('pwd', function (error, stdout, stderr) {
        cpath = stdout;
        if (serror != null && sfields != null && sfiles != null) {
            moveDb(serror, sfields, sfiles);
        }
    });

    form.parse(request, function(error, fields, files) {
        serror = error;
        sfields = fields;
        sfiles = files;
        if (cpath != null) {
            moveDb(error, fields, files);
        }
    });
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write('Been fun!');
    response.end();
}

function start(response) {
    respondWithFile(response, 'templates/index.html');
}

function script(response) {
    respondWithFile(response, 'clientjs/of.js', 'text/javascript');
}

function jquery(response) {
    respondWithFile(response, 'clientjs/jquery.js', 'text/javascript');
}

exports.jquery = jquery;
exports.script = script;
exports.start = start;
exports.upload = upload;
exports.upform = upform;
