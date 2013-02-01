/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var db = require( './database' ),
	constants = require( './Constants' ),

	colname = 'docs',

	locs = {},
	loccodes = {};

function listHierarchy(docid, canSeePrivateData, cb) {
    function doTheRest( doc ) {
		if ( doc === null ) {
			// There's no matching document, we can't very well do anything more
			cb( [], locs, loccodes );
			return;
		}
        var colname;
		var _id = '' + doc._id,
			docname = doc.name;
		db.withCol( _id, function ( col, finish ) {
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
							if (lx < constants.colors.length) {
								locs[csort[lx]] = constants.colors[lx];
							} else {
								locs[csort[lx]] = constants.colors[constants.colors.length-1];
							}
						}
						for (var lcx in lcsort) {
							if (lcx < constants.colors.length) {
								loccodes[lcsort[lcx]] = constants.colors[lcx];
							} else {
								loccodes[lcsort[lcx]] = constants.colors[constants.colors.length-1];
							}
						}

						locs.other = constants.colors[constants.colors.length-1];
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

    getDocEntry( '' + docid, doTheRest );
}

function listDocs( cb, showDeleted ) {
	db.withCol( colname, function ( col, finish ) {
		var cond = showDeleted ? {} : { $or: [ { trashed: 0 }, { trashed: { $exists: false } } ] };
		col.find( cond ).toArray( function ( err, docs ) {
			finish();
			cb(docs);
		} );
	} );
}

function updateDocCount( docid, cb ) {
    if ( !cb || typeof cb !== 'function' ) {
        cb = function () {};
    }

	docid = '' + docid;

    listHierarchy( docid, false, function ( list, locs, loccodes, nodes ) {
        var doccount = 0;
        for ( var ix in nodes ) {
            doccount += 1;
        }
        changeDoc( docid, { count: doccount }, function () {
            cb();
        } );
    } );
}

function getDocEntry( docid, cb ) {
	db.withCol( colname, function ( col, finish ) {
		var con = { _id: { $in: [ docid, db.getObjId( docid ) ] } };

		col.findOne( con, function ( err, doc ) {
			finish();
			if ( err !== null ) {
				console.log( err.stack );
				cb( null );
			} else {
				cb( doc );
			}
		} );
	} );
}

function deleteFromDocsCol( docid, cb ) {
	db.withCol( colname, function ( col, finish ) {
		if ( col === null ) {
			cb();
		} else {
			col.remove( { _id: { $in: [ docid, db.getObjId( docid ) ] } }, function ( err ) {
				if ( err ) {
					console.log( err.stack );
				}

				finish();
				cb();
			} );
		}
	} );
}

// Don't use this for frontend-style deletion.
function deleteDoc( docid, cb ) {
	db.withCol( docid, function ( col, finish ) {
		if ( col === null ) {
			finish();
			deleteFromDocsCol( docid, cb );
		} else {
			col.drop( function ( err ) {
				finish();
				if ( err ) {
					if ( err.errmsg === 'ns not found' ) {
						console.log( 'The collection ' + docid + ' was already deleted' );
					} else {
						console.log( err.stack );
					}
				}
				deleteFromDocsCol( docid, cb );
			} );
		}
	} );
}

function changeDoc( docid, changes, cb ) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }

    for ( var field in changes ) {
        if ( !constants.dfields[field] ) {
            delete changes[field];
        }
    }

	db.withCol( colname, function ( col, finish ) {
		if ( col === null ) {
			cb();
		} else {
			var con = { _id: { $in: [ docid, db.getObjId( docid ) ] } };
			col.update( con, { $set: changes }, function ( err, doc ) {
				if ( err != null ) {
					console.log( err.stack );
				}
				finish();
				cb();
			} );
		}
	} );
}

function createDoc( _id, name, date, cb ) {
    if (!cb || typeof cb != 'function') {
        cb = function () {};
    }

	db.withCol( colname, function ( col, finish ) {
		if ( col === null) {
			cb( null );
		} else {
			var newOne = { date: date, name: name, created: ( new Date() ).getTime() };
			if ( _id ) {
				newOne._id = _id;
			}

			col.insert( [ newOne ],
				{ safe: true },
				function ( err, doc ) {
				finish();
				if ( err ) {
					console.log( err.stack );
					cb( null );
				} else {
					db.createCollection( '' + doc[0]._id, function ( err ) {
						if ( err ) {
							console.log( err.stack );
							cb( null );
						} else {
							db.createCollection( '' + doc[0]._id + '_changes', function ( err ) {
								if ( err ) {
									console.log( err.stack );
								}
								cb( doc[0]._id, doc[0] );
							} );
						}
					} );
				}
			} );
		}
	} );
}

function copyDoc( orig, dest, cb ) {
    if ( !cb || typeof cb != 'function' ) {
        cb = function () {};
    }
	orig = '' + orig;

    console.log( 'Database: Copying ' + orig + ' to ' + dest );
    function doTheRest( _id, _newid ) {
		_newid = '' + _newid;
        listHierarchy( _id, true, function ( list, locs, loccodes, dunits ) {
            var unitdata = [];
            for ( var lx in dunits ) {
				dunits[lx]._id = db.getObjId( dunits[lx]._id );
                unitdata.push( dunits[lx] );
            }
            db.addUnits( _newid, unitdata, function ( err ) {
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
		createDoc( null, dest, doc.date, doTheRest.bind( null, orig ) );
	} );
}

exports.copyDoc = copyDoc;
exports.createDoc = createDoc;
exports.changeDoc = changeDoc;
exports.deleteFromDocsCol = deleteFromDocsCol;
exports.deleteDoc = deleteDoc;
exports.listHierarchy = listHierarchy;
exports.listDocs = listDocs;
exports.updateDocCount = updateDocCount;
exports.getDocEntry = getDocEntry;

exports.colname = colname;

