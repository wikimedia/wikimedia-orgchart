var querystring = require("querystring"),
exec = require("child_process").exec,
fs = require("fs"),
formidable = require("formidable"),
csv = require("csv"),
json = require("JSON");

var db = [],
fpath = "./db.csv";

csv()
    .fromPath(fpath)
    .on('data', function (data, index) {
        db.push(data);
    });

function start(response) {
    console.log("Request handler 'start' was called.");

    fs.readFile('templates/index.html', function (error, file){
        if(error) {
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write(error + "\n");
            response.end();
        } else {
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(file);
            response.end();
        }
    });
}

function upload(response, request) {
    console.log("Request handler 'upload' was called.");

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

function show(response) {
    console.log("Request handler 'show' was called.");
    response.writeHead(200, {"Content-Type": "application/json"});
    response.write(json.stringify(db));
    response.end();
}

exports.start = start;
exports.upload = upload;
exports.show = show;
