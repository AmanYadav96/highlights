// verification-request-model.js

const db = require('../../config/db_wrapper');

exports.getVerificationRequestData = async () => {
  const verificationRequest = await db.query("SELECT v.*, u.name, u.profilePicture FROM verification_requests v JOIN users u ON v.user_id = u.id LIMIT 20");
  return { verificationRequest };
}

exports.getFetchVerificationRequestData = async (from) => {
  const verificationRequest = await db.query("SELECT v.*, u.name, u.profilePicture FROM verification_requests v JOIN users u ON v.user_id = u.id LIMIT ?, 50", [parseInt(from)]);
  return { verificationRequest };
}

exports.getVerificationRequestDetails = async (id) => {
  const verDetails = await db.query(`SELECT v.*, u.name, u.profilePicture FROM verification_requests v JOIN users u ON v.user_id = u.id WHERE v.id = ?`, [id]);
  return verDetails[0];
}

exports.getBankDetails = async (id) => {
  const bankDetails = await db.query(`SELECT * FROM creator_info WHERE user_id = ?`, [id]);
  return bankDetails[0];
}

exports.updateVerificationRequestDetails = async (message, status, id) => {
  await db.execute(`UPDATE verification_requests SET verificationMessage = ?, status = ? WHERE id = ?`, [message, status, id]);        
}

exports.updateUserVerificationRequestDetails = async (userId) => {
  console.log(userId)
  await db.execute(`UPDATE users SET isVerified = 1, isCreator = 1 WHERE id = ?`, [userId]);        
}

exports.updateUserVerificationRequestDetail = async (id) => {
  console.log(id)
  await db.execute(`UPDATE users SET isVerified = 0, isCreator = 0 WHERE id = ?`, [id]);        
}
