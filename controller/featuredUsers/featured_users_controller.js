const featuredUserModel = require('../../models/featuredUsers/featured_users_models');

exports.getFeaturedUserData = async (req, res) => {
  const data = await featuredUserModel.getFeaturedUserData();
  res.render('pages/featured_users', data);
}

exports.postDeleteFeaturedUserData = async (req, res) => {
  userData = req.body;
  await featuredUserModel.deleteFeaturedUser(userData.id);
  res.send({ status: 'success', message: 'Your featured user has been deleted successfully!' });
}

exports.postAddFeaturedUserData = async (req, res) => {
  userData = req.body;
  await featuredUserModel.addFeaturedUser(userData.id);
  res.send({ status: 'success', message: 'Your featured user has been added successfully!' });
}

exports.postDeleteFeaturedUser = async (req, res) => {
  userData = req.body;
  await featuredUserModel.deleteFeaturedUser(userData.id);
  res.send({ status: 'success', message: 'Your featured user has been deleted successfully!' });
}
