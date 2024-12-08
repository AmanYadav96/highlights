const db = require('../../config/db_wrapper');

const Packages = {};

Packages.getAll = async () => {
  const packages = await db.query("SELECT * FROM tips ORDER BY id DESC");
  return packages;
}

Packages.addData = async (icon, amount, code) => {
  return await db.execute(`INSERT INTO tips (icon, amount, iap_code) VALUES (?, ?, ?)`, [icon, amount, code]);
}

Packages.delete = async (id) => {
  const result = await db.execute(`DELETE FROM tips WHERE id = ?`, [id]);
  return result;
}

module.exports = Packages;
