const LevelXp = require('../../models/levelXp/levelXp_model');
const config = require('../../config/config');

exports.getLevelXpData = async (req, res) => {
    const levels = await LevelXp.getAllData();
    const data = {
        xp: levels.reduce((acc, curr) => {
            acc[curr.name] = curr.xp ?? 0;
            return acc;
        }, {})
    };
    res.render('pages/levels_xp', data);
}


exports.postAddXPLevel = async (req, res) => {
    const userData = req.body;
    console.log(userData)
    const result = await LevelXp.create(userData.xpValue, userData.xpName);
    res.send({ status: 'success', message: 'Your data has been inserted successfully!' });
}

exports.postDeleteXPLevel = async (req, res) => {
    const userData = req.body;
    const result = await LevelXp.delete(userData.xpValue, userData.xpName);
    res.send({ status: 'success', message: 'Your level has been deleted successfully!' });
}
