const giftCategoryModel = require('../../models/giftCategories/gift_categories_models');

exports.getGiftCategoryData = async (req, res) => {
  const data = await giftCategoryModel.getGiftCategoryData();
  res.render('pages/gift_catogories', data);
}

exports.postAddGiftCategory = async (req, res) => {
  userData = req.body;
  console.log(userData);
  await giftCategoryModel.addGiftCategory(userData.name, req.file);
  res.send({ status: 'success', message: 'Your data has been inserted successfully!' });
}

exports.postDeleteGiftCategory = async (req, res) => {
  userData = req.body;
  await giftCategoryModel.deleteGiftCategory(userData.id);
  res.send({ status: 'success', message: 'Your user has been deleted successfully!' });
}
