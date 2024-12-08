// comment-model.js

const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');

exports.getTransactionsData = async () => {
  const transactions = await db.query("SELECT t.*, u.name, u.profilePicture FROM transaction_history t JOIN users u ON t.user_id = u.id ORDER BY t.creationTime DESC LIMIT 20");
  for (let i = 0; i < transactions.length; i++) {
      const element = transactions[i];
      const creationTime = utils.formatDateTime(element.creationTime);
      let sender, receiver;
      const transactionType = JSON.parse(element.transaction_metadata).type ?? 0;
      const userId = JSON.parse(element.transaction_metadata).user ?? 0;
      const userReceiver = userId > 0 ? await db.execute(`SELECT id, name, profilePicture from users WHERE id = ?`, [userId]) : {};
      element.creationTime = creationTime;
      element.userReceiver = userReceiver[0];
  }
  console.log(transactions)
  return { transactions };
}


exports.getMoreTransactionsData = async (from) => {
  const transactions = await db.query("SELECT t.*, u.name, u.profilePicture FROM transaction_history t JOIN users u ON t.user_id = u.id ORDER BY t.creationTime DESC LIMIT ?, 50", [parseInt(from)]);
  for (let i = 0; i < transactions.length; i++) {
      const element = transactions[i];
      const creationTime = utils.formatDateTime(element.creationTime);
      element.creationTime = creationTime;
  }
  return { transactions };
}

exports.deleteTransactions = async (id) => {
  await db.execute(`DELETE FROM transaction_history WHERE id = ?`, [id]);
}
