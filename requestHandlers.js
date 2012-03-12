var querystring = require("querystring"),
exec = require("child_process").exec,
fs = require("fs"),
formidable = require("formidable"),
jsonify = require("JSON").stringify,
loads = require("JSON").parse,
url = require("url"),
respondWithFile = require("./respondWithFile").respondWithFile,
csvdb = require("./db/csv");

var db = csvdb; // note, comment this out if you want to use a different DB.

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
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.write(jsonify({list: db.listHierarchy(), colors: db.locs}));
    response.end();
}

function details(response, request, args) {
    var thenum = args[0];
    dbunit = db.getUnit(thenum);
    if (dbunit) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.write(jsonify(dbunit));
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

function pstyle(response) {
    respondWithFile(response, 'style/of-print.css', 'text/css');
}

exports.style = style;
exports.pstyle = pstyle;
exports.details = details;
exports.list = list;
exports.jquery = jquery;
exports.script = script;
exports.start = start;
exports.upload = upload;
exports.upform = upform;
