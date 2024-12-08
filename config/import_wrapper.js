const mysql = require('mysql2/promise');
const fs = require('fs');
const config = require("./config");
const path = require('path');

class ImportWrapper {
  constructor(mysqlConfig) {
    this.mysqlConfig = mysqlConfig;
    this.connection = null;
  }

  async testConnection() {
    try {
      this.connection = await mysql.createConnection(this.mysqlConfig);
      await this.connection.ping();
      console.log('MySQL connection is valid.');
      return true;
    } catch (err) {
      console.error('MySQL connection is not valid.');
      return false;
    } finally {
      if (this.connection) await this.connection.end();
    }
  }

  async importSQLFile() {
    try {
      this.connection = await mysql.createConnection(this.mysqlConfig);
      const sql = fs.readFileSync('./sql/database.sql').toString();
      const statements = sql.split(';');
      const historyPath = path.join('./sql', 'history.json');
      let history = {
        tables: []
      };
  
      // Read history file if it exists
      if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath));
      }
  
      console.log('Initiating imports...');
      for (let i = 0; i < statements.length; i++) {
        if (statements[i].trim() !== '') {
          const tableName = statements[i].match(/CREATE TABLE IF NOT EXISTS `(\w+)`/i)?.[1];
          if (tableName) {
            await this.connection.query(statements[i]);
            console.log(`SQL statement executed successfully: ${tableName}`);
            if(!history.tables.includes(tableName)){
              history.tables.push(tableName);
            }
          } else {
            console.log(`Table ${tableName} already exists, executing alter table statement...`);
            await this.connection.query(statements[i]);
          }
        }
      }

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
      console.log(`History file updated successfully: ${historyPath}`);
      return true;
    } catch (err) {
      console.error('Error while importing SQL file:', err);
      return false;
    } finally {
      if (this.connection && typeof this.connection.end === 'function') {
        await this.connection.end();
      }
    }
  }
  
}

// Example usage
module.exports = new ImportWrapper({
    host: config.dbConfig.dbHost,
    user: config.dbConfig.dbUsername,
    password: config.dbConfig.dbPassword,
    database: config.dbConfig.dbName,
    port: config.dbConfig.dbPort
  });