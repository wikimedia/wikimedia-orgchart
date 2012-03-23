var querystring = require("querystring"),
exec = require("child_process").exec,
fs = require("fs"),
formidable = require("formidable"),
jsonify = require("JSON").stringify,
loads = require("JSON").parse,
url = require("url"),
sessions = require("sessions"),
SessionHandler = new sessions(null, {expires: 3000}),

respondWithFile = require("./respondWithFile").respondWithFile,
csvdb = require("./db/csv"),
mongodb = require("./db/mongo");

// var db = csvdb; // CSV database (not very good)
var db = mongodb; // mongodb database (better)

var orgName = "Wikimedia Foundation";

function checkAuth(response, request, cb) {
    SessionHandler.httpRequest(request, response, function (err, sess) {
        var uname = sess.get('username');
        cb(uname && uname != '');
    });
}

function isLogged(response, request) {
    checkAuth(response, request, function (result) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        if (result) {
            response.write(jsonify({success: true, isLogged: true}));
        } else {
            response.write(jsonify({success: true, isLogged: false}));
        }
        response.end();
    });
}

function login(response, request) {
    form = new formidable.IncomingForm();
    form.parse(request, function (error, fields, files) {
        if (fields && fields.username && fields.password) {
            db.checkLogin(fields, function (result) {
                if (result.success) {
                    SessionHandler.httpRequest(request, response, function (err, sess) {
                        sess.set('username', fields.username);
                    });
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.write(jsonify({success: true}));
                    response.end();
                } else {
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.write(jsonify({success: false,
                                            error: 'Either the username or the password was incorrect.'}));
                    response.end();
                }
            });
        } else {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.write(jsonify({success: false,
                                    error: 'Missing either username or password.'}));
            response.end();
        }
    });
}

function logout(response, request) {
    checkAuth(response, request, function (result) {
        if (result) {
            SessionHandler.httpRequest(request, response, function (err, sess) {
                sess.remove('username');
            });
        }
    });
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.write(jsonify({success: true}));
    response.end();
}

function upform(response) {
    respondWithFile(response, 'templates/upform.html');
}

function upload(response, request) {
    var serror = null, sfields = null, sfiles = null, cpath = null;

    if (db && db.uploadToDb && typeof db.uploadToDb == 'function') {
        db.uploadToDb(response, request);
    } else {
        response.writeHead(500, {'Content-Type': 'text/plain'});
        response.write('This instance does not yet have a fully implemented database.');
        response.end();
    }
}

function list(response) {
    db.listHierarchy(function (list, locs, units) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify({list: list, colors: locs, units: units, org: orgName}));
        response.end();
    });
}

function details(response, request, args) {
    var thenum = args[0];
    db.getUnit(thenum, function (dbunit) {
        if (dbunit && dbunit != null) {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.write(jsonify(dbunit));
            response.end();
        } else {
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.write('There is no record with index ' + thenum + '.');
            response.end();
        }
    });
}

function remove(response, request, args) {
    var thenum = args[0],
    form = new formidable.IncomingForm();

    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            db.findAndRemove(thenum, function () {
                response.writeHead(200, {'Content-Type': 'application/json'});
                response.write(jsonify({success: true}));
                response.end();
            });
        }
    });
}

function modify(response, request, args) {
    var thenum = args[0],
    form = new formidable.IncomingForm();

    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            form.parse(request, function(error, fields, files) {
                db.changeUnit(thenum, fields, function (unit) {
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.write(jsonify({'success': true, 'unit': unit}));
                    response.end();
                });
            });
        } else {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.write(jsonify({'success': false, 'error': 'Not authorized to do that!'}));
            response.end();
        }
    });
}

function add(response, request, args) {
    form = new formidable.IncomingForm();

    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            var superv = args[0];
            form.parse(request, function(error, fields, files) {
                if (superv) {
                    fields['supervisor'] = superv;
                } else {
                    fields['supervisor'] = '';
                }
                db.addUnit(fields, function (unit) {
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.write(jsonify({'success': true, 'unit': unit}));
                    response.end();
                });
            });
        }
    });
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

function jqueryform(response) {
    respondWithFile(response, 'clientjs/jquery.form.js', 'text/javascript');
}

function style(response) {
    respondWithFile(response, 'style/of.css', 'text/css');
}

function pstyle(response) {
    respondWithFile(response, 'style/of-print.css', 'text/css');
}

function jorgchartstyle(response) {
    respondWithFile(response, 'style/jquery.jorgchart.css', 'text/css');
}

function jorgchart(response) {
    respondWithFile(response, 'clientjs/jquery.jorgchart.js', 'text/javascript');
}

exports.modify = modify;
exports.add = add;
exports.style = style;
exports.pstyle = pstyle;
exports.jorgchartstyle = jorgchartstyle;
exports.details = details;
exports.list = list;
exports.jquery = jquery;
exports.jqueryform = jqueryform;
exports.jorgchart = jorgchart;
exports.script = script;
exports.start = start;
exports.upload = upload;
exports.upform = upform;
exports.login = login;
exports.logout = logout;
exports.isLogged = isLogged;
exports.remove = remove;