/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var mgdb = require('mongodb');
var crypto = require('crypto');

var colors = ['#006699','#5e5e5e','#969898','#886644'],
locs = {},
loccodes = {},
db = new mgdb.Db('orgcharts', new mgdb.Server('127.0.0.1', 27017, {})),
ObjectId = mgdb.ObjectID,
cols = {},
colld = {},
looking = 0,
loaded = false;

cols.units = 'units';
cols.users = 'users';

var initusers = [{username: 'admin', password: crypto.createHash('sha512').update(''+Math.random()).digest('hex')}];

db.open(function (err, p_client) {
    db.collectionNames(function (err, items) {
        for (var ux in cols) {
            if (!items || items.length == 0 || items.indexOf(cols[ux]) == -1) {
                db.createCollection(cols[ux], function (err, col) {
                    colld[col.collectionName] = true;
                    var found = false;
                    for (var cx in cols) {
                        if (!colld[cx]) {
                            found = true;
                        }
                    }
                    if (!found) {
                        db.close();
                        loaded = true;
                        console.log('Database ready.');
                    }
                });
            } else {
                colld[ux] = true;
                var found = false;
                for (var cx in cols) {
                    if (!colld[cx]) {
                        found = true;
                    }
                }
                if (!found) {
                    db.close();
                    loaded = true;
                    console.log('Database ready.');
                }
            }
        }
    });
});

for (var ux in initusers) {
    addUser(initusers[ux], function (user) {
        if (user && user[0] && user[0].username) {
            console.log('Database: Added default user ' + user[0].username + ' with password ' + user[0].password);
        } else {
            console.log('Database: Default user ' + user.ename + ' exists with password ' + user.epass);
        }
    });
}

function findAndRemove(con, cb) {
    if (!loaded) {
        setTimeout(function () { findAndRemove(con, cb); }, 200);
        return;
    }
    if (typeof cb != 'function') {
        cb = function () {};
    }
    if (typeof con != 'object') {
        con = {_id: new ObjectId(con)};
    }
    
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.remove(con, {safe: true}, function (err, num) {
                db.close();
                cb();
            });
        });
    });
}

function listHierarchy(cb) {
    if (!loaded) {
        setTimeout(function () { listHierarchy(cb); }, 200);
        return;
    }
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.find().toArray(function (err, docs) {
                db.close();
                if (err != null) {
                    if (cb && typeof cb == 'function') {
                        cb([]);
                    }
                } else {
                    var list = {}, lcount = {}, lccount = {}, units = docs;
                    list.none = [];
                    for (var ix in docs) {
                        if (!docs[ix].supervisor || docs[ix].supervisor == '') {
                            list.none.push(docs[ix]._id);
                        } else {
                            if (!list[docs[ix].supervisor]) {
                                list[docs[ix].supervisor] = [];
                            }
                            list[docs[ix].supervisor].push(docs[ix]._id);
                        }
                        if (docs[ix].location && docs[ix].location != '' && lcount[docs[ix].location]) {
                            lcount[docs[ix].location] += 1;
                        } else {
                            lcount[docs[ix].location] = 1;
                        }
                        if (docs[ix].loccode && docs[ix].loccode != '' && lccount[docs[ix].loccode]) {
                            lccount[docs[ix].loccode] += 1;
                        } else if (docs[ix].loccode && docs[ix].loccode != '') {
                            lccount[docs[ix].loccode] = 1;
                        }
                    }
                    var csort = [], lcsort = [];
                    for (var lx in lcount) {
                        var sx = 0;
                        while (csort[sx] && lcount[csort[sx]] > lcount[lx]) {
                            sx += 1;
                        }
                        csort.splice(sx, 0, lx);
                    }
                    for (var lcx in lccount) {
                        var lccx = 0;
                        while (lcsort[lccx] && lccount[lcsort[lccx]] > lccount[lcx]) {
                            lccx += 1;
                        }
                        lcsort.splice(lccx, 0, lcx);
                    }
                    for (var lx in csort) {
                        if (lx < colors.length) {
                            locs[csort[lx]] = colors[lx];
                        } else {
                            locs[csort[lx]] = colors[colors.length-1];
                        }
                    }
                    for (var lcx in lcsort) {
                        if (lcx < colors.length) {
                            loccodes[lcsort[lcx]] = colors[lcx];
                        } else {
                            loccodes[lcsort[lcx]] = colors[colors.length-1];
                        }
                    }

                    locs.other = colors[colors.length-1];
                    loccodes.other = locs.other;
                    
                    var dunits = {};
                    for (var ux in units) {
                        units[ux].index = units[ux]._id;
                        dunits[units[ux]._id] = units[ux];
                    }
                    if (cb && typeof cb == 'function') {
                        cb(list, locs, loccodes, dunits);
                    }
                }
            });
        });
    });
}

