const commentModel = require('../../models/transactions/transactions_models');

exports.getTransactionsData = async (req, res) => {
  const data = await commentModel.getTransactionsData();
  // console.log(data)
  res.render('pages/transactions', data);
}

exports.getFetchTransactionsData = async (req, res) => {
  const data = await commentModel.getMoreTransactionsData(req.query['from']);
  res.send(data);
}


exports.postDeleteTransaction = async (req, res) => {
  if (req.session.user.power == 0) {
    res.send({ status: 'success', message: 'You are on a demo account. Changes were not applied.' });
    return;
  }
  userData = req.body;
  await commentModel.deleteTransactions(userData.id);
  res.send({ status: 'success', message: 'Tranasction has been deleted successfully!' });
}