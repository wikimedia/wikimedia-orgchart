/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var document = require( '../lib/Document' );

document.listDocs( function ( docs ) {
    for ( var dx in docs ) {
        document.deleteDoc( '' + docs[dx]._id, function () {
            console.log( 'Done' );
        } );
    }
}, true );
