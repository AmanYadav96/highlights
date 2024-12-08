const db = require('../../config/db_wrapper');
const config = require('../../config/config');

const Sticker = {};

Sticker.getAll = async () => {
  const stickers = await db.query("SELECT * FROM stickers");
  return stickers;
}

Sticker.create = async (title, iconUrl, packUrls) => {
  let query, values;
  query = `INSERT INTO stickers (title, icon, icon_pack) VALUES (?, ?, ?);`;
  values = [title, iconUrl, packUrls];
  const result = await db.execute(query, values);
  return result;
}

Sticker.delete = async (id) => {
  const result = await db.execute(`DELETE FROM stickers WHERE id = ?`, [id]);
  return result;
}

module.exports = Sticker;
