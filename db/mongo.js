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
    notes: true,
	sortkey: true
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

var withCol = function () {
	var extraCallbacks = {};
	return function ( colname, cb, ignoreLoaded ) {
		if ( extraCallbacks[colname] !== undefined ) {
			extraCallbacks[colname].push( cb );
		} else {
			extraCallbacks[colname] = [];
			withDb( function ( db, finish ) {
				db.collection( colname, function ( err, col ) {
					if ( err !== null || col === null ) {
						console.log( err );
						finish();
						cb( null );
					} else {
						function callOthers () {
							if ( extraCallbacks[colname].length > 0 ) {
								extraCallbacks[colname].pop()( col, callOthers );
							} else {
								delete extraCallbacks[colname];
								finish();
							}
						}

						cb( col, callOthers );
					}
				} );
			} );
		}
	};
}();

function getObjId( str ) {
	if ( typeof str === 'string' && str.length === 24 ) {
		return ObjectId( str );
	} else if ( str instanceof ObjectId ) {
		return str;
	} else {
		return null;
	}
}

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

function findAndRemove( docid, con, cb ) {
	docid = '' + docid;
    if ( typeof cb !== 'function' ) {
        cb = function () {};
    }

    var unitid = false;
    if ( typeof con !== 'object' ) {
		unitid = con;
        con = { _id: { $in: [ con, getObjId( con ) ] } };
    }

	function doTheRest( unitobj ) {
		withCol( docid, function ( col, finish ) {
			col.remove( con, { safe: true }, function ( err, num ) {
				finish();
				updateDocCount( docid );
				if ( unitid ) {
					addToChanges( docid, unitid, { action: 'delete', was: unitobj } );
				}
				cb();
			} );
		} );
	}

	if ( unitid ) {
		getUnit( docid, unitid, doTheRest );
	} else {
		doTheRest();
	}
}

