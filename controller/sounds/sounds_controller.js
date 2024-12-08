const utils = require('../../config/utils');
var path = require('path');
const multer = require('multer');
const db = require('../../config/db_wrapper');
const config = require('../../config/config');
const upload_manager = require('../../config/upload_manager');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

exports.getSoundsData = async (req, res) => {
    var from = req.query["from"] ?? 0;
    sounds = await db.query("SELECT * FROM sounds ORDER BY id DESC LIMIT ?, 20", [from]);
    const soundCategories = await db.query("SELECT * FROM sound_categories;");
    const data = {
        sounds: sounds,
        soundCategories: soundCategories
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

exports.postAddSound = async (req, res) => {
    const userData = req.body;

    let soundUrl = "";
    let soundPath = "";
    let albumPhotoUrl = "";
    let duration;

    if (req.files && req.files['sound'] && req.files['photo']) {
        // Sound and photo are uploaded
        const soundName = req.files['sound'][0].filename;
        const albumName = req.files['photo'][0].filename;
        soundUrl = global.hostAddress + "uploads/sound_album/" + req.files['sound'][0].filename;
        soundPath = req.files.sound[0].path;
        albumPhotoUrl = global.hostAddress + "uploads/sound_album/" + req.files['photo'][0].filename;

        duration = await getDuration(soundPath);

        const soundMimeType = mime.lookup(req.files.sound[0].path);
        if (soundMimeType !== 'audio/mpeg') {
            return res.status(400).send({ status: 'error', message: 'Please upload an MP3 file for sounds.' });
        }

        const soundUpload = await upload_manager.upload({ key: 'sounds', fileReference: req.files.sound[0].path, contentType: soundMimeType, fileName: soundName });
        soundUrl = soundUpload.Location;

        const albumUpload = await upload_manager.upload({ key: 'sounds', fileReference: req.files.photo[0].path, contentType: mime.lookup(req.files.photo[0].path), fileName: albumName });
        albumPhotoUrl = albumUpload.Location;

    } else {
        return res.status(400).send({ status: 'error', message: 'Please upload both sound and photo.' });
    }
    const addSoundQuery = `
        INSERT INTO sounds (user_id, title, soundUrl, soundPath, albumPhotoUrl, artist, admin, duration)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?);
    `;
    try {
        console.log([userData.id, userData.title, soundUrl, soundPath, albumPhotoUrl, userData.artist, duration]);
        const addSound = await db.execute(addSoundQuery, [userData.id, userData.title, soundUrl, soundPath, albumPhotoUrl, userData.artist, duration]);
        res.send({ status: 'success', message: 'Your data has been inserted successfully!' });
    } catch (error) {
        console.log(error);
        res.status(500).send({ status: 'error', message: 'Failed to insert sound.' });
    }
};

exports.postEditSound = async (req, res) => {
    if (req.session.user.power == 0) {
        res.send( { status: 'success', message: 'You are on a demo account. Changes were not applied.' });
        return;
      }
    userData = req.body;
    const updateSound = await db.execute(`UPDATE sounds SET title = ? WHERE id = ?`, [userData.title, userData.id]);
    res.send({ status: 'success', message: 'Sound title has been updated successfully!' });
}

exports.postDeleteSound = async (req, res) => {
    userData = req.body;
    const deleteSound = await db.execute(`DELETE FROM sounds WHERE id = ?`, [userData.id]);
    res.send({ status: 'success', message: 'Sound has been deleted successfully!' });
}

const ffmpeg = require('fluent-ffmpeg');
async function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            const duration = Math.floor(metadata.format.duration);
            resolve(duration);
        });
    });
}