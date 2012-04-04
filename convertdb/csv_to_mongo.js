/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var csvdb = require('../db/csv'),
mongodb = require('../db/mongo');

var dbtaken = false;

csvdb.listHierarchy(function (list) {
    function loadIntoNew(oldix, supervisor) {
        if (dbtaken) {
            setTimeout(function () { loadIntoNew(oldix, supervisor); }, 200);
            return;
        }
        dbtaken = true;
        csvdb.getUnit(oldix, function (unit) {
            unit.supervisor = supervisor;
            mongodb.addUnit(unit, function (doc) {
                doc = doc.pop();
                dbtaken = false;
                if (list[oldix] && list[oldix].length) {
                    for (var ix in list[oldix]) {
                        loadIntoNew(list[oldix][ix], doc._id);
                    }
                }
            });
        });
    }
    for (var ix in list.none) {
        loadIntoNew(list.none[ix], '');
    }
});
