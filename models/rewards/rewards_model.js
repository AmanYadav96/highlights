const db = require('../../config/db_wrapper');
const config = require('../../config/config');

const Level = {};

Level.getAllData = async () => {
  const results = await db.query("SELECT * FROM rewards");
  return results;
}

Level.create = async (code, coins) => {
  return await db.execute(`INSERT INTO rewards (country_code, coins) VALUES (?, ?)`, [code, coins]);
}

Level.delete = async (id) => {
  const reportDelete =  await db.execute(`DELETE FROM rewards WHERE id = ?`, [id]);
  return reportDelete;
}

module.exports = Level;
