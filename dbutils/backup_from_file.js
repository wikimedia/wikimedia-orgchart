/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var mongo = require('../db/mongo');
var json = require('JSON');
var fs = require('fs');
var bakfile = 'db_backup.json';

if (process && process.argv && process.argv.length > 2) {
    bakfile = process.argv[2];
}

fs.readFile(bakfile, function (err, file) {
    var fdata = json.parse(file);
    console.log('Backing up to database....');
    var donelist = {};
    var stillWaiting = 0;
    for (var ix in fdata.list) {
        stillWaiting += 1;
        var fdbn = ix;
		function doTheRest() {
			mongo.emptyCollection(fdbn, function (err, wasthere) {
				function doTheFinal() {
					var data = [];
					for (var dx in fdata.db[fdbn]) {
						data.push(fdata.db[fdbn][dx]);
					}
					console.log('    Adding data to '+fdbn+'....');
					mongo.addUnits( fdbn, data, function (docs) {
						console.log('    Backed up document ' + ix + '.');
						stillWaiting -= 1;
						if (stillWaiting <= 0) {
							mongo.closeAll();
						}
					});
				}
				doTheFinal();
			});
		}

		mongo.deleteDoc( fdbn, mongo.createDoc.bind( null, fdbn, null, doTheRest ) );
    }
});
