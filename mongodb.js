import MongoClient from "mongodb";
// Replace the uri string with your MongoDB deployment's connection string.
const uri = 'mongodb://mongo:27017';

export default class MongoDB{
    constructor () {
    }
    async init () {
        const mongo = await new MongoClient(uri, {
            useUnifiedTopology: true
        });
        await mongo.connect();
        this.database = mongo.db('knl');
    }

    getCollection(name){
        return this.database.collection(name);
    }
}