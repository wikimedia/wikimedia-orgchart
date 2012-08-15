var db = require('../db/mongo.js');

db.listDocs(function (docs) {
    for (dx in docs) {
        var doc = docs[dx];
        db.listAllChanges(doc._id, function (changes) {
            console.log(changes);
        });
    }
});
