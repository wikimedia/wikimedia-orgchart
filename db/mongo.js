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
// Modifiable unit fields
fields = {
    name: true,
    title: true,
    location: true,
    loccode: true,
    reqn: true,
    start: true,
    end: true,
    hours: true,
    image: true,
    supervisor: true,
    status: true,
    notes: true
},
// Modifiable document fields
dfields = {
    name: true,
    date: true,
    created: true,
    trashed: true,
    count: true
},
locs = {},
loccodes = {},
dbname = 'orgcharts',
ourdb = new mgdb.Db(dbname, new mgdb.Server('127.0.0.1', 27017, {})),
ObjectId = mgdb.ObjectID,
cols = {},
colld = {},
looking = 0,
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

var withDb = (function (db) {
    var isUsingDbNow = false;
    var extraCallbacks = [];
    return function (cb, ignoreLoaded) {
        if (!isUsingDbNow && (loaded || ignoreLoaded)) {
            isUsingDbNow = true;
            db.open(function (err, p_client) {
                if (err != null) {
                    console.log(err);
                    isUsingDbNow = false;
                    return;
                }
                function callOthers () {
                    if (loaded && extraCallbacks.length) {
                        extraCallbacks.pop()(db, callOthers);
                    } else {
                        isUsingDbNow = false;
                        db.close();
                    }
                }
                cb(db, callOthers);
            });
        } else {
            extraCallbacks.push(cb);
        }
    };
})(ourdb);

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
    withDb(function (db, finish) {
        db.collectionNames(function (err, items) {
            if ( err != null ) {
                finish();
                cb(err);
                return;
            }
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
                    finish();
                    if (err == null) {
                        colld[name] = true;
                        cb(null);
                    } else {
                        cb(err);
                    }
                });
            } else {
                finish();
                colld[name] = true;
                cb(null);
            }
        });
    }, true);
}

for (var ux in cols) {
    createCollection(ux, function (err) {
        if (err != null) {
            console.log(err);
        }
        var cx = indexOf(colld, false);
        if (!loaded && cx == -1) {
            loaded = true;
            console.log('Database ready.');
            withDb(function (db, finish) {finish();});
        }
    });
}

for (var ux in initusers) {
    ( function ( curuser ) {
        addUser(curuser, function (user) {
            if ( ( user && user[0] && user[0].username ) || ( user && user.ename ) ) {
                console.log( 'Default Username ' + curuser.username );
                console.log( 'Default Password ' + ( user.isHashed ? curuser.password : user.epass ) );
                console.log('');
            } else {
                console.log('Database error, default user not created');
            }
        });
    } )( initusers[ux] );
}

