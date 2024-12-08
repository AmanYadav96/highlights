const utils = require('../../utils');
const multer = require('multer');
var path = require('path');
const db = require('../../db_wrapper');

exports.getSoundsData = async (req, res) => {
    var from = req.query["from"] ?? 0;
    sounds = await db.query("SELECT * FROM sounds LIMIT ?, 20", [from]);
    const data = {  
        sounds: sounds,
    };
    res.render('pages/sounds', data);
}

exports.getFetchSound = async (req, res) => {
    var from = req.query["from"] ?? 0;
    sounds = await db.query("SELECT * FROM sounds LIMIT ?, 50", [parseInt(from)]);
    const data = {  
        sounds: sounds,
    };
    res.send(data);
}

exports.postDeleteSound = async (req, res) => {
    if (req.session.user.power == 0) {
        res.send( { status: 'success', message: 'You are on a demo account. Changes were not applied.' });
        return;
      }
    userData = req.body;
    const deleteSound = await db.execute(`DELETE FROM sounds WHERE id = ?`, [userData.id]);
    res.send({ status: 'success', message: 'Sound has been deleted successfully!' });
}

exports.postEditSound = async (req, res) => {
    if (req.session.user.power == 0) {
        res.send( { status: 'success', message: 'You are on a demo account. Changes were not applied.' });
        return;
      }
    userData = req.body;
    const updateSound = await db.execute(`UPDATE sounds SET title = ? WHERE id = ?`, [userData.title, userData.id]);
    res.send({ status: 'success', message: 'Sound title has been updated successfully!' });
}
