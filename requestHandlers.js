var querystring = require("querystring"),
exec = require("child_process").exec,
fs = require("fs"),
formidable = require("formidable"),
csv = require("csv"),
jsonify = require("JSON").stringify,
loads = require("JSON").parse,
url = require("url"),
respondWithFile = require("./respondWithFile").respondWithFile;

var db = {},
fpath = "./db.csv",
fields = ['title', 'supervisor', 'name', 'reqn', 'start', 'end', 'hours', 'status'];

function loadToDb(fpath) {
    csv()
        .fromPath(fpath)
        .on('data', function (data, index) {
            var nobj = {};
            for (var ix in data) {
                if (fields[ix]) {
                    nobj[fields[ix]] = data[ix];
                }
            }
            db[index] = nobj;
            db[index].index = index;
        })
        .on('end', function (count) {
            for (var ix in db) {
                if (db[ix].supervisor && db[ix].supervisor != '' && db[ix].supervisor != null) {
                    for (var jx in db) {
                        if (db[jx].title == db[ix].supervisor) {
                            db[ix].supervisor = jx;
                        }
                    }
                }
            }
        });
}

loadToDb(fpath);

function upform(response) {
    respondWithFile(response, 'templates/upform.html');
}

function upload(response, request) {
    var serror = null, sfields = null, sfiles = null, cpath = null;

    function moveDb(error, fields, files) {
        fs.readFile(files.csv.path, function (error, file) {
            fs.writeFile(fpath, file, function (error) {
                loadToDb(fpath);
            });
        });
    }

    var form = new formidable.IncomingForm();

    form.parse(request, function(error, fields, files) {
        moveDb(error, fields, files);
    });
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write('Been fun!');
    response.end();
}

function list(response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    var thedata = {};
    thedata.none = [];
    for (var ix in db) {
        if (db[ix].supervisor == '') {
            thedata.none.push(ix);
        } else {
            if (!thedata[db[ix].supervisor]) {
                thedata[db[ix].supervisor] = [];
            }
            thedata[db[ix].supervisor].push(ix);
        }
    }
    response.write(jsonify(thedata));
    response.end();
}

function details(response, request, args) {
    var thenum = args[0];
    if (db[thenum]) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify(db[thenum]));
        response.end();
    } else {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.write('There is no record with index ' + thenum + '.');
        response.end();
    }
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

function style(response) {
    respondWithFile(response, 'style/of.css', 'text/css');
}

exports.style = style;
exports.details = details;
exports.list = list;
exports.jquery = jquery;
exports.script = script;
exports.start = start;
exports.upload = upload;
exports.upform = upform;
