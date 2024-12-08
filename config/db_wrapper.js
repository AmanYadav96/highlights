const mysql = require('mysql2/promise');
const config = require('./config');

class Database {
  constructor(config) {
    this.pool = mysql.createPool(config);
    if (!Database.instance) {
      console.log("Instantiating new database"); 
    //   this.connection = // create connection;
      Database.instance = this;
    }
    return Database.instance;
  }

  async query(sql, args) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query(sql, args);
      return rows;
    } finally {
      connection.release();
    }
  }

  async execute(sql, args) {
    const connection = await this.pool.getConnection();
    try {
      const [result] = await connection.execute(sql, args);
      return result;
    } finally {
      connection.release();
    }
  }
}

module.exports = new Database({
  host: config.dbConfig.dbHost,
  user: config.dbConfig.dbUsername,
  password: config.dbConfig.dbPassword,
  database: config.dbConfig.dbName,
  port: config.dbConfig.dbPort,
  charset: 'utf8mb4'
});
