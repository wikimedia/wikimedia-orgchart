var mgdb = require('mongodb');

var colors = ['#59c840','#aab31a','#3070ac','#886644'],
locs = {},
db = new mgdb.Db('orgcharts', new mgdb.Server('127.0.0.1', 27017, {})),
ObjectId = mgdb.ObjectID,
cols = {};

cols.units = 'units';

function listHierarchy(cb) {
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.find({}, {fields: {_id: true, supervisor: true}}).toArray(function (err, docs) {
                if (err != null) {
                    if (cb && typeof cb == 'function') {
                        cb([]);
                    }
                } else {
                    var list = {};
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
                    }
                    if (cb && typeof cb == 'function') {
                        cb(list);
                    }
                }
            });
        });
    });
}

function getUnit(uid, cb) {
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.findOne({_id: new ObjectId(uid)}, {}, function (err, doc) {
                if (cb && typeof cb == 'function') {
                    cb(doc);
                }
            });
        });
    });
}

function changeUnit(uid, mods, cb) {
    modDic = {$set:{}};
    for (var ix in mods) {
        modDic.$set[ix] = mods[ix];
    }
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.findAndModify({_id: new ObjectId(uid)}, [['_id', 1]], modDic, {new: true}, function (err, doc) {
                if (cb && typeof cb == 'function') {
                    cb(doc);
                }
            });
        });
    });
}

function addUnit(data, cb) {
    db.open(function (err, p_client) {
        db.collection(cols.units, function (err, col) {
            col.insert([data], {safe: true}, function (err, doc) {
                if (cb && typeof cb == 'function') {
                    cb(doc); // I don't know what gets sent here, but do it anyway!
                }
            });
        });
    });
}

exports.listHierarchy = listHierarchy;
