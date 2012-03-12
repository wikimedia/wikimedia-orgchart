var csv = require("csv");

var colors = ['#59c840','#aab31a','#3070ac', '#886644'],
locs = {},
db = {},
gfpath = "./db.csv",
loaded = false,
fields = ['title', 'supervisor', 'name', 'reqn', 'start', 'end', 'hours', 'status', 'location'];

function loadToDb(tdb, fpath) {
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
            tdb[index] = nobj;
            tdb[index].index = index;
        })
        .on('end', function (count) {
            var locales = {},
            sorted = [];
            for (var ix in tdb) {
                if (tdb[ix].supervisor && tdb[ix].supervisor != '' && tdb[ix].supervisor != null) {
                    for (var jx in tdb) {
                        if (tdb[jx].title == tdb[ix].supervisor) {
                            tdb[ix].supervisor = jx;
                        }
                    }
                }
                if (tdb[ix].location && tdb[ix].location != '') {
                    var loc = tdb[ix].location;
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
            loaded = true;
        });
}

loadToDb(db, gfpath);

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

function listHierarchy(cb) {
    if (!loaded) {
        setTimeout(function () {
            listHierarchy(cb);
        }, 200);
        return false;
    }
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
    cb(thedata, locs);
}

function getUnit(index, cb) {
    if (db[index]) {
        cb(db[index]);
    } else {
        cb(false);
    }
}

function changeUnit(ix, mod, cb) {
    for (mx in mod) {
        db[ix][mx] = mod[mx];
    }
    cb(db[ix]);
}

exports.loadToDb = loadToDb;
exports.uploadToDb = uploadToDb;
exports.listHierarchy = listHierarchy;
exports.getUnit = getUnit;
exports.locs = locs;