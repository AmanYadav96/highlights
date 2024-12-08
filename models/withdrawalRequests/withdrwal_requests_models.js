const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');

exports.getWithdrawalRequestData = async () => {
  const verificationRequest = await db.query("SELECT v.*, u.name, u.profilePicture FROM withdrawal_requests v JOIN users u ON v.user_id = u.id LIMIT 20");
  for (let i = 0; i < verificationRequest.length; i++) {
    const element = verificationRequest[i];
    const time = utils.formatDateTime(element.time);
    element.time = time;
}
  return { verificationRequest };
}

exports.getFetchWithdrawalRequestData = async (from) => {
  const verificationRequest = await db.query("SELECT v.*, u.name, u.profilePicture FROM withdrawal_requests v JOIN users u ON v.user_id = u.id LIMIT ?, 50", [parseInt(from)]);
  for (let i = 0; i < verificationRequest.length; i++) {
    const element = verificationRequest[i];
    const time = utils.formatDateTime(element.time);
    element.time = time;
}
  return { verificationRequest };
}

exports.getVerificationRequestDetails = async (id) => {
  const verDetails = await db.query(`SELECT v.*, u.name, u.profilePicture FROM withdrawal_requests v JOIN users u ON v.user_id = u.id WHERE v.id = ?`, [id]);
  return { verDetails: verDetails[0] };
}

exports.updateVerificationRequestDetails = async (message, status, id, amount) => {
  await db.execute(`UPDATE withdrawal_requests SET amount = ?, message = ?, status = ? WHERE id = ?`, [amount, message, status, id]);   
  const userData = await db.execute(`SELECT * FROM withdrawal_requests WHERE id = ?`, [id]);
  if(status == 1) {
    const user = await db.execute(`SELECT * FROM users WHERE id = ?`, [userData[0].user_id]);
    return {
      status: 1,
      message: "Withdrawal request has been approved!",
      token : user[0].token,
      id: userData[0].user_id,
    };
  }
  else{
    const userData = await db.execute(`SELECT * FROM withdrawal_requests WHERE id = ?`, [id]);
    const user = await db.execute(`SELECT * FROM users WHERE id = ?`, [userData[0].user_id]);
    const newBalance = userData[0].gems;
    await db.execute(`UPDATE users SET gems = ? WHERE id = ?`, [newBalance, userData[0].user_id]);
    return {
      status: 2,
      message: "Withdrawal request has been rejected!",
      token : user[0].token,
      id: userData[0].user_id,
    };
  } 
}

exports.updateUserVerificationRequestDetails = async (id) => {
  await db.execute(`UPDATE users SET isVerified = 1 WHERE id = ?`, [id]);        
}

exports.updateUserVerificationRequestDetail = async (id) => {
  await db.execute(`UPDATE users SET isVerified = 0 WHERE id = ?`, [id]);        
}
