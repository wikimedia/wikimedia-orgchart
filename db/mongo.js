/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var mgdb = require('mongodb');
var crypto = require('crypto');

var colors = ['#006699', // 1
              '#5e5e5e', // 2
              '#969898', // 3
              '#58bf81', // 4
              '#51ac28', // 5
              '#b9c34d', // 6
              '#ea6422', // 7
              '#cf5a86', // 8
              '#bc31c1', // 9
              '#8a2ac1', // 10
              '#886644' // other
             ],
locs = {},
loccodes = {},
dbname = 'orgcharts',
db = new mgdb.Db(dbname, new mgdb.Server('127.0.0.1', 27017, {})),
ObjectId = mgdb.ObjectID,
cols = {},
colld = {},
looking = 0,
dbfs = [],
loaded = false;

cols.units = 'units';
cols.users = 'users';
cols.docs = 'docs';

var initusers = [
    {
        username: 'admin',
        password: crypto.createHash('sha512').update(''+Math.random()).digest('hex'),
        canEditNodes: true,
        canEditDocs: true,
        canSeePrivateData: true,
        canCreateUsers: true
    },
    {
        username: 'guest',
        password: crypto.createHash('sha512').update(''+Math.random()).digest('hex'),
        canEditNodes: false,
        canEditDocs: false,
        canSeePrivateData: false,
        canCreateUsers: false
    }
];

function indexOf (arr, elt /*, from*/) {
    var len = arr.length >>> 0;

    var from = Number(arguments[2]) || 0;
    from = (from < 0) ? Math.ceil(from) : Math.floor(from);

    if (from < 0)
        from += len;

    for (; from < len; from++) {
        if (from in arr && arr[from] === elt)
            return from;
    }
    return -1;
}

function createCollection(name, cb) {
    if (!cols[name] || cols[name] == '') {
        cols[name] = name;
    }
    db.collectionNames(function (err, items) {
        var found = false;
        if (items && items.length != 0) {
            for (var ix in items) {
                if (items[ix].name == dbname + '.' + name) {
                    found = true;
                    break;
                }
            }
        }
        if (!items || items.length == 0 || !found) {
            db.createCollection(cols[name], function (err, col) {
                if (err == null) {
                    colld[name] = true;
                    cb(null);
                } else {
                    cb(err);
                }
            });
        } else {
            colld[name] = true;
            cb(null);
        }
    });
}

function makeDbCalls() {
    for (var fx in dbfs) {
        dbfs[fx]();
    }
}

db.open(function (err, p_client) {
    for (var ux in cols) {
        createCollection(ux, function (err) {
            if (err != null) {
                console.log(err);
            }
            var cx = indexOf(colld, false);
            if (!loaded && cx == -1) {
                loaded = true;
                console.log('Database ready.');
                makeDbCalls();
            }
        });
    }

    for (var ux in initusers) {
        addUser(initusers[ux], function (user) {
            if (user && user[0] && user[0].username) {
                console.log('Database: Added default user.');
                console.log(user);
            } else if (user && user.ename) {
                console.log('Database: Default user exists.');
                console.log(user);
            } else {
                console.log('Database error, default user not created');
            }
        });
    }
});

function findAndRemove(doc, con, cb) {
    if (!loaded) {
        dbfs.push(function () { findAndRemove(doc, con, cb); });
        return;
    }
    if (typeof cb != 'function') {
        cb = function () {};
    }
    var unitid = false;
    if (typeof con != 'object') {
        con = {$or: [{_id: new ObjectId(con)}, {_id: con}]};
    }

    getDoc(doc, function(_id) {
        function doTheRest(unitobj) {
            db.collection(''+_id, function (err, col) {
                col.remove(con, {safe: true}, function (err, num) {
                    addToDocCount(''+_id, -1 * num);
                    if (unitid) {
                        addToChanges(''+_id, unitid, {action: 'delete', was: unitobj});
                    }
                    cb();
                });
            });
        }
        if (unitid) {
            getUnit(unitid, doTheRest);
        } else {
            doTheRest();
        }
    });
}