function getUnit(uid, cb) {
    if (!loaded) {
        setTimeout(function () { getUnit(uid, cb); }, 200);
        return;
    }
    looking += 1;
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.findOne({_id: new ObjectId(uid)}, {}, function (err, doc) {
                db.close();
                looking -= 1;
                if (cb && typeof cb == 'function') {
                    if (doc && doc._id) {
                        doc.index = doc._id;
                    }
                    cb(doc);
                }
            });
        });
    });
}

function changeUnit(uid, mods, cb) {
    if (!loaded) {
        setTimeout(function () { changeUnit(uid, mods, cb); }, 200);
        return;
    }
    modDic = {$set:{}};
    for (var ix in mods) {
        modDic.$set[ix] = mods[ix];
    }
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.findAndModify({_id: new ObjectId(uid)}, [['_id', 1]], modDic, {new: true}, function (err, doc) {
                db.close();
                if (cb && typeof cb == 'function') {
                    cb(doc);
                }
            });
        });
    });
}

function addUser(data, cb) {
    if (!loaded) {
        setTimeout(function () { addUser(data, cb); }, 200);
        return;
    }
    db.open(function (err, p_client) {
        db.collection(cols.users, function (err, col) {
            col.findOne({username: data.username}, function (err, doc) {
                if (!doc) {
                    col.insert([data], {safe: true}, function (err, doc) {
                        db.close();
                        if (cb && typeof cb == 'function') {
                            cb(doc); // I don't know what gets sent here, but do it anyway!
                        }
                    });
                } else {
                    cb({ename: doc.username, epass: doc.password});
                }
            });
        });
    });
}

function checkLogin(data, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    if (data && data.username && data.password) {
        db.open(function (err, p_client) {
            db.collection(cols.users, function (err, col) {
                col.findOne({username: data.username}, {}, function (err, doc) {
                    db.close();
                    if (doc && doc.username == data.username && doc.password == data.password) {
                        cb({success: true});
                    } else {
                        cb({success: false});
                    }
                });
            });
        });
    } else {
        cb({success: false});
    }
}

function addUnit(data, cb) {
    if (!loaded) {
        setTimeout(function () { addUnit(data, cb); }, 200);
        return;
    }
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.insert([data], {safe: true}, function (err, doc) {
                db.close();
                if (cb && typeof cb == 'function') {
                    cb(doc); // I don't know what gets sent here, but do it anyway!
                }
            });
        });
    });
}

function dropCollection(name) {
    if (!loaded) {
        setTimeout(function () { dropCollection(name); }, 200);
        return;
    }
    name = name || 'units';
    db.open(function (err, p_client) {
        db.collection(cols[name], function (err, col) {
            col.drop(function () {
                db.close();
            });
        });
    });
}

function closeAll() {
    db.close();
}

exports.dropCollection = dropCollection;
exports.listHierarchy = listHierarchy;
exports.addUnit = addUnit;
exports.getUnit = getUnit;
exports.changeUnit = changeUnit;
exports.findAndRemove = findAndRemove;
exports.addUser = addUser;
exports.checkLogin = checkLogin;
exports.closeAll = closeAll;
