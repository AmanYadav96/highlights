// featured-user-model.js

const db = require('../../config/db_wrapper');

exports.getFeaturedUserData = async () => {
  const featuredUsers = await db.query("SELECT * FROM featured_users JOIN users ON featured_users.userId = users.id ");
  return { featuredUsers };
}

exports.deleteFeaturedUser = async (userId) => {
  await db.execute(`UPDATE users SET isVerified = 0, isCreator = 0 WHERE id = ?`, [userId]);
  await db.execute(`DELETE FROM featured_users WHERE userId = ?`, [userId]);
};

exports.addFeaturedUser = async (userId) => {
  console.log(userId);
  await db.execute(`UPDATE users SET isVerified = 1, isCreator = 1 WHERE id = ?`, [userId]);
  await db.execute(`INSERT INTO featured_users (userId) VALUES (?)`, [userId]);
};





