import { MongoClient } from 'mongodb';

// Mongobd cline class
class DBClient {
  // constructor to create new connection
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;
    
    this.client = new MongoClient(url, { useUnifiedTopology: true, useNewUrlParser: true });
    this.client.connect()
  }

  // check if connection is alive
  isAlive() {
    return this.client.isConnected();
  }

  // returns the number of documents in the collection users
  async nbUsers() {
    const users = this.client.db().collection('users');
    const usersNumber = await users.countDocuments();
    return usersNumber;
  }

  // returns the number of documents in the collection files
  async nbFiles() {
    const files = this.client.db().collection('files');
    const filesNumber = await files.countDocuments();
    return filesNumber;
  }
}

export const dbClient = new DBClient();
export default dbClient;
