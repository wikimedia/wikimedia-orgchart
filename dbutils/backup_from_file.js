/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var db = require( '../lib/database' );
var document = require( '../lib/Document' );
var json = require('JSON');
var fs = require('fs');
var bakfile = 'db_backup.json';

if (process && process.argv && process.argv.length > 2) {
    bakfile = process.argv[2];
}

fs.readFile(bakfile, function (err, file) {
	var name, fdbn;
    var fdata = json.parse(file);
    console.log('Backing up to database....');
   	function doTheRest( newdocid ) {
		var data = [];
		for (var dx in fdata.db[newdocid]) {
			data.push(fdata.db[newdocid][dx]);
		}
		console.log('    Adding ' + data.length + ' data to '+newdocid+'....');
		db.addUnits( newdocid, data, function (docs) {
			console.log('    Backed up document ' + newdocid + '.');
		});
	}

	for (var ix in fdata.list) {
		fdbn = ix;
		name = fdata.list[fdbn].name;
		document.deleteDoc( fdbn, document.createDoc.bind( null, db.getObjId( fdbn ), name, null, doTheRest.bind( null, fdbn ) ) );
    }
});
