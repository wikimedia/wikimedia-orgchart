/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var db = require('../lib/database'),
	document = require( '../lib/Document.js' );

console.log('Making collections for changes....');
document.listDocs( function ( docs ) {
   for ( dx in docs ) {
      var doc = docs[dx];
      db.createCollection( '' + doc.name + '_changes', function ( err ) {
         console.log( 'Made it for ' + doc.name );
      } );
   }
} );

