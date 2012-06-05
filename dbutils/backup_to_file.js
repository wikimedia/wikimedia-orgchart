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

var mongo = require('../db/mongo');
var json = require('JSON');
var fs = require('fs');
var docd = [];
var docl = {};
var docdb = {};

mongo.listDocs(function (docs) {
    for (var dx in docs) {
        docd.push(docs[dx]._id);
        docl[''+docs[dx]._id] = docs[dx];
    }
    for (var dx in docs) {
        mongo.listHierarchy(docs[dx]._id, function (list, locs, loccodes, units) {
            docdb[new String(docs[dx]._id)] = units;
            var ix = indexOf(docd, docs[dx]._id);
            docd.pop(ix);
            if (docd.length == 0) {
                fs.writeFile('db_backup.json', json.stringify({list: docl, db: docdb}), function () {
                    console.log('Backup complete.');
                    mongo.closeAll();
                });
            }
        });
    }
});
