const db = require('../../config/db_wrapper');
const config = require('../../config/config');

const Level = {};

Level.getAllData = async () => {
  const results = await db.query("SELECT * FROM level_xp");
  return results;
}

Level.create = async (xpValue, xpName) => {
  return await db.execute(`INSERT INTO level_xp (name, xp) VALUES (?, ?) ON DUPLICATE KEY UPDATE xp = VALUES(xp);`, [xpName, xpValue]);
}

Level.delete = async (xpValue, xpName) => {
  const result = await db.execute(`INSERT INTO level_xp (name, xp) VALUES (?, ?) ON DUPLICATE KEY UPDATE xp = VALUES(xp);`, [xpName, xpValue]);
  return result;
}

module.exports = Level;
