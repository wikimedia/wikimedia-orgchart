/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var mongo = require('../db/mongo');
var json = require('JSON');
var fs = require('fs');

fs.readFile('db_backup.json', function (err, file) {
    var fdata = json.parse(file);
    console.log('Backing up to database....');
    var donelist = {};
    var stillWaiting = 0;
    for (var ix in fdata.list) {
        stillWaiting += 1;
        var fdbn = ix;
        mongo.getDoc(fdbn, function (_id) {
            function doTheRest() {
                mongo.emptyCollection(fdbn, function (err, wasthere) {
                    function doTheFinal() {
                        var data = [];
                        for (var dx in fdata.db[fdbn]) {
                            data.push(fdata.db[fdbn][dx]);
                        }
                        console.log('    Adding data to '+fdbn+'....');
                        mongo.addUnits(''+_id, data, function (docs) {
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
            
            if (_id == null) {
                mongo.createDoc(fdbn, function (_newid) {
                    _id = _newid;
                    doTheRest();
                });
            } else {
                doTheRest();
            }
        });
    }
});
