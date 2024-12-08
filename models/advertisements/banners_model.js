const db = require('../../config/db_wrapper');
const config = require('../../config/config');

const Banners = {};

Banners.getAll = async () => {
  const bnrs = await db.query("SELECT * FROM banners");
  return bnrs;
}

Banners.create = async (bannerUrl, bannerLink, bannerTitle) => {
const result = await db.execute(`INSERT INTO banners (imageUrl, link, title) VALUES (?, ?, ?)`, [bannerUrl, bannerLink, bannerTitle]);
return result;
}

Banners.delete = async (id) => {
  const result = await db.execute(`DELETE FROM banners WHERE id = ?`, [id]);
  return result;
}

module.exports = Banners;
