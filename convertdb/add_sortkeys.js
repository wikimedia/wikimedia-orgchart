/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var db = require( '../lib/database' ),
	document = require( '../lib/Document' ),
	async = require( 'async' );

console.log( 'Adding sortkey fields everywhere....' );
var currentIndex = {};
document.listDocs( function ( docs ) {
	for ( var dx in docs ) {
		var doc = docs[dx];
		currentIndex[doc._id] = {};
		document.listHierarchy( doc._id, false, function ( docid, units ) {
			var fns = [];
			for ( var ux in units ) {
				var unit = units[ux];
				if ( !unit.supervisor ) {
					continue;
				}

				if ( currentIndex[docid][unit.supervisor] === undefined ) {
					currentIndex[docid][unit.supervisor] = 0;
				}

				fns.push( function ( thisunit, index, cb ) {
					db.withCol( docid, function ( col, finish ) {
						col.update( { _id: thisunit._id }, { $set: { sortkey: index } }, function () {
							finish();
							cb( null );
						} );
					} );
				}.bind( null, unit, currentIndex[docid][unit.supervisor]++ ) );
			}
			async.series( fns, function () {
				console.log( 'Done! Probably!' );
			} );
		}.bind( null, doc._id ) );
	}
} );