function listHierarchy(doc, canSeePrivateData, cb) {
    if (typeof doc != typeof 'string') {
        doc = '' + doc;
    }
    if (!loaded) {
        dbfs.push(function () { listHierarchy(doc, canSeePrivateData, cb); });
        return;
    }

    function doTheRest(_id, docname) {
        var colname;
        if (typeof _id != typeof 'string') {
            _id = '' + _id
        }
        db.collection(_id, function (err, col) {
            if (err != null) {
                console.log(err);
            } else {
                col.find().toArray(function (err, docs) {
                    if (err != null) {
                        console.log(err);
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
                            delete units[ux].pay;
                            dunits[units[ux]._id] = units[ux];
                        }
                        if (cb && typeof cb == 'function') {
                            cb(list, locs, loccodes, dunits, docname);
                        }
                    }
                });
            }
        });
    }

    if (doc == 'units') {
        doTheRest(cols.units, 'legacy chart');
    } else {
        getDoc(doc, doTheRest);
    }
}

function getUnit(doc, uid, cb) {
    if (!loaded) {
        dbfs.push(function () { getUnit(doc, uid, cb); });
        return;
    }
    looking += 1;
    getDoc(doc, function (_id) {
        db.collection(''+_id, function (err, col) {
            col.findOne({$or: [{_id: new ObjectId(uid)}, {_id: ''+uid}]}, {}, function (err, doc) {
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

function changeUnits(docid, units, cb) {
    var waiting = 0;
    for (var ux in units) {
        waiting += 1;
        changeUnit(docid, ux, units[ux], function () {
            waiting -= 1;
            if (waiting === 0) {
                cb();
            }
        });
    }
}

function addToChanges(_id, uid, mods, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    db.collection(_id+'_changes', function (err, col) {
        if (err != null) {
            console.log(err);
        }
        col.insert({unit: uid, mods: mods, time: new Date().getTime()}, {safe: true}, function (err, doc) {
            if (err != null) {
                console.log(err);
            }
            cb(doc);
        });
    });
}

function changeUnit(docid, uid, mods, cb) {
    if (!loaded) {
        dbfs.push(function () { changeUnit(docid, uid, mods, cb); });
        return;
    }

    getUnit(docid, uid, function (doc) {
        var modDic = {$set:{}};
        for (var ix in mods) {
            if (ix == 'supervisor') {
                try {
                    mods[ix] = new ObjectId(mods[ix]);
                } catch (err) {
                    delete mods[ix];
                }
            }
            console.log(doc, mods);
            if ((!doc[ix] && mods[ix] && mods[ix] != '') || mods[ix] !== doc[ix]) {
                modDic.$set[ix] = mods[ix];
            }
        }
        getDoc(docid, function (_id) {
            if (_id != null) {
                _id = ''+_id;
            } else {
                _id = docid;
            }
            db.collection(_id, function (err, col) {
                if (err != null) {
                    console.log(err);
                }
                if (uid != null && typeof uid == typeof 'string' && (uid.length == 12 || uid.length == 24)) {
                    uid = new ObjectId(uid);
                }
                col.findAndModify({$or: [{_id: uid}, {_id: ''+uid}]}, [['_id', 1]], modDic, {new: true}, function (err, doc) {
                    if (err != null) {
                        console.log(err);
                    } else {
                        if (cb && typeof cb == 'function') {
                            cb(doc);
                        }
                    }
                });
            });
            addToChanges(_id, uid, modDic.$set);
        });
    });
}

function addUser(data, cb) {
    db.collection(cols.users, function (err, col) {
        col.findOne({username: data.username}, function (err, doc) {
            if (!doc) {
                col.insert([data], {safe: true}, function (err, doc) {
                    if (cb && typeof cb == 'function') {
                        cb(doc); // I don't know what gets sent here, but do it anyway!
                    }
                });
            } else {
                var modDic = {$set: {}};
                for (var ix in data) {
                    if (ix == 'username' || ix == 'password') {
                        continue;
                    } else {
                        modDic.$set[ix] = data[ix];
                    }
                }
                col.findAndModify({username: doc.username}, [['_id', 1]], modDic, {new: true}, function () {
                    var user = modDic.$set;
                    user.ename = doc.username;
                    user.epass = doc.password;
                    cb(user);
                });
            }
        });
    });
}

function checkLogin(data, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    if (data && data.username && data.password) {
        db.collection(cols.users, function (err, col) {
            if (err != null) {
                console.log(err);
            }
            col.findOne({username: data.username}, {}, function (err, doc) {
                if (err != null) {
                    console.log(err);
                }
                console.log(data);
                console.log(doc);
                if (doc && doc.username == data.username && doc.password == data.password) {
                    delete data.password;
                    cb({success: true, user: doc});
                } else {
                    cb({success: false});
                }
            });
        });
    } else {
        cb({success: false});
    }
}

function addUnit(docid, data, cb) {
    addUnits(docid, [data], cb);
}

function addUnits(docid, data, cb) {
    if (!loaded) {
        dbfs.push(function () { addUnits(docid, data, cb); });
        return;
    }

    function doTheRest(_id) {
        if (_id != null) {
            _id = ''+_id;
        } else {
            _id = docid;
        }
        db.collection(''+_id, function (err, col) {
            if (err != null) {
                console.log(err);
            }
            if (col != null) {
                col.insert(data, {safe: true}, function (err, doc) {
                    if (err != null) {
                        console.log(err);
                    }
                    else {
                        addToDocCount(''+_id, doc.length, function () {
                            if (cb && typeof cb == 'function') {
                                cb(doc); // I don't know what gets sent here, but do it anyway!
                            }
                        });
                        for (ux in doc) {
                            addToChanges(_id, doc._id, doc);
                        }
                    }
                });
            }
        });
    }

    if (docid == cols.units) {
        doTheRest('units');
    } else {
        getDoc(docid, doTheRest);
    }
}

function addToDocCount(doc, num, cb) {
    if (!loaded) {
        dbfs.push(function () { addToDocCount(doc, num); });
        return;
    }
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    getDoc(doc, function (_id) {
        db.collection(cols.docs, function (err, col) {
            if (err != null) {
                console.log(err);
            }
            col.findAndModify({_id: _id}, [['_id', 1]], {$inc: {count: num}}, {new: true}, function (err, document) {
                if (err != null) {
                    console.log(err);
                }
                cb();
                return;
            });
        });
    });
}

function emptyCollection(name, cb) {
    if (!loaded) {
        dbfs.push(function () { emptyCollection(name, cb) });
        return;
    }
    name = name || 'units';
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }

    getDoc(name, function (_id) {
        if (_id == null) {
            cb(null, false);
        } else {
            db.collection(''+_id, function (err, col) {
                if (col != null) {
                    col.remove({}, {safe: true}, function (err, count) {
                        if (err != null) {
                            console.log(err);
                        }
                        cb(err, true);
                    });
                } else if (err == null) {
                    cb(null, false);
                } else {
                    console.log(err);
                    cb(err, false);
                }
            });
        }
    });
}

function dropCollection(name, cb) {
    name = name || 'units';
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    db.collection(cols[name], function (err, col) {
        if (col != null) {
            col.drop(function () {
                cb();
            });
        } else {
            cb();
        }
    });
}

function listDocs(cb) {
    if (!loaded) {
        dbfs.push(function () { listDocs(cb); });
        return;
    }
    db.collection(cols.docs, function (err, col) {
        col.find().toArray(function (err, docs) {
            cb(docs);
        });
    });
}

function getDoc(did, cb) {
    if (!loaded) {
        dbfs.push(function () { getDoc(did, cb); });
        return;
    }
    if (did == 'units') {
        cb(cols.units);
        return;
    }
    if (typeof did == typeof 'string' && (did.length == 12 || did.length == 24)) {
        did = new ObjectId(did);
    }
    db.collection(cols.docs, function (err, col) {
        if (err != null) {
            console.log(err);
        }
        col.findOne({_id: did}, function (err, doc) {
            if (err != null) {
                console.log(err);
            }
            if (doc != null) {
                cb(doc._id, doc.name, doc.date);
            } else {
                cb(null);
            }
        });
    });
}

function createDoc(name, date, cb) {
    if (!loaded) {
        dbfs.push(function () { createDoc(name, cb); });
        return;
    }
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    db.collection(cols.docs, function (err, col) {
        if (err != null) {
            console.log(err);
        }
        col.insert([{date: date, name: name, count: 0, created: (new Date()).getTime()}], function (err, doc) {
            if (err != null) {
                console.log(err);
            }
            createCollection(''+doc[0]._id, function (err) {
                if (err != null) {
                    console.log(err);
                }
                createCollection(''+doc[0]._id+'_changes', function (err) {
                    if (err != null) {
                        console.log(err);
                    }
                    cb(doc[0]._id);
                });
            });
        });
    });
}

function copyDoc(orig, dest, cb) {
    if (!loaded) {
        dbfs.push(function () { copyDoc(orig, dest, cb); });
        return;
    }
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    console.log('Database: Copying ' + orig + ' to ' + dest);
    function doTheRest(_id, _newid) {
        listHierarchy(_id, function (list, locs, loccodes, dunits) {
            var unitdata = [];
            for (var lx in dunits) {
                if (typeof dunits._id != typeof (new ObjectId())) {
                    dunits._id = new ObjectId(dunits._id);
                }
                unitdata.push(dunits[lx]);
            }
            addUnits(_newid, unitdata, function (err, doc) {
                cb(list, locs, loccodes, dunits);
            });
        });
    }

    if (orig != cols.units) {
        getDoc(orig, function (_id, name, date) {
            createDoc(dest, date, function (_newid) {
                doTheRest(_id, _newid);
            });
        });
    } else {
        createDoc(dest, '', function (_newid) {
            doTheRest(cols.units, _newid);
        });
    }
}

function deleteDoc(doc, cb) {
    if (!loaded) {
        dbfs.push(function () { deleteDoc(doc, cb); });
        return;
    }
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    getDoc(doc, function (_id) {
        db.collection(cols.docs, function (err, col) {
            col.remove({_id: _id}, {safe: true}, function (err, num) {
                dropCollection(_id);
                cb();
            });
        });
    });
}

function renameDoc(doc, name, cb) {
    if (!loaded) {
        dbfs.push(function () { deleteDoc(doc, cb); });
        return;
    }
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    db.collection(cols.docs, function (err, col) {
        getDoc(doc, function (_id) {
            col.findAndModify({_id: _id}, [['_id', 1]], {$set: {name: name}}, function (err, doc) {
                cb();
            });
        });
    });
}

function listAllChanges(doc, cb) {
    if (!loaded) {
        dbfs.push(function () { listAllChanges(doc, cb); });
        return;
    }
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    getDoc(doc, function (_id) {
        db.collection(''+_id+'_changes', function (err, col) {
            col.find().toArray(function (err, docs) {
                if (err != null) {
                    console.log(err);
                }
                cb(docs);
            });
        });
    });
}

function closeAll() {
    db.close();
}

exports.createCollection = dropCollection;
exports.dropCollection = dropCollection;
exports.emptyCollection = emptyCollection;
exports.listHierarchy = listHierarchy;
exports.addUnit = addUnit;
exports.addUnits = addUnits;
exports.getUnit = getUnit;
exports.changeUnit = changeUnit;
exports.changeUnits = changeUnits;
exports.findAndRemove = findAndRemove;
exports.addUser = addUser;
exports.checkLogin = checkLogin;
exports.closeAll = closeAll;

exports.createDoc = createDoc;
exports.copyDoc = copyDoc;
exports.getDoc = getDoc;
exports.listDocs = listDocs;
exports.deleteDoc = deleteDoc;
exports.renameDoc = renameDoc;

exports.listAllChanges = listAllChanges;
