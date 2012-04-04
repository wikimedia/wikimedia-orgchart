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
