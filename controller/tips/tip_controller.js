const Packages = require('../../models/tips/tip_model');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

exports.getTipsData = async (req, res) => {
    const tips = await Packages.getAll();
    const data = {  
        tips: tips,
    };
    res.render('pages/tips', data);
}

exports.postAddTip = async (req, res) => {
    const userData = req.body;

    let iconUrl = "";
    if (req.file) {
        const icon = req.file;
        // Icon is uploaded
        const iconUpload = await upload_manager.upload({ key: 'images', fileReference: icon.path, contentType: mime.lookup(icon.path), fileName: icon.filename });
        iconUrl = iconUpload.Location;
    }
  
    console.log(userData);
    const coinsPackage = await Packages.addData(iconUrl, userData.amount, userData.code);
    
    res.send({ status: 'success', message: 'Subscription package is added successfully!'});
}

exports.postDeleteTip = async (req, res) => {
    const userData = req.body;
    console.log(userData);
    const result = await Packages.delete(userData.id);
    res.send({ status: 'success', message: 'Package has been deleted successfully!' });
}
