var querystring = require("querystring"),
exec = require("child_process").exec,
fs = require("fs"),
formidable = require("formidable"),
jsonify = require("JSON").stringify,
loads = require("JSON").parse,
url = require("url"),
respondWithFile = require("./respondWithFile").respondWithFile,
csvdb = require("./db/csv"),
mongodb = require("./db/mongo");

// var db = csvdb; // CSV database (not very good)
var db = mongodb; // mongodb database (better)

function checkAuth() {
    return true;
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
        response.write(jsonify({list: list, colors: locs, units: units}));
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

function modify(response, request, args) {
    var thenum = args[0],
    form = new formidable.IncomingForm();

    if (checkAuth()) {
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

exports.modify = modify;
exports.style = style;
exports.pstyle = pstyle;
exports.details = details;
exports.list = list;
exports.jquery = jquery;
exports.jqueryform = jqueryform;
exports.script = script;
exports.start = start;
exports.upload = upload;
exports.upform = upform;
