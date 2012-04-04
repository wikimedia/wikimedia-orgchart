/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var mongo = require('../db/mongo');
var json = require('JSON');
var fs = require('fs');

mongo.listHierarchy(function (list, locs, loccodes, units) {
    console.log('Writing to file....');
    fs.writeFile('db_backup.json', json.stringify(units), function () {
        console.log('File written.');
        mongo.closeAll();
    });
});
