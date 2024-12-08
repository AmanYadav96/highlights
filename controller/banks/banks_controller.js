const banksModel = require('../../models/banks/banks_model');

exports.getBanksData = async (req, res) => {
  const data = await banksModel.getBanksData();
  res.render('pages/banks', data);
}

exports.postAddBank = async (req, res) => {
  userData = req.body;
  console.log(userData);
  await banksModel.addBank(userData.name, req.file);
  res.send({ status: 'success', message: 'Bank has been inserted successfully!' });
}

exports.postDeleteBank = async (req, res) => {
  userData = req.body;
  await banksModel.deleteBank(userData.id);
  res.send({ status: 'success', message: 'Bank has been deleted successfully!' });
}
