const db = require('../../config/db_wrapper');

const Packages = {};

Packages.getAll = async () => {
  const packages = await db.query("SELECT * FROM subscription_packages ORDER BY id DESC");
  return packages;
}

Packages.addData = async (name, price, iap) => {
  return await db.execute(`INSERT INTO subscription_packages (name, price, iap) VALUES (?, ?, ?)`, [name, price, iap]);
}

Packages.delete = async (id) => {
  const result = await db.execute(`DELETE FROM subscription_packages WHERE id = ?`, [id]);
  return result;
}

module.exports = Packages;
