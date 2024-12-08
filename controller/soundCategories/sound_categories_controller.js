const soundCategoryModel = require('../../models/soundCategories/sound_categories_models');

exports.getSoundCategoryData = async (req, res) => {
  const data = await soundCategoryModel.getSoundCategoryData();
  res.render('pages/sound_categories', data);
}

exports.postAddSoundCategory = async (req, res) => {
  userData = req.body;
  console.log(userData);
  await soundCategoryModel.addSoundCategory(userData.name, req.file);
  res.send({ status: 'success', message: 'Your data has been inserted successfully!' });
}

exports.postDeleteSoundCategory = async (req, res) => {
  userData = req.body;
  await soundCategoryModel.deleteSoundCategory(userData.id);
  res.send({ status: 'success', message: 'Your user has been deleted successfully!' });
}
