/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var mongo = require('../db/mongo');
var json = require('JSON');
var fs = require('fs');

mongo.emptyCollection('units', function () {
    fs.readFile('db_backup.json', function (err, file) {
        var fdata = json.parse(file);
        var data = [];
        console.log('Backing up to database....');
        for (var ix in fdata) {
            data.push(fdata[ix]);
        }
        mongo.addUnits('units', data, function () {
            console.log('Backed up.');
        });
    });
});
