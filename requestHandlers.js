/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

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

function list(response, request, args) {
    var doc;
    if (args && args.length != 0) {
        doc = args[0];
    } else {
        doc = 'units';
    }
    db.listHierarchy(doc, function (list, locs, loccodes, units) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify({list: list, colors: locs, codes: loccodes, units: units, org: orgName}));
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
    var thenum = args[1],
    thedoc = args[0],
    form = new formidable.IncomingForm();

    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            db.findAndRemove(thedoc, thenum, function () {
                response.writeHead(200, {'Content-Type': 'application/json'});
                response.write(jsonify({success: true}));
                response.end();
            });
        }
    });
}

function modify(response, request, args) {
    var thenum = args[1],
    thedoc = args[0]
    form = new formidable.IncomingForm();

    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            form.parse(request, function(error, fields, files) {
                db.changeUnit(thedoc, thenum, fields, function (unit) {
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
            var docid = args[0];
            var superv = args[1];
            form.parse(request, function(error, fields, files) {
                if (superv) {
                    fields['supervisor'] = superv;
                } else {
                    fields['supervisor'] = '';
                }
                db.addUnit(docid, fields, function (unit) {
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.write(jsonify({'success': true, 'unit': unit}));
                    response.end();
                });
            });
        }
    });
}

function listDocs(response) {
    db.listDocs(function (list) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify({list: list, org: orgName}));
        response.end();
    });
}

function deleteDoc(response, request) {
    function endDelete (message) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify(message));
        response.end();
    }
    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            var form = new formidable.IncomingForm();
            form.parse(request, function (error, fields, files) {
                var docid;
                if (fields && fields.docid) {
                    docid = fields.docid;
                    db.deleteDoc(docid, function () {
                        endDelete({success: true});
                    });
                } else {
                    endDelete({success: false, error: 'No docid found'});
                }
            });
        } else {
            endDelete({success: false, error: 'Not logged in'});
        }
    });
}

function renameDoc(response, request, args) {
    var docid;

    function endRename (message) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify(message));
        response.end();
    }

    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            if (args && args.length != 0) {
                docid = args[0];
                var form = new formidable.IncomingForm();
                form.parse(request, function (error, fields, files) {
                    var newname;
                    if (fields && fields.name) {
                        newname = fields.name;
                        db.renameDoc(docid, newname, function () {
                            endRename({success: true, name: newname, docid: docid});
                        });
                    } else {
                        endRename({success: false, error: 'No new name found'});
                    }
                });
            } else {
                endRename({success: false, error: 'No docid found'});
            }
        } else {
            endRename({success: false, error: 'Not logged in'});
        }
    });
}

function copyDoc(response, request, args) {
    function endCopy (message) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify(message));
        response.end();
    }
    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
	    if (args && args.length == 2) {
		db.copyDoc(args[0], args[1] + ' (copy)', function () {
		    endCopy({success: true});
		});
	    } else {
		var form = new formidable.IncomingForm();
		form.parse(request, function (error, fields, files) {
                    if (fields && fields.docid && fields.name) {
			db.copyDoc(fields.docid, fields.name + ' (copy)', function () {
                            endCopy({success: true});
			});
                    } else {
			endCopy({success: false, error: 'No name or docid found'});
                    }
		});
	    }
        } else {
            endCopy({success: false, error: 'Not logged in'});
        }
    });
}

function newDoc(response, request) {
    function endNew (message) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify(message));
        response.end();
    }

    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            var form = new formidable.IncomingForm();
            form.parse(request, function (error, fields, files) {
                if (fields && fields.name) {
                    db.createDoc(fields.name, function (_newid) {
                        var sdata = {title: 'Root Element',
                                     supervisor: '',
                                     name: '',
                                     status: 'Employee'};
                        db.addUnit(String(_newid), sdata, function () {
                            endNew({success: true, docid: String(_newid)});
                        });
                    });
                } else {
                    endNew({success: false, error: 'No name found'});
                }
            });
        } else {
            endNew({success: false, error: 'Not logged in'});
        }
    });
}

function start(response) {
    respondWithFile(response, 'templates/index.html');
}

function script(response) {
    respondWithFile(response, 'clientjs/wmf-orgchart.js', 'text/javascript');
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

function svg(response) {
    respondWithFile(response, 'clientjs/svg-oc/base/jquery.svg.js', 'text/javascript');
}

function svggraph(response) {
    respondWithFile(response, 'clientjs/svg-oc/base/jquery.svggraph.js', 'text/javascript');
}

function svgchart(response) {
    respondWithFile(response, 'clientjs/svg-oc/jquery.svgorgchart.js', 'text/javascript');
}

function pinlifted(response) {
    respondWithFile(response, 'images/pin-lifted.png', 'image/png');
}

function pinpinned(response) {
    respondWithFile(response, 'images/pin-pinned.png', 'image/png');
}

exports.style = style;
exports.pstyle = pstyle;
exports.jorgchartstyle = jorgchartstyle;

exports.details = details;
exports.list = list;

exports.jquery = jquery;
exports.jqueryform = jqueryform;

exports.svg = svg;
exports.svggraph = svggraph;
exports.svgchart = svgchart;

exports.script = script;

exports.start = start;

exports.upload = upload;
exports.upform = upform;

exports.login = login;
exports.logout = logout;
exports.isLogged = isLogged;

exports.modify = modify;
exports.add = add;
exports.remove = remove;

exports.pinlifted = pinlifted;
exports.pinpinned = pinpinned;

exports.listDocs = listDocs;
exports.deleteDoc = deleteDoc;
exports.renameDoc = renameDoc;
exports.copyDoc = copyDoc;
exports.newDoc = newDoc;
