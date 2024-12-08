const express = require('express');
const router = express.Router();
const db = require('../config/db_handler');

router.get('', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const soundId = req.query['soundId'] ?? 0;
    const sound = await db.getSound(authUserId, soundId);
    res.send({sound: sound});
});

router.get('/videos', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const soundId = req.query['soundId'] ?? 0;
    const from = req.query['from'] ?? 0;
    const videos = await db.getSoundVideos(null, authUserId, soundId, from);
    res.send({videos: videos});
});

router.post('/favorite', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const authUserId = req.user ? req.user.id : 0;
    const soundId = req.body['soundId'] ?? 0;
    const value = req.body['value'] ?? 0;
    const response = await db.toggleFavSound(authUserId, soundId, value);
    res.send({
        "result": response,
    });
});

module.exports = router