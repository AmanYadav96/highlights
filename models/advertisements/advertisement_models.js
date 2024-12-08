const db = require('../../config/db_wrapper');

exports.getAdsData = async () => {
  const advertisements = await db.query("SELECT * FROM adverts");
  return { advertisements };
}

exports.deleteAd = async (id) => {
  await db.execute(`DELETE FROM adverts WHERE id = ?`, [id]);
}
