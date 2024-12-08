const bannersModel = require('../../models/advertisements/banners_model');
const mime = require('mime-types');
const upload_manager = require('../../config/upload_manager');

exports.getBannersData = async (req, res) => {
  const data = await bannersModel.getAll();
  res.render('pages/banners', {banners: data});
}

exports.addBanner = async (req, res) => {
  var userData = req.body;
  const bannerFile = req.file;

  const bannerUpload = await upload_manager.upload({ key: 'banners', fileReference: bannerFile.path, contentType: mime.lookup(bannerFile.path), fileName: bannerFile.filename });
  var bannerUrl = bannerUpload.Location;
  await bannersModel.create(bannerUrl, userData.bannerLink, userData.bannerTitle);

  // Return a response indicating that the files were successfully uploaded
  res.send({ status: 'success', message: 'Your banner has been uploaded successfully!' });
}

exports.deleteBanner = async (req, res) => {
  userData = req.body;
  await bannersModel.delete(userData.bannerId);
  res.send({ status: 'success', message: 'Your banner has been deleted successfully!' });
}