const giftModel = require('../../models/gifts/gifts_models');
const config = require('../../config/config');
const mime = require('mime-types');
const upload_manager = require('../../config/upload_manager');

exports.getGiftsData = async (req, res) => {
  const data = await giftModel.getGiftsData();
  res.render('pages/gifts', data);
}

exports.postAddGift = async (req, res) => {
  if (req.session.user.power == 0) {
    res.send( { status: 'success', message: 'You are on a demo account. Changes were not applied.' });
    return;
  }
  userData = req.body;

  console.log(req.files.giftSVGA, req.files)

  // Check if any files were uploaded
  if (!req.files || req.files.length === 0) {
    console.log("No files were uploaded.");
    return res.status(400).send({ message: 'No files were uploaded.' });
  }



  // Process each file in the array
    
  var iconUrl = "";
  if (req.files.picture) {
      var picture = req.files.picture[0];
      // Picture is uploaded
      const bannerUpload = await upload_manager.upload({ key: 'gifts', fileReference: picture.path, contentType: mime.lookup(picture.path), fileName: picture.filename });
      iconUrl = bannerUpload.Location;
  } 
    var svgaUrl = "";
    if (req.files.giftSVGA) {
        var badge = req.files.giftSVGA[0];
        console.log(req.files.giftSVGA)
        // Picture is uploaded
        const svgaUpload = await upload_manager.upload({ key: 'gifts', fileReference: badge.path, contentType: 'image/svg+xml', fileName: badge.filename });
        svgaUrl = svgaUpload.Location;
    } 

    await giftModel.addGift(userData.giftCategory, iconUrl, userData.coins, userData.levelLimit, svgaUrl);


  // Return a response indicating that the files were successfully uploaded
  res.send({ status: 'success', message: 'Your gift has been uploaded successfully!' });
}

exports.postDeleteGift = async (req, res) => {
  if (req.session.user.power == 0) {
    res.send( { status: 'success', message: 'You are on a demo account. Changes were not applied.' });
    return;
  }
  userData = req.body;
  await giftModel.deleteGift(userData.id);
  res.send({ status: 'success', message: 'Your gift has been deleted successfully!' });
}

exports.postEditGift = async (req, res) => {
  if (req.session.user.power == 0) {
    res.send( { status: 'success', message: 'You are on a demo account. Changes were not applied.' });
    return;
  }
  userData = req.body;
  await giftModel.postUpdateGift(userData.giftCoins, userData.levelLimit, userData.id);
  res.send({ status: 'success', message: 'Your gift has been updated successfully!' });
}