const express = require('express');
const router = express.Router();
const db = require('../config/db_handler');
const adminFirebase = require("firebase-admin");

router.post('/viewed', async (req, res) => {
    let own;
    const userId = req.user ? req.user.id : 0;
    const videoId = req.body['video_id'] ?? 0;
    const adUserId = req.body['user_id'] ?? 0;

    if(userId === adUserId){
        own = true;
    }
    else{
        own = false;
    }
    const response = await db.markVideoViewed(userId, videoId, own);
    res.send({
        "result": response,
    });

});

router.post('/deleteVideo', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const videoId = req.body['video_id'] ?? 0;

    const response = await db.deleteVideo(req.user.id, videoId);
    res.send({
        "result": response,
    });
});

router.post('/like', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    // const token = req.body["token"];
    const token = '';
    const videoId = req.body['video_id'] ?? 0;
    const value = req.body['value'] ?? false;
    const response = await db.toggleVideoLike(req.user.id, videoId, value);
    if (response) {
        if (value) {
            const videoData = await db.getVideoOnlyById(videoId);
            if (videoData) {
                global.addNotification(req.user, videoData.user.id, {
                    type: "liked",
                },
                {videoId: videoId});
            }
        }
    }
    res.send({
        "result": response,
    });
});

router.get('/getReports', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const reports = await db.getReports(authUserId);
    res.send(reports);
});

router.post('/reportVideo', async (req, res) => {
    const userId = req.body['userId'] ?? null;
    const uUserId = req.body['uUserId'] ?? "";
    const videoId = req.body['videoId'] ?? 0;
    const reason = req.body['reason'] ?? 0;
    console.log(userId, videoId, uUserId, reason);
    const response = await db.reportVideo(videoId,uUserId, userId, reason);
    console.log(response);
    res.send({
        "result": response,
    });
});

router.post('/notInterested', async (req, res) => {
    const userId = req.body['userId'] ?? null;
    const uUserId = req.body['uUserId'] ?? null;
    const videoId = req.body['videoId'] ?? 0;
    console.log(userId, videoId, uUserId, "notInterested API");
    const response = await db.notInterested(videoId, uUserId, userId);
    res.send({
        "result": response,
    });
});

router.post('/likeComment', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const commentId = req.body['comment_id'] ?? 0;
    const value = req.body['value'] ?? false;
    const response = await db.toggleCommentLike(req.user.id, commentId, value);
    if (response) {
        if (value) {
            const videoData = await db.getCommentOnlyById(commentId);
            if (videoData) {
                global.addNotification(req.user, videoData.user_id, {
                    type: "comment_liked",
                },
                videoData.video_id,
                commentId,
                );
            }
        }
    }
    res.send({
        "result": response,
    });
});

router.get('/comments', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const videoId = req.query['videoId'] ?? false;
    const commentId = req.query['commentId'] ?? false;
    var comments;
    if (videoId) {
        comments = await db.getComments(authUserId, videoId, from);
    } else if (commentId) { 
        comments = await db.getReplies(authUserId, commentId, from);
    } else {
        comments = [];
    }
    res.send({
        "comments": comments,
    });
});

router.post('/comment', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const videoId = req.body['video_id'] ?? 0;
    const commentId = req.body['comment_id'] ?? 0;
    const comment = req.body['comment'] ?? '';
    console.log(videoId, commentId);
    const response = await db.addComment(req.user.id, videoId, comment, commentId);
    if (response) {
        console.log(response)
        let videoUser;
        if (commentId == 0) {
            const videoData = await db.getVideoOnlyById(videoId);
            if (videoData) {
                global.addNotification(
                    req.user,
                    videoData.user.id,
                    { type: "comment" },
                    { videoId: videoId, commentId: response.id }
                );
                
            }
        } else {
            const videoData = await db.getCommentOnlyById(commentId);
            if (videoData) {
                console.log("Comment data", videoData);
                global.addNotification(req.user, videoData.user_id, {
                    type: "comment_replied",
                }, { videoId: videoId, commentId: response.id });
            }
        }
        res.send({
            "id": response.id,
        });
    } else {
        res.status(400).send({
            error: "invalid"
        });
    }
});

router.post('/deleteComment', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const commentId = req.body['commentId'] ?? 0;
    const videoId = req.body['videoId'] ?? 0;
    const parentId = req.body['parentId'] ?? 0;
    console.log("/deleteComment", commentId, videoId, parentId)
    const response = await db.deleteVideoComment(commentId, parentId, videoId);
    res.send({
        "result": response,
    });
});

module.exports = router