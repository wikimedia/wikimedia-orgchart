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
crypto = require('crypto'),
sessions = require("sessions"),
SessionHandler = new sessions(null, {expires: 3600}),

respondWithFile = require("./respondWithFile").respondWithFile,
db = require("./lib/database"),
document = require( './lib/Document' );

var orgName = "Wikimedia Foundation";
var orgLogo = "/image/orglogo.png";

function checkAuth(response, request, cb) {
    SessionHandler.httpRequest(request, response, function (err, sess) {
        if (err != null) {
            console.log(err);
        }
        var user = sess.get('user');
        var uname = user ? user.username : '';
        if (user && 'password' in user) {
            delete user.password;
        }
        cb(uname && uname != '', user);
    });
}

function isLogged(response, request) {
    checkAuth(response, request, function (result, user) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        if (result) {
            response.write(jsonify({success: true, isLogged: true, user: user}));
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
                if (result.success === true) {
                    SessionHandler.httpRequest(request, response, function (err, sess) {
                        if (err != null) {
                            console.log(err);
                        }
                        sess.set('user', result.user);
                    });
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.write(jsonify({success: true, user: result.user}));
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
                sess.remove('user');
            });
        }
    });
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.write(jsonify({success: true}));
    response.end();
}

function createUser(response, request) {
    checkAuth(response, request, function (result, euser) {
        if (result === true && euser.canCreateUsers) {
            var form = new formidable.IncomingForm();
            form.parse(request, function (error, fields, files) {
                if (fields && fields.username && fields.password) {
                    var user = {
                        username: fields.username,
                        password: fields.password,
                        canCreateUsers: fields.canCreateUsers && fields.canCreateUsers === 'on',
                        canSeePrivateData: fields.canSeePrivateData && fields.canSeePrivateData === 'on' && euser.canSeePrivateData,
                        canEditNodes: fields.canEditNodes && fields.canEditNodes === 'on' && euser.canEditNodes,
                        canEditDocs: fields.canEditDocs && fields.canEditDocs === 'on' && euser.canEditDocs,
                        isHashed: true
                    };
                    db.addUser(user, function () {
                        response.writeHead(200, {'Content-Type': 'application/json'});
                        response.write(jsonify({success: true}));
                        response.end();
                    });
                } else {
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.write(jsonify({success: false,
                                            error: 'Either the username or the password was not found.'}));
                    response.end();
                }
            });
        } else {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.write(jsonify({success: false,
                                    error: 'Not authorized to do that!'}));
            response.end();
        }
    });
}