function listHierarchy(docid, canSeePrivateData, cb) {
    function doTheRest( doc ) {
        var colname;
		var _id = '' + doc._id,
			docname = doc.name;
		withCol( _id, function ( col, finish ) {
			if ( col === null) {
				cb( [] );
			} else {
				col.find().sort( { sortkey: 1 } ).toArray(function (err, docs) {
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
    }

    getDocEntry( docid, doTheRest );
}

function getUnit( docid, uid, cb ) {
    looking += 1;
	withCol( docid, function( col, finish ) {
		if ( col === null ) {
			cb( null );
		} else {
			col.findOne( { _id: { $in: [ getObjId( uid ), uid ] } }, {}, function (err, doc) {
				finish();
				looking -= 1;
				if (cb && typeof cb == 'function') {
					if (doc && doc._id) {
						doc.index = doc._id;
					}
					cb(doc);
				}
			});
		}
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

	withCol( _id + '_changes', function ( col, finish ) {
		if ( col === null ) {
			cb(null);
		} else {
			col.insert({unit: uid, mods: mods, time: new Date().getTime()}, {safe: true}, function (err, doc) {
				finish();
				if (err !== null) {
					cb(null);
					console.log(err);
				} else {
					cb(doc);
				}
			});
		}
	});
}

function changeUnit(docid, uid, mods, cb) {
	docid = '' + docid;
    getUnit( docid, uid, function ( doc ) {
        var modDic = {$set:{}};
		var sortkey = false;
        for (var ix in mods) {
            if (ix == 'supervisor') {
                try {
                    mods[ix] = new ObjectId(mods[ix]);
                } catch (err) {
                    delete mods[ix];
                }
            }
			if ( ix === 'sortkey' ) {
				sortkey = true;
				break;
			}
            if ((!doc[ix] && mods[ix] && mods[ix] != '') || mods[ix] !== doc[ix]) {
                modDic.$set[ix] = mods[ix];
            }
        }

		withCol( docid, function ( col, finish ) {
			if ( col === null) {
				cb( null );
				return;
			}
			if (uid != null && typeof uid == typeof 'string' && (uid.length == 12 || uid.length == 24)) {
				uid = new ObjectId(uid);
			}
			if ( sortkey === true ) {
				var sk = mods.sortkey;
				col.update(
					{ sortkey: { $gt: doc.sortkey }, supervisor: doc.supervisor },
					{ $inc: { sortkey: -1 } },
					{ multi: true },
					function ( err ) {
						col.update(
							{ sortkey: { $gte: sk }, supervisor: doc.supervisor },
							{ $inc: { sortkey: 1 } },
							{ multi: true },
							function ( err ) {
								col.update(
									{ _id: { $in: [ uid, '' + uid ] } },
									{ $set: { sortkey: Number( sk ) } },
									{},
									function ( err ) {
										finish();
										cb( doc || null );
										if ( err !== null ) {
											console.log( err );
										}
									}
								);
							}
						);
					}
				);
			} else {
				col.update( { _id: { $in: [ getObjId( uid ), uid ] } }, modDic, { new: true }, function ( err, doc ) {
					finish();
					if ( cb && typeof cb === 'function' ) {
						cb( doc );
					}
					if ( err !== null ) {
						console.log( err );
					}
				});
			}
		});
		addToChanges( docid, uid, modDic.$set );
	});
}

function addUser(data, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
	withCol( cols.users, function ( col, finish ) {
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
}

function checkLogin(data, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    if (data && data.username && data.password) {
		withCol( cols.users, function ( col, finish ) {
			if ( col === null) {
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
    } else {
        cb({success: false});
    }
}

function getCurrentSortKeys( docid, cb ) {
	withCol( docid, function ( col, finish ) {
		col.find( {}, { sortkey: 1, supervisor: 1 } ).sort( { sortkey: -1 } ).toArray( function ( err, units ) {
			var startKeys = {};
			var unit;
			for ( var ux = 0; ux < units.length; ux++ ) {
				unit = units[ux];
				// We only need to set the startKey if we haven't yet
				// because we reverse-sorted the collection query result.
				if ( startKeys['' + unit.supervisor] === undefined ) {
					if ( unit.sortkey === undefined ) {
						unit.sortkey = 0;
					}
					startKeys['' + unit.supervisor] = unit.sortkey;
				}
			}
			finish();
			cb( startKeys );
		} );
	} );
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
            if ( !fields[field] && field !== '_id' ) {
                delete data[ix][field];
            }
        }
    }

    function doTheRest( startSortKey ) {
		for ( var dx = 0; dx < data.length; dx++ ) {
			if ( data[dx].supervisor && startSortKey[data[dx].supervisor] !== undefined ) {
				data[dx].sortkey = ++startSortKey['' + data[dx].supervisor];
			} else {
				startSortKey['' + data[dx].supervisor] = 0;
				data[dx].sortkey = 0;
			}
		}

		withCol( docid, function ( col, finish ) {
			if ( col !== null ) {
				col.insert( data, { w: 1 }, function (err, doc) {
					finish();
					if (err != null) {
						cb(null);
						console.log(err);
					}
					else {
						cb(doc);
						updateDocCount( docid, function () {} );

						for (ux in doc) {
							addToChanges( docid, doc[ux]._id, doc[ux]);
						}
					}
				} );
			} else {
				cb( null );
			}
		});
    }

	getCurrentSortKeys( docid, doTheRest );
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

	withCol( name, function ( col, finish ) {
		if (col !== null) {
			col.remove({}, {safe: true}, function (err, count) {
				finish();
				cb(err, true);
			});
		} else {
			cb(err, false);
		}
	});
}

function dropCollection(name, cb) {
    name = name || 'units';
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
	withCol( cols[name], function( col, finish ) {
		if (col !== null) {
			col.drop(function () {
				finish();
				cb();
			});
		} else {
			cb();
		}
	});
}

function getDocEntry( _id, cb ) {
	withCol( cols.docs, function ( col, finish ) {
		var con = { _id: _id };
		if ( _id instanceof ObjectId ) {
			con = { $or: [ { _id: '' + _id }, con ] };
		} else {
			con = { $or: [ { _id: new ObjectId( _id ) }, con ] };
		}

		col.findOne( con, function ( err, doc ) {
			finish();
			if ( err !== null ) {
				console.log( err );
				cb( null );
			} else {
				cb( doc );
			}
		} );
	} );
}

function listDocs(cb, showDeleted) {
	withCol( cols.docs, function ( col, finish ) {
		var cond = showDeleted ? {} : {$or: [{trashed: 0}, {trashed: {$exists: false}}]};
		col.find(cond).toArray(function (err, docs) {
			finish();
			cb(docs);
		});
	});
}

function createDoc(name, date, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
	withCol( cols.docs, function ( col, finish ) {
		if ( col === null) {
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
}

function copyDoc(orig, dest, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    console.log('Database: Copying ' + orig + ' to ' + dest);
    function doTheRest(_id, _newid) {
		_newid = '' + _newid;
        listHierarchy( _id, true, function ( list, locs, loccodes, dunits ) {
            var unitdata = [];
            for ( var lx in dunits ) {
                if (!(dunits[lx]._id instanceof ObjectId)) {
                    dunits[lx]._id = new ObjectId(dunits[lx]._id);
                }
                unitdata.push(dunits[lx]);
            }
            addUnits( _newid, unitdata, function (err) {
				getDocEntry( _newid, function ( doc ) {
					if ( doc === null ) {
						cb( null );
					} else {
						if ( !doc.count ) {
							doc.count = 0;
						}
                	    cb( doc );
					}
                } );
            } );
        } );
    }

	getDocEntry( orig, function ( doc ) {
		createDoc( dest, doc.date, doTheRest.bind( null, orig ) );
	} );
}

function changeDoc(docid, changes, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
    for ( var field in changes ) {
        if ( !dfields[field] ) {
            delete changes[field];
        }
    }
	withCol( cols.docs, function ( col, finish ) {
		if ( col === null ) {
			cb();
		} else {
			var con = { _id: { $in: [ docid, getObjId( docid ) ] } };
			col.update( con, { $set: changes }, function ( err, doc ) {
				if ( err != null ) {
					console.log( err );
				}
				finish();
				cb();
			} );
		}
	} );
}

// Don't use this for frontend-style deletion.
function deleteDoc( docid, cb ) {
	withCol( docid, function ( col, finish ) {
		if ( col === null ) {
			finish();
			cb();
		} else {
			col.drop( function ( err ) {
				withCol( cols.docs, function ( col, finish ) {
					if ( col === null ) {
						cb();
					} else {
						col.remove( { _id: { $in: [ docid, getObjId( docid ) ] } }, function ( err ) {
							finish();
							cb();
						} );
					}
				} );
				finish();
			} );
		}
	} );
}

function listAllChanges(doc, cb) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }
	withCol( docid + '_changes', function ( col, finish ) {
		if ( col === null ) {
			cb( [] );
		} else {
			col.find().toArray(function (err, docs) {
				finish();
				if (err != null) {
					console.log(err);
				}
				cb(docs);
			});
		}
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
exports.listDocs = listDocs;
exports.changeDoc = changeDoc;
exports.deleteDoc = deleteDoc;

exports.listAllChanges = listAllChanges;

exports.withDb = withDb;

