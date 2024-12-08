
const db = require('../../config/db_wrapper');

exports.getPostData = async () => {
  const communities = await db.query("SELECT p.*, u.name, u.profilePicture FROM posts p JOIN users u ON p.user_id = u.id LIMIT 20");
  return { communities };
}

exports.getFetchPostData = async (from) => {
  const communities = await db.query("SELECT p.*, u.name, u.profilePicture FROM posts p JOIN users u ON p.user_id = u.id LIMIT ?, 50", [parseInt(from)]);
  return { communities };
}

exports.deletePost = async (id) => {
  await db.execute(`DELETE FROM posts WHERE id = ?`, [id]);
}
