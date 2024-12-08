const db = require('../../config/db_wrapper');
const config = require('../../config/config');

const Level = {};

Level.getAll = async () => {
  const levels = await db.query("SELECT * FROM levels");
  return levels;
}

Level.create = async (levelData, iconUrl, badgeUrl) => {
  let query, values;
  query = `INSERT INTO levels (levelName, levelNumber, levelXP, levelIcon, levelColor, levelBadge) VALUES (?, ?, ?, ?, ?, ?);`;
  values = [levelData.name, levelData.number, levelData.levelXP, iconUrl, levelData.color, badgeUrl];
  const result = await db.execute(query, values);
  return result;
}

Level.edit = async (id, levelName, levelNumber, levelXP) => {
  const result = await db.execute(`UPDATE levels set levelName = ?, levelNumber = ?, levelXP = ? WHERE id = ?`, [levelName, levelNumber, levelXP, id]);
  return result;
}

Level.delete = async (id) => {
  const result = await db.execute(`DELETE FROM levels WHERE id = ?`, [id]);
  return result;
}

module.exports = Level;
