const Level = require('../../models/levels/levels_models');
const config = require('../../config/config');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

exports.getLevelsData = async (req, res) => {
    const levels = await Level.getAll();
    const data = {  
        levels: levels,
    };
    res.render('pages/levels', data);
}

exports.postAddLevel = async (req, res) => {
    const userData = req.body;

    var iconUrl = "";
    if (req.files.picture) {
        var picture = req.files.picture[0];
        // Picture is uploaded
        const bannerUpload = await upload_manager.upload({ key: 'levels', fileReference: picture.path, contentType: mime.lookup(picture.path), fileName: picture.filename });
        iconUrl = bannerUpload.Location;
    } 

    var badgeUrl = "";
    if (req.files.badge) {
        var badge = req.files.badge[0];
        // Picture is uploaded
        const bannerUpload = await upload_manager.upload({ key: 'levels', fileReference: badge.path, contentType: 'image/svg+xml', fileName: badge.filename });
        badgeUrl = bannerUpload.Location;
    } 

    const result = await Level.create(userData, iconUrl, badgeUrl);
    res.send({ status: 'success', message: 'Your data has been inserted successfully!' });
}

exports.postDeleteLevel = async (req, res) => {
    const userData = req.body;
    const result = await Level.delete(userData.id);
    res.send({ status: 'success', message: 'Your level has been deleted successfully!' });
}

exports.postEditLevel = async (req, res) => {
    const userData = req.body;
    const result = await Level.edit(userData.id, userData.levelName, userData.levelNumber, userData.levelXP);
    res.send({ status: 'success', message: 'Your level has been updated successfully!' });
}