function cuTemplate(response) {
    respondWithFile(response, 'templates/usercreate.html');
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
    checkAuth(response, request, function(isLogged, user) {
        document.listHierarchy(doc, user && user.canSeePrivateData, function (list, locs, loccodes, units, docname) {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.write(jsonify({list: list, colors: locs, codes: loccodes, units: units, org: orgName, doc: docname, orglogo: orgLogo}));
            response.end();
        });
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

    checkAuth(response, request, function (isLogged, user) {
        if (isLogged && user.canEditNodes) {
            var docid = args[0];
            var superv = args[1];
            form.parse(request, function(error, fields, files) {
                if (error != null) {
                    console.log(error);
                }
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
        } else {
            console.log(user);
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.write(jsonify({'success': false, 'error': 'Not authorized to do that!'}));
            response.end();
        }
    });
}

function listDocs(response, request) {
    qs = querystring.parse( request.url.replace( /^[^\?]*\?/, '' ) );
    document.listDocs(function (list) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify({list: list, org: orgName, orglogo: orgLogo}));
        response.end();
    }, qs.showDeleted || false);
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
                    document.changeDoc(docid, {trashed: 1}, function () {
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

function undeleteDoc(response, request) {
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
                    document.changeDoc(docid, {trashed: 0}, function () {
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

function parseThisUnit(fields, theseFields) {
    var ix = 1;
    var thisUnit = {};
    while (ix < fields.length && ix < theseFields.length) {
        if (theseFields[ix] == 'null') {
            theseFields[ix] = '';
        }
        thisUnit[fields[ix]] = theseFields[ix];
        ix += 1;
    }
    return thisUnit;
}

function parsePlainText(response, request, args) {
    checkAuth(response, request, function (isLogged) {
        if (isLogged) {
            if (args && args.length != 0) {
                docid = args[0];
                var form = new formidable.IncomingForm();
                form.parse(request, function (error, fields, files) {
                    var units = {};
                    var addunits = {};
                    var lines = fields.text.split('\n');
                    var fields = ['_id', 'title', 'status', 'name', 'location', 'loccode', 'reqn', 'start', 'end', 'hours', 'supervisor', 'image'];
                    lines.shift();
                    for (var lx in lines) {
                        var theseFields = lines[lx].split('    ');
                        var _id = theseFields[0];
                        if (_id == 'null') {
                            addunits.push(parseThisUnit(fields, theseFields));
                        } else {
                            units[_id] = parseThisUnit(fields, theseFields);
                        }
                    }

                    function endThis() {
                        response.writeHead(200, {'Content-Type': 'application/json'});
                        response.write(jsonify({success: true}));
                        response.end();
                    }

                    db.changeUnits(docid, units, function () {
                        if (addunits.length) {
                            db.addUnits(docid, addunits, function () {
                                endThis();
                            });
                        } else {
                            endThis();
                        }
                    });
                });
            }
        } else {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.write(jsonify({'success': false, 'error': 'Not authorized to do that!'}));
            response.end();
        }
    });
}

function getPlainText(response, request, args) {
    var doc;
    if (args && args.length != 0) {
        doc = args[0];
    } else {
        doc = 'units';
    }
    checkAuth(response, request, function(isLogged, user) {
        document.listHierarchy(doc, user && user.canSeePrivateData, function (list, locs, loccodes, units, docname) {
            var fullText = [];
            var fields = ['_id', 'title', 'status', 'name', 'location', 'loccode', 'reqn', 'start', 'end', 'hours', 'supervisor', 'image', 'notes'];
            if (user.canSeePrivateData) {
                fields.push('pay');
            }
            fullText.push(fields.join('    '));
            for (var ux in units) {
                var tu = units[ux];
                var thisLine = [];
                for (var fx in fields) {
                    var tf = fields[fx];
                    if (tu[tf] && tu[tf] != '') {
                        thisLine.push(tu[fields[fx]]);
                    } else {
                        thisLine.push('null');
                    }
                }
                fullText.push(thisLine.join('    '));
            }
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.write(jsonify({text: fullText.join('\n')}));
            response.end();
        });
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
                        document.changeDoc(docid, {name: newname}, function () {
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

function changeDocDate(response, request, args) {
    var docid;

    function endChange (message) {
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
                    var newdate;
                    if (fields && fields.date) {
                        newdate = fields.date - 0;
                        document.changeDoc(docid, {date: newdate}, function () {
                            endChange({success: true, date: newdate});
                        });
                    } else {
                        endChange({success: false, error: 'No new date found'});
                    }
                });
            } else {
                endChange({success: false, error: 'No docid found'});
            }
        } else {
            endChange({success: false, error: 'Not logged in'});
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
                document.copyDoc(args[0], args[1] + ' (copy)', function () {
                    endCopy({success: true});
                });
            } else {
                var form = new formidable.IncomingForm();
                form.parse(request, function (error, fields, files) {
                    if (fields && fields.docid && fields.name) {
                        document.copyDoc(fields.docid, fields.name + ' (copy)', function (newdoc) {
                            endCopy({success: true, doc: newdoc});
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
                    if ( !fields.date ) {
                        fields.date = '';
                    }
                    document.createDoc(null, fields.name, fields.date, function (docid, newdoc) {
                        var sdata = {title: 'Root Element',
                                     supervisor: '',
                                     name: '',
                                     status: 'Employee'};
                        db.addUnit(''+docid, sdata, function () {
                            endNew({success: true, doc: newdoc});
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

function script(response, request, args) {
    var path = 'wmf-orgchart.js';
    if ( args && args.length > 0 ) {
        path = args[0];
    }
    respondWithFile(response, 'clientjs/' + path, 'text/javascript');
}

function image(response, request, args) {
    var path = 'pin-lifted.png';
    if ( args && args.length > 0 ) {
        path = args[0];
    }
    respondWithFile(response, 'images/' + path, 'image/png');
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

function jquistyle(response) {
    respondWithFile(response, 'style/jquery.ui.css', 'text/css');
}

function jquiimage(response, request, args) {
    if (args.length != 0) {
        respondWithFile(response, 'images/jqui/'+args[0]);
    } else {
        respondWithFile(response, 'images/jqui/ui-bg_flat_0_aaaaaa_40x100.png');
    }
}

exports.style = style;
exports.pstyle = pstyle;
exports.jorgchartstyle = jorgchartstyle;
exports.jquistyle = jquistyle;

exports.details = details;
exports.list = list;
exports.getPlainText = getPlainText;
exports.parsePlainText = parsePlainText;

exports.script = script;
exports.image = image;

exports.start = start;

exports.upload = upload;
exports.upform = upform;

exports.login = login;
exports.logout = logout;
exports.isLogged = isLogged;

exports.createUser = createUser;
exports.cuTemplate = cuTemplate;

exports.modify = modify;
exports.add = add;
exports.remove = remove;

exports.jquiimage = jquiimage;

exports.listDocs = listDocs;
exports.deleteDoc = deleteDoc;
exports.undeleteDoc = undeleteDoc;
exports.renameDoc = renameDoc;
exports.changeDocDate = changeDocDate;
exports.copyDoc = copyDoc;
exports.newDoc = newDoc;
