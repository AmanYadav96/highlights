const db = require('../../config/db_wrapper');


exports.getGiftsData = async () => {
  const gifts = await db.query("SELECT g.*, f.name FROM gifts g JOIN gift_categories f ON g.category_id = f.id");
  const giftCategories = await db.query("SELECT * FROM gift_categories;");
  return { gifts, giftCategories };
}

exports.addGift = async (giftCategory, giftUrl, coins, levelLimit, svgaUrl) => {
  await db.execute(`INSERT INTO gifts (category_id, giftPicture, giftCoin, levelLimit, svgaUrl) VALUES (?, ?, ?, ?, ?)`, [giftCategory, giftUrl, coins, levelLimit, svgaUrl]);
}

exports.deleteGift = async (id) => {
  await db.execute(`DELETE FROM gifts WHERE id = ?`, [id]);
}

exports.postUpdateGift = async (coins, levelLimit, id, res) => {
  console.log(coins, levelLimit, id);

    await db.execute('UPDATE gifts SET giftCoin = ?, levelLimit = ? WHERE id = ?', [coins, levelLimit, id]);

};

