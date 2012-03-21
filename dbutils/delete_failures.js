var mongo = require('../db/mongo');

mongo.findAndRemove({status: {$exists: false}});
