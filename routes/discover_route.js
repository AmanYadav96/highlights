const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const config = require("../config/config");
const db = require('../config/db_handler');
const mime = require('mime-types');
const upload_manager = require('../config/upload_manager');
const cron = require('node-cron');
  router.use(express.static(__dirname + '/public'));
  router.use('/uploads', express.static('uploads'));
  

router.get('/top_users', async (req, res) => {
  const authUserId = req.user ? req.user.id : 0;
  const from = req.query['from'] ?? 0;
  const searchQuery = req.query['search'] ?? "";
  const users = await db.searchUsers(authUserId, searchQuery, from, 10);
  res.send({
      "users": users,
  });
});

router.get('/top', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const searchQuery = req.query['search'] ?? "";
    const users = await db.searchUsers(authUserId, searchQuery, from, 5);
    const videos = await db.getDiscoverVideos(authUserId, searchQuery, from, 5);
    const sounds = await db.getDiscoverSounds(authUserId, searchQuery, from, 5);
    res.send({
        "users": users,
        "videos": videos,
        "sounds": sounds,
    });
});

router.get('/video', async (req, res) => {
  const authUserId = req.user ? req.user.id : 0;
  const videoId = req.query['videoId'] ?? 0;
  const videos = await db.getVideoById(authUserId, videoId);
  console.log(videos)
  if(videos){
    res.send(videos);
  }
  else{
    res.status(400).send({message: "Video not found"});
  }
});

router.get('/streams', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const streamType = req.query['streamType'] ?? -1;
    const streams = await db.getActiveStreams(authUserId, streamType, from);
    res.send({
        "streams": streams,
    });
});


router.get('/sounds', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const searchQuery = req.query['search'] ?? "";
    const isFavourite = req.query['isFavorite'] ?? false;
    let sounds;
    if(isFavourite == "true") {
       sounds = await db.getFavSounds(authUserId);
    }
    else{
       sounds = await db.getDiscoverSounds(authUserId, searchQuery, from);
       console.log("/discover/sounds", sounds)
    }
    res.send({
        "sounds": sounds,
    });
});

router.get('/videos', async (req, res) => {
    const authUserId = req.user ? req.user.id : -1;
    const uUserId = req.query['uUserId'] ?? "";
    const from = req.query['from'] ?? 0;
    const searchQuery = req.query['search'] ?? "";
    const filter = req.query['filter'] ?? "foryou";
    console.log("from", from, filter, authUserId);

    var videos;
    if (filter == "featured") {
        videos = await db.discoverFeatured(authUserId, uUserId, from);
    } else if (filter == "following") {
        videos = await db.discoverFollowing(authUserId, uUserId, from);
    } else if (filter == "exclusive") {
        videos = await db.discoverExclusive(authUserId, uUserId, from);
    } else {
        videos = await db.getDiscoverVideos(authUserId, "", from);
    }
    if(searchQuery){
      videos = await db.getDiscoverVideos(authUserId, searchQuery, from);
    }
    res.send({
        "videos": videos,
    });
});

router.get('/people', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const query = req.query['search'] ?? 0;
    const users = await db.searchUsers(authUserId, query, from);
    res.send({
        "users": users,
    });
});

router.get('/tags', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const userId = req.query['userId'] ?? 0;
    const from = req.query['from'] ?? 0;
    const banners = await db.getExploreBanners();
    const hashtagsVideos = await db.getExploreTags(authUserId, from);
    res.send({
        "banners": banners,
        "tags": hashtagsVideos,
    });
});

router.get('/tag', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const tagId = req.query['tagId'] ?? 0;
    const tagName = req.query['tagName'] ?? "";   
    const results = await db.getTagDetails(authUserId, tagId, tagName);
    res.send(results);
});

router.get('/gifts', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const giftCategory = req.query['giftCategory'] ?? 0;
    const from = req.query['from'] ?? 0;
    const walletDetails = await db.getWallet(authUserId);
    const gifts = await db.getGiftCategories(authUserId);
    res.send({
        ...walletDetails,
        "gifts": gifts,
    });
});

module.exports = router