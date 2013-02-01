/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

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

var db = require( '../lib/database' ),
	document = require( '../lib/Document' ),
	json = require( 'JSON' ),
	fs = require('fs'),
	docd = [],
	docl = {},
	docdb = {},
	bakfile = 'db_backup.json';

if (process && process.argv && process.argv.length > 2) {
    bakfile = process.argv[2];
}

document.listDocs( function ( docs ) {
    for (var fx in docs) {
        docd.push(docs[fx]._id);
        docl['' + docs[fx]._id] = docs[fx];
    }
    for (var dx in docs) {
        document.listHierarchy( '' + docs[dx]._id, true, function (properId, list, locs, loccodes, units) {
            docdb['' + docs[properId]._id] = units;
            var ix = indexOf(docd, docs[properId]._id);
            docd.pop(properId);
            if (docd.length == 0) {
                fs.writeFile(bakfile, json.stringify({list: docl, db: docdb}), function () {
                    console.log('Backup complete.');
                });
            }
        }.bind( null, dx ) );
    }
});
