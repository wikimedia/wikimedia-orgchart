var csv = require("csv");

var colors = ['#59c840','#aab31a','#3070ac', '#886644'],
locs = {},
db = {},
gfpath = "./db.csv",
fields = ['title', 'supervisor', 'name', 'reqn', 'start', 'end', 'hours', 'status', 'location'];

function loadToDb(fpath) {
    csv()
        .fromPath(fpath)
        .on('error', function (error) {
	    return;
	})
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

loadToDb(gfpath);

function uploadToDb(response, request) {
    function moveDb(error, fields, files) {
        fs.readFile(files.csv.path, function (error, file) {
            fs.writeFile(gfpath, file, function (error) {
                loadToDb(gfpath);
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

function listHierarchy() {
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
    return thedata;
}

function getUnit(index) {
    if (db[index]) {
        return db[index];
    } else {
        return false;
    }
}

function changeUnit(ix, mod, dbr) {
    dbr = dbr | db; // db reference
    for (mx in mod) {
        if (typeof mod[mx] == 'object') {
            changeUnit(mx, mod[mx], db[ix]);
        } else {
            dbr[ix][mx] = mod[mx];
        }
    }
}

exports.loadToDb = loadToDb;
exports.uploadToDb = uploadToDb;
exports.listHierarchy = listHierarchy;
exports.getUnit = getUnit;
exports.locs = locs;