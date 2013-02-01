var db = require( '../lib/database' ),
	document = require( '../lib/Document' );

document.listDocs( function (docs) {
    for (dx in docs) {
        var doc = docs[dx];
        db.listAllChanges(doc._id, function (changes) {
            console.log(changes);
        });
    }
} );