function findAndRemove(doc, con, cb) {
    if (typeof cb != 'function') {
        cb = function () {};
    }
    var unitid = false;
    if (typeof con != 'object') {
        con = {$or: [{_id: new ObjectId(con)}, {_id: con}]};
    }

    getDoc(doc, function(_id) {
        function doTheRest(unitobj) {
            withDb(function (db, finish) {
                db.collection(''+_id, function (err, col) {
                    col.remove(con, {safe: true}, function (err, num) {
                        finish();
                        updateDocCount( '' + _id );
                        if (unitid) {
                            addToChanges(''+_id, unitid, {action: 'delete', was: unitobj});
                        }
                        cb();
                    });
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
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }

    function doTheRest(_id, docname) {
        var colname;
        if (typeof _id != typeof 'string') {
            _id = '' + _id
        }
        withDb(function (db, finish) {
            db.collection(_id, function (err, col) {
                if (err != null) {
                    finish();
                    console.log(err);
                    cb([]);
                } else {
                    col.find().toArray(function (err, docs) {
                        finish();
                        if (err != null) {
                            console.log(err);
                            cb([]);
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
                            cb(list, locs, loccodes, dunits, docname);
                        }
                    });
                }
            });
        });
    }

    if (doc == 'units') {
        doTheRest(cols.units, 'legacy chart');
    } else {
        getDoc(doc, doTheRest);
    }
}

function getUnit(doc, uid, cb) {
    looking += 1;
    getDoc(doc, function (_id) {
        withDb(function (db, finish) {
            db.collection(''+_id, function (err, col) {
                col.findOne({$or: [{_id: new ObjectId(uid)}, {_id: ''+uid}]}, {}, function (err, doc) {
                    finish();
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

    for ( var field in mods ) {
        if ( !fields[field] ) {
            delete mods[field];
        }
    }

    withDb(function (db, finish) {
        db.collection(_id+'_changes', function (err, col) {
            if (err != null) {
                finish();
                cb(null);
                console.log(err);
            }
            col.insert({unit: uid, mods: mods, time: new Date().getTime()}, {safe: true}, function (err, doc) {
                finish();
                if (err != null) {
                    cb(null);
                    console.log(err);
                } else {
                    cb(doc);
                }
            });
        });
    });
}

function changeUnit(docid, uid, mods, cb) {
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
            withDb(function (db, finish) {
                db.collection(_id, function (err, col) {
                    if (err != null) {
                        finish();
                        cb(null);
                        console.log(err);
                    }
                    if (uid != null && typeof uid == typeof 'string' && (uid.length == 12 || uid.length == 24)) {
                        uid = new ObjectId(uid);
                    }
                    col.findAndModify({$or: [{_id: uid}, {_id: ''+uid}]}, [['_id', 1]], modDic, {new: true}, function (err, doc) {
                        if (err != null) {
                            finish();
                            cb(null);
                            console.log(err);
                        } else {
                            if (cb && typeof cb == 'function') {
                                finish();
                                cb(doc);
                            }
                        }
                    });
                });
            });
            addToChanges(_id, uid, modDic.$set);
        });
    });
}

function addUser(data, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    withDb(function (db, finish) {
        db.collection(cols.users, function (err, col) {
            col.findOne({username: data.username}, function (err, doc) {
                if (!doc) {
                    if ( data.isHashed === true ) {
                        delete data.isHashed;
                        if ( data.needsHash === true ) {
                            // Hash once, this will protect it during transit from the client
                            data.password = crypto.createHash( 'sha512' ).update( data.password ).digest( 'hex' );
                            delete data.needsHash;
                        }
                        // Hash again with a salt, this will protect it while it's in the database
                        data.salt = '' + Math.random();
                        data.password = crypto.createHash( 'sha512' ).update( data.password + data.salt ).digest( 'hex' );
                    }
                    col.insert([data], {safe: true}, function (err, doc) {
                        finish();
                        cb(doc); // I don't know what gets sent here, but do it anyway!
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
                    col.update({username: doc.username}, modDic, function () {
                        finish();
                        var user = modDic.$set;
                        user.ename = doc.username;
                        user.epass = doc.password;
                        cb(user);
                    });
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
        withDb(function (db, finish) {
            db.collection(cols.users, function (err, col) {
                if (err != null) {
                    finish();
                    cb({success: false});
                    console.log(err);
                }
                col.findOne({username: data.username}, {}, function (err, doc) {
                    finish();
                    if (err != null) {
                        cb({success: false});
                        console.log(err);
                    }
                    if ( doc && doc.salt ) {
                        // It's already been hashed once on the client, so we just need to hash
                        // again with the salt. Security!!!
                        data.password = crypto.createHash( 'sha512' ).update( data.password + doc.salt ).digest( 'hex' );
                    } else {
                        // This is an old-style password, there's no point in updating
                        // it to be hashed in the database. We'll just hash this copy and
                        // make sure it's the same.
                        doc.password = crypto.createHash( 'sha512' ).update( doc.password ).digest( 'hex' );
                    }
                    if (doc && doc.username === data.username && doc.password === data.password) {
                        delete doc.password;
                        cb({success: true, user: doc});
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

function addUnit(docid, data, cb) {
    addUnits(docid, [data], cb);
}

function addUnits(docid, data, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }

    for ( var ix in data ) {
        for ( var field in data[ix] ) {
            if ( !fields[field] ) {
                delete data[ix][field];
            }
        }
    }

    function doTheRest(_id) {
        if (_id != null) {
            _id = ''+_id;
        } else {
            _id = docid;
        }
        withDb(function (db, finish) {
            db.collection(''+_id, function (err, col) {
                if (err != null) {
                    console.log(err);
                }
                if (col != null) {
                    col.insert(data, {safe: true}, function (err, doc) {
                        finish();
                        if (err != null) {
                            cb(null);
                            console.log(err);
                        }
                        else {
                            cb(doc);
                            updateDocCount( '' + _id, function () {
                            });
                            for (ux in doc) {
                                addToChanges(_id, doc._id, doc);
                            }
                        }
                    });
                }
            });
        });
    }

    if (docid == cols.units) {
        doTheRest('units');
    } else {
        getDoc(docid, doTheRest);
    }
}

function updateDocCount(doc, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    listHierarchy( doc, false, function ( list, locs, loccodes, nodes ) {
        var doccount = 0;
        for ( var ix in nodes ) {
            doccount += 1;
        }
        changeDoc( doc, { count: doccount }, function () {
            cb();
        } );
    });
}

function emptyCollection(name, cb) {
    name = name || 'units';
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }

    getDoc(name, function (_id) {
        if (_id == null) {
            cb(null, false);
        } else {
            withDb(function (db, finish) {
                db.collection(''+_id, function (err, col) {
                    if (col != null) {
                        col.remove({}, {safe: true}, function (err, count) {
                            finish();
                            cb(err, true);
                        });
                    } else {
                        finish();
                        cb(err, false);
                    }
                });
            });
        }
    });
}

function dropCollection(name, cb) {
    name = name || 'units';
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    withDb(function (db, finish) {
        db.collection(cols[name], function (err, col) {
            if (col != null) {
                col.drop(function () {
                    finish();
                    cb();
                });
            } else {
                finish();
                cb();
            }
        });
    });
}

function listDocs(cb) {
    withDb(function (db, finish) {
        db.collection(cols.docs, function (err, col) {
            col.find({$or: [{trashed: 0}, {trashed: {$exists: false}}]}).toArray(function (err, docs) {
                finish();
                cb(docs);
            });
        });
    });
}

function getDoc(did, cb) {
    if (did in cols) {
        cb(cols[did]);
        return;
    }
    if (typeof did == typeof 'string' && (did.length == 12 || did.length == 24)) {
        did = new ObjectId(did);
    } else if (typeof did != typeof new ObjectId()) {
        cb(null);
        return;
    }
    withDb(function (db, finish) {
        db.collection(cols.docs, function (err, col) {
            if (err != null) {
                finish();
                console.log(err);
                cb(null);
            } else {
                col.findOne({_id: did}, function (err, doc) {
                    finish();
                    if (err != null) {
                        console.log(err);
                        cb(null);
                    }
                    else if (doc != null) {
                        cb(doc._id, doc.name, doc.date);
                    } else {
                        cb(null);
                    }
                });
            }
        });
    });
}

function createDoc(name, date, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    withDb(function (db, finish) {
        db.collection(cols.docs, function (err, col) {
            if (err != null) {
                finish();
                console.log(err);
                cb(null);
            } else {
                col.insert([{date: date, name: name, created: (new Date()).getTime()}], {safe: true}, function (err, doc) {
                    finish();
                    if (err != null) {
                        console.log(err);
                        cb(null);
                    } else {
                        createCollection(''+doc[0]._id, function (err) {
                            if (err != null) {
                                console.log(err);
                                cb(null);
                            } else {
                                createCollection(''+doc[0]._id+'_changes', function (err) {
                                    if (err != null) {
                                        console.log(err);
                                    }
                                    cb(doc[0]._id, doc[0]);
                                });
                            }
                        });
                    }
                });
            }
        });
    });
}

function copyDoc(orig, dest, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    console.log('Database: Copying ' + orig + ' to ' + dest);
    function doTheRest(_id, _newid) {
        listHierarchy(_id, true, function (list, locs, loccodes, dunits) {
            var unitdata = [];
            for (var lx in dunits) {
                if (!(dunits[lx]._id instanceof ObjectId)) {
                    dunits[lx]._id = new ObjectId(dunits[lx]._id);
                }
                unitdata.push(dunits[lx]);
            }
            addUnits(_newid, unitdata, function (err) {
                listDocs(function (doclist) {
                    var doc = null;
                    for ( var dx in doclist ) {
                        if ( '' + doclist[dx]._id == '' + _newid ) {
                            doc = doclist[dx];
                            break;
                        }
                    }
                    cb(doc);
                } );
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

function changeDoc(doc, changes, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    for ( var field in changes ) {
        if ( !dfields[field] ) {
            delete changes[field];
        }
    }
    getDoc(doc, function (_id) {
        withDb(function (db, finish) {
            db.collection(cols.docs, function (err, col) {
                if ( err != null ) {
                    finish();
                    console.log( err );
                    cb();
                }
                col.update({_id: _id}, {$set: changes}, function (err, doc) {
                    if ( err != null ) {
                        console.log( err );
                    }
                    finish();
                    cb();
                });
            });
        });
    });
}

function listAllChanges(doc, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    getDoc(doc, function (_id) {
        withDb(function (db, finish) {
            db.collection(''+_id+'_changes', function (err, col) {
                col.find().toArray(function (err, docs) {
                    finish();
                    if (err != null) {
                        console.log(err);
                    }
                    cb(docs);
                });
            });
        });
    });
}

function closeAll() {
    withDb(function (db, finish) {
        console.log( 'closing all....' );
        finish();
    });
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
exports.changeDoc = changeDoc;

exports.listAllChanges = listAllChanges;
