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
colors = ['#59c8401','#aab31a','#3070ac', '#886644'],
locs = {},
fields = ['title', 'supervisor', 'name', 'reqn', 'start', 'end', 'hours', 'status', 'location'];

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
            var locales = {},
            sorted = [];
            for (var ix in db) {
                if (db[ix].supervisor && db[ix].supervisor != '' && db[ix].supervisor != null) {
                    for (var jx in db) {
                        if (db[jx].title == db[ix].supervisor) {
                            db[ix].supervisor = jx;
                        }
                    }
                }
                if (db[ix].location && db[ix].location != '') {
                    var loc = db[ix].location;
                    if (!locales[loc])
                        locales[loc] = 0;
                    locales[loc] += 1;
                }
            }
            for (var jx in locales) {
                var sx = sorted.length;
                while (sx != 0 && sorted[sx] > sorted[sx-1])
                    sx -= 1;
                sorted.splice(sx, 0, jx);
            }
            for (var tx in sorted) {
                if (tx < colors.length) {
                    locs[sorted[tx]] = colors[tx];
                } else {
                    locs[sorted[tx]] = colors[colors.length-1];
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

function listcolors(response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.write(jsonify(locs));
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

exports.colors = listcolors;
exports.style = style;
exports.details = details;
exports.list = list;
exports.jquery = jquery;
exports.script = script;
exports.start = start;
exports.upload = upload;
exports.upform = upform;
