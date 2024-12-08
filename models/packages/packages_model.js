const db = require('../../config/db_wrapper');

const Packages = {};

Packages.getAll = async () => {
  const packages = await db.query("SELECT * FROM coins ORDER BY id DESC");
  return packages;
}

Packages.addData = async (coins, price, iap) => {
  return await db.execute(`INSERT INTO coins (coins, price, iap) VALUES (?, ?, ?)`, [coins, price, iap]);
}

Packages.delete = async (id) => {
  const result = await db.execute(`DELETE FROM coins WHERE id = ?`, [id]);
  return result;
}

module.exports = Packages;
