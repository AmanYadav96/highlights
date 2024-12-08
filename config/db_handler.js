const mysql = require('mysql2');
const crypto = require('crypto');
const constants = require('./constants');
const config = require('./config');
const streamModel = require('../models/stream_model');
const { truncate } = require('fs/promises');

function getTime() {
    return Math.floor(new Date().getTime() / 1000)
}

class DbHandler {
        constructor(host_, user_, password_, database_, port_ = 3306) {
            this.pool = mysql.createPool({
                connectionLimit: 10,
                host: host_,
                user: user_,
                password: password_,
                database: database_,
                port: port_,
                // ssl: "/etc/ssl/certs/ca-certificates.crt",
                charset: 'utf8mb4',
                connectTimeout: 10000,  // set a connection timeout of 10 seconds
                acquireTimeout: 10000,  // set an acquire timeout of 10 seconds
                timeout: 10000,         // set a timeout for queries of 10 seconds
                waitForConnections: true, // make sure we wait for a connection when there are none available
                queueLimit: 0,          // no limit to the number of queued connection requests
            }, (err) => {
                if (err) {
                    console.error("Unexpected error while establishing connection with database", err);
                }
            });
    
            this.pool.on('connection', function (connection) {
                console.log("New connection called on MySQL Pool");
            });
    
            this.pool.on('error', function (err) {
                console.error("Connection with MySQL server lost.", err);
            });
    
            // Setup a keep-alive query to maintain the connection
            setInterval(() => {
                this.pool.query('SELECT 1;', (err) => {
                    if (err) {
                        console.error('Error with keep-alive query:', err);
                    }
                });
            }, 4 * 60 * 60 * 1000); // Every 4 hours (4 * 60 * 60 * 1000 milliseconds)
    
            if (!DbHandler.instance) {
                console.log("Instantiating new database");
                DbHandler.instance = this;
            }
            return DbHandler.instance;
        }

        getConfigs() {
            return new Promise((resolve, reject) => {
                var query = "SELECT * FROM config";
                query = mysql.format(query);
                
                this.pool.getConnection(function (err, connection) {
                    if (err) {
                        return reject(err);
                    }
        
                    connection.query(query, function (err, results, fields) {
                        connection.release();
                        if (err) {
                            return reject(err);
                        }
                        
                        var configs = [];
                        for (let i = 0; i < results.length; i++) {
                            configs[results[i]['name']] = results[i]['value'];
                        }
                        resolve(configs);
                    });
                });
            });
        }
        

    getUserByUsername(username) {
        return new Promise(
          function (resolve, reject) {
            var query = "SELECT * FROM users WHERE username = ?";
            var params = [username];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
              connection.query(query, function (err, results, fields) {
                connection.release();
                
                if (err) {
                  console.log("[Error]", err);
                  resolve(null);
                  return;
                }
                if (results && results.length > 0) {
                  var user = results[0];
                  resolve(user);
                } else {
                  resolve(null);
                }
              });
            });
          }.bind(this)
        );
    }

    updateUserXP(userId) {
        return new Promise(
          async function (resolve, reject) {
            const xpValues = await this.getXpValues();
            const updateXp = parseInt(xpValues["buying_coins"]) ?? 0;
            if (updateXp) {
              var query =
                "UPDATE users SET levelXP = GREATEST(levelXP + ?, 0) WHERE id = ?";
              var params = [updateXp, userId];
              query = mysql.format(query, params);
            } else {
              var query =
                "UPDATE users SET levelXP = GREATEST(levelXP + 0, 0) WHERE id = ?";
              var params = [userId];
              query = mysql.format(query, params);
            }
            this.pool.getConnection(function (err, connection) {
              connection.query(query, function (err, results, fields) {
                console.error(err);
                connection.release();
                if (err) {
                  resolve(null);
                  return;
                }
                if (results.affectedRows > 0) {
                  resolve(updateXp);
                } else {
                  resolve(null);
                }
              });
            });
          }.bind(this)
        );
      }

    getActiveStreams(authUserId, streamType, from = 0, threshold = 10) {
        return new Promise(resolve => {
            let query, params;
            
            if (streamType == -1) {
                query = `
                    SELECT ls.*, u.name, u.profilePicture, u.levelXP, u.totalFollowers, u.totalFollowings
                    FROM live_streams ls
                    JOIN users u ON u.id = ls.user_id
                    LEFT JOIN blocked_users bu1 ON bu1.blocked_id = ls.user_id AND bu1.blocked_by = ?
                    LEFT JOIN blocked_users bu2 ON bu2.blocked_by = ls.user_id AND bu2.blocked_id = ?
                    WHERE ls.ended = 0 AND bu1.blocked_id IS NULL AND bu2.blocked_id IS NULL
                    ORDER BY ls.totalViews DESC
                    LIMIT ?, ?`;
                params = [authUserId, authUserId, parseInt(from), parseInt(threshold)];
            } else {
                query = `
                    SELECT ls.*, u.name, u.profilePicture, u.levelXP, u.totalFollowers, u.totalFollowings
                    FROM live_streams ls
                    JOIN users u ON u.id = ls.user_id
                    LEFT JOIN blocked_users bu1 ON bu1.blocked_id = ls.user_id AND bu1.blocked_by = ?
                    LEFT JOIN blocked_users bu2 ON bu2.blocked_by = ls.user_id AND bu2.blocked_id = ?
                    WHERE ls.streamType = ? AND ls.ended = 0 AND bu1.blocked_id IS NULL AND bu2.blocked_id IS NULL
                    ORDER BY ls.totalViews DESC
                    LIMIT ?, ?`;
                params = [authUserId, authUserId, streamType, parseInt(from), parseInt(threshold)];
            }
            
            query = mysql.format(query, params);
            
            this.pool.getConnection((err, connection) => {
                if (err) {
                    console.error(err);
                    resolve([]);
                    return;
                }
                
                connection.query(query, async (err, results) => {
                    connection.release();
                    if (err) {
                        console.error(err);
                        resolve([]);
                        return;
                    }
                    
                    const videos = results.map(e => ({
                        streamId: e.id,
                        title: e.title,
                        streamType: parseInt(e.streamType),
                        viewers: e.totalViews,
                        startTime: e.started,
                        user: {
                            id: e.user_id,
                            name: e.name,
                            picture: e.profilePicture,
                        },
                    }));

                    // console.log("getActiveStreams", videos)
                    
                    resolve(videos);
                });
            });
        });
    }
    

    toggleLike(userId, postId, value) {
        return new Promise(async (resolve, reject) => {
            if (value) {
                var query = "INSERT IGNORE INTO post_likes (user_id, post_id) VALUES (?, ?)";
                var params = [userId, postId];
                query = mysql.format(query, params);
                this.pool.getConnection(function (err, connection) {
                    connection.query(query, async function (err, results, fields) {
                        if (err) {
                            console.error(err);
                            resolve(false);
                        } else {
                            try {
                                await connection.execute("UPDATE posts SET likes = likes + 1 WHERE id = ?", [postId]);
                                resolve(true);
                            } catch (err) {
                                console.error(err);
                                resolve(false);
                            }
                        }
                        connection.release();
                    }.bind(this));
                }.bind(this));
            } else {
                var query = "DELETE FROM post_likes WHERE user_id = ? AND post_id = ?";
                var params = [userId, postId];
                query = mysql.format(query, params);
                this.pool.getConnection(function (err, connection) {
                    connection.query(query, async function (err, results, fields) {
                        if (err) {
                            console.error(err);
                            resolve(false);
                        } else {
                            try {
                                await connection.execute("UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [postId]);
                                resolve(true);
                            } catch (err) {
                                console.error(err);
                                resolve(false);
                            }
                        }
                        connection.release();
                    }.bind(this));
                }.bind(this));
            }
        });
    }

    async addLive(client, title, streamType, socket) {
        var userObject = client.userObject;
        return new Promise(function (resolve, reject) {
            // const xpValues = this.getXpValues();
            // const updateXp = parseInt(xpValues["doing_live_stream"]) ?? 0;
            var query = "INSERT INTO live_streams (user_id, started, totalViews, streamType, title) VALUES (?, ?, 0, ?, ?)";
            var params = [userObject.id, getTime(), streamType, title];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    if (err) reject(err);
                    if (results.insertId > 0) {
                        var id = crypto.randomBytes(10).toString('hex');
                        var streamId = "channel-" + results.insertId + id;
                        var streamObj = new streamModel(socket, results.insertId, streamId, client, streamType);
                        // if (updateXp) {
                        //     console.log("Updating XP for user", updateXp)
                        //     connection.execute("UPDATE users SET levelXP = levelXP + ? WHERE id = ?", [updateXp, userObject.id]);
                        // }
                        // else {
                        //     console.log("Setup XP for live streaming in admin panel.");
                        // }
                        resolve(streamObj);
                    } else {
                        resolve(null);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    async addStreamMessage(userObject, streamId, message) {
        return new Promise(function (resolve, reject) {
            var query = "INSERT INTO stream_messages (user_id, stream_id, messageTime, message) VALUES (?, ?, ?, ?);";
            const messageTime = getTime();
            var params = [userObject.id, streamId, messageTime, message];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        connection.release();
                        console.error(err);
                        console.error(results);
                        reject(err);
                        return;
                    }
                    if (results.insertId > 0) {
                        resolve({
                            "serverMessageId": results.insertId,
                            "message": message,
                            "sentTime": messageTime,
                            "user": {
                                "id": userObject.id,
                                "name": userObject.name,
                                "picture": userObject.profilePicture,
                            }
                        });
                    } else {
                        connection.release();
                        resolve(null);
                    }
                });
            });
        }.bind(this));

    }

    endLive(streamId) {
        console.log("End: " + streamId);
        return new Promise(async function (resolve, reject) {
            var query = "UPDATE live_streams SET ended = ? WHERE id = ?";
            var params = [getTime(), streamId];
            query = mysql.format(query, params);

            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    resolve(results.affectedRows > 0);
                });
            });
            // const promisePool = this.pool.promise();
            // // query database using promises
            // const [rows,fields] = await promisePool.query(query);
            // resolve(rows.affectedRows > 0);
        }.bind(this));
    }

    getXpValues() {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM level_xp";
            query = mysql.format(query);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) reject(err);
                    var configs = [];
                    for (let i = 0; i < results.length; i++) {
                        configs[results[i]['name']] = results[i]['xp'];
                    }
                    resolve(configs);
                });
            });
        }.bind(this));
    }

    addSound(authUserId, soundUrl, soundPath, albumPhotoUrl, duration, artist) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            var params = [authUserId, `Original Sound - ${artist}`, soundUrl, soundPath, albumPhotoUrl, duration, artist];
            const [rows, fields] = await promisePool.query("INSERT INTO sounds (user_id, title, soundUrl, soundPath, albumPhotoUrl, duration, artist) VALUES (?, ?, ?, ?, ?, ?, ?)", params);
            if (rows.insertId) {
                const soundId = rows.insertId;
                resolve({
                    "soundId": soundId,
                    "icon": albumPhotoUrl,
                    "soundUrl": soundUrl,
                });
            } else {
                resolve(null);
            }
        });
    }

    toggleFavSound(authUserId, soundId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO sound_favorites (sound_id, user_id) VALUES (?, ?)";
                var params = [soundId, authUserId];
            } else {
                var query = "DELETE FROM sound_favorites WHERE sound_id = ? AND user_id = ?";
                var params = [soundId, authUserId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        }.bind(this));
    }

    uploadVideo(authUserId, videoPath, thumbnailUrl, gifUrl, videoReference, caption, soundId, allowComments, allowSharing, isPrivate, allowDuet, allowGifts, exclusiveAmount, duration, height, width) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            const hashtags = caption.match(/#[\w\u0590-\u05ff]+/g) || [];
            const tags = (caption.match(/#\w+/g) || []).map(tag => tag.slice(1));
            const cleanTags = hashtags.join(', ');
            const cleanTitle = caption.replace(/#[\w\u0590-\u05ff]+/g, '').trim();
            var params = [authUserId, cleanTitle, cleanTags, videoPath, thumbnailUrl, gifUrl, videoReference, getTime(), soundId, allowComments, allowSharing, allowDuet, isPrivate, allowGifts, exclusiveAmount > 0, exclusiveAmount, height, width];
            const [rows, fields] = await promisePool.query("INSERT INTO videos (user_id, title, tags, videoUrl, thumbnailUrl, videoGifUrl, videoGifPath, videoTime, soundId, allowComments, allowSharing, allowDuet, isPrivate, receiveGifts, isExclusive, exclusiveAmount, height, width) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", params);
            if (rows.insertId) {
                const videoId = rows.insertId;
                for (const tag of tags) {
                    const [result] = await promisePool.query(
                        "INSERT INTO tags (tag, totalVideos, priority) VALUES (?, 1, 1) ON DUPLICATE KEY UPDATE totalVideos = totalVideos + 1, priority = priority + 1",
                        [tag]
                    );
                    const tagId = result.insertId;

                    if (tagId !== 0) {
                        const [rows] = await promisePool.query(
                            "SELECT * FROM video_tags WHERE video_id = ? AND tag_id = ?",
                            [videoId, tagId]
                        );

                        if (rows.length === 0) {
                            await promisePool.query(
                                "INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)",
                                [videoId, tagId]
                            );
                        }
                    }
                }
                if (soundId !== 0) {
                    await promisePool.query("UPDATE sounds SET videos = videos + 1 WHERE id = ?", [soundId]);
                }
                await promisePool.query("UPDATE users SET totalVideos = totalVideos + 1 WHERE id = ?", [authUserId]);
                const xpValues = await this.getXpValues();
                let updateXp = xpValues["video_upload"];
                updateXp = parseInt(updateXp) ?? 0;
                if (updateXp) {
                  console.log("Updating XP for user", updateXp);
                  await promisePool.query(
                    "UPDATE users SET levelXP = levelXP + ? WHERE id = ?",
                    [updateXp, authUserId]
                  );
                } else {
                  console.log("[Info] Set Xp for uploading videos in admin panel.");
                }
                const videoResponse = await this.getVideoById(authUserId, videoId);
                resolve(videoResponse);
            } else {
                resolve(null);
            }
            // connection.release();
        });
    }

    getCommentOnlyById(commentId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            const [rows, fields] = await promisePool.query("SELECT * FROM comments WHERE id = ?", [commentId]);
            if (rows.length > 0) {
                resolve(rows[0]);
            } else {
                resolve(null);
            }
        });
    }

    getVideoOnlyById(videoId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            const [rows, fields] = await promisePool.query("SELECT * FROM videos WHERE id = ?", [videoId]);
            if (rows.length > 0) {
                resolve(this.parseVideoObject(rows[0]));
            } else {
                resolve(null);
            }
        });
    }

    getVideoById(authUserId, videoId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            var params = [authUserId, authUserId, authUserId, authUserId, videoId];
            const [rows, fields] = await promisePool.query("SELECT s.title as 'sound_title', (? = v.user_id) as viewer_own, v.*, u.name, u.profilePicture, u.username, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.id = ?", params);
            if (rows.length > 0) {
                resolve(this.parseVideoObject(rows[0]));
            } else {
                resolve(null);
            }
            // connection.release();
        });
    }

    getVideoCountsById(userId, videoId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            var params = [userId, videoId];
            const [rows, fields] = await promisePool.query("SELECT v.*, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked FROM videos v WHERE v.id = ?", params);
            if (rows.length > 0) {
                resolve({
                    likes: rows[0].likes,
                    comments: rows[0].comments,
                    views: rows[0].views,
                    gifts: rows[0].rewards,
                    viewer_liked: Boolean(rows[0].viewer_liked)
                });
            } else {
                resolve(null);
            }
            // connection.release();
        });
    }

    deleteVideoComment(commentId, parentId, videoId) {
        return new Promise(
          function (resolve, reject) {
            console.log(commentId, parentId, videoId)
            var query = "DELETE FROM comments WHERE id = ?";
            var params = [commentId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
              connection.query(query, async function (err, results, fields) {
                if (err) {
                  resolve(false);
                } else {
                  if (parentId != 0) {
                    await connection.execute(
                      "DELETE FROM comments WHERE  parentId = ? AND id = ?",
                      [parentId, commentId]
                    );
                    await connection.execute(
                      "UPDATE comments SET replies = replies - 1 WHERE id = ?",
                      [parentId]
                    );
                    await connection.execute(
                      "UPDATE videos SET comments = comments - 1 WHERE id = ?",
                      [videoId]
                    );
                  } else {
                    await connection.execute("DELETE FROM comments WHERE id = ?", [
                      commentId,
                    ]);
                    await connection.execute(
                      "UPDATE videos SET comments = comments - 1 WHERE id = ?",
                      [videoId]
                    );
                  }
                  resolve(true);
                }
                connection.release();
              });
            });
          }.bind(this)
        );
      }

    toggleCommentLike(userId, commentId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)";
                var params = [commentId, userId];
            } else {
                var query = "DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?";
                var params = [userId, commentId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        resolve(false);
                    } else {

                        resolve(true);
                    }
                });
            });
        }.bind(this));
    }

    toggleVideoLike(userId, videoId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO likes (video_id, user_id) VALUES (?, ?)";
                var params = [videoId, userId];
            } else {
                var query = "DELETE FROM likes WHERE user_id = ? AND video_id = ?";
                var params = [userId, videoId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.log(err);
                        resolve(false);
                    } else {
                        // Video
                        if (results.affectedRows > 0) {
                            if (results.insertId == 0) {
                                await connection.execute("UPDATE videos SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [videoId]);
                                resolve(true);
                            } else {
                                await connection.execute("UPDATE videos SET likes = likes + 1 WHERE id = ?", [videoId]);
                                resolve(true);
                            }
                        }
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    markVideoViewed(userId, videoId, own) {
        return new Promise(async (resolve) => {
            const promisePool = this.pool.promise();
            const [row, field] = await promisePool.query("SELECT video_id FROM ad_viewed WHERE user_id = ? AND video_id = ?", [userId, videoId]);
            const adVideoId = row.length ? row[0].video_id : 0;
            if (adVideoId) {
                console.log("Video seen already.");
            } else {
                if (!own) {
                    await promisePool.query("INSERT IGNORE INTO ad_viewed (user_id, video_id) VALUES (?, ?)", [userId, videoId]);
                    await promisePool.query("UPDATE videos SET views = views + 1 WHERE id = ?", [videoId]);
                }
                else {
                    console.log("User's own video.");
                }
            }
            resolve(true);
        });
    }

    deleteVideo(userId, videoId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            const [rows, fields] = await promisePool.query("DELETE FROM videos WHERE id = ? AND user_id = ?", [videoId, userId]);
            if (rows.affectedRows > 0) {
                await promisePool.query("UPDATE users SET totalVideos = GREATEST(totalVideos - 1, 0) WHERE id = ?", [userId]);
            }
            // connection.release();
            resolve(rows.affectedRows > 0);
        });
    }

    toggleVideoBookmark(userId, videoId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO bookmark (video_id, user_id) VALUES (?, ?)";
                var params = [videoId, userId];
            } else {
                var query = "DELETE FROM bookmark WHERE user_id = ? AND video_id = ?";
                var params = [userId, videoId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        }.bind(this));
    }

    followUser(userId, profileId) {
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO followers (follower, following) VALUES (?, ?);";
            var params = [userId, profileId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        if (results.insertId > 0) {
                            await connection.execute("UPDATE users SET totalFollowers = totalFollowers + 1 WHERE id = ?", [profileId]);
                            await connection.execute("UPDATE users SET totalFollowings = totalFollowings + 1 WHERE id = ?", [userId]);
                        }
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    reportVideo(videoId, uUserId, userId, reason) {
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO reports (video_id, user_id, unique_id, report_reason) VALUES (?, ?, ?, ?);";
            var params = [videoId, userId, uUserId, reason];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    ReportUser(rReportId, uUserId, userId, reason) {
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO report_users (report_user_id, user_id, unique_id, report_reason) VALUES (?, ?, ?, ?);";
            var params = [rReportId, userId, uUserId, reason];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log("Err:" + err);
                    console.log("Results:" + results);
                    console.log(rReportId, userId, uUserId, reason);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    notInterested(videoId, uUserId, userId) {
        console.log(videoId, uUserId, userId, "In db handler")
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO not_interested (video_id, user_id, unique_id) VALUES (?, ?, ?);";
            var params = [videoId, userId, uUserId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    blockUser(blockId, uUserId, userId) {
        return new Promise(function (resolve, reject) {
            const insertBlockQuery = "INSERT IGNORE INTO blocked_users (blocked_by, blocked_id, unique_id) VALUES (?, ?, ?);";
            const deleteFollowerQuery = "DELETE FROM followers WHERE (follower = ? AND following = ?) OR (follower = ? AND following = ?);";
            const insertParams = [userId, blockId, uUserId];
            const deleteParams = [userId, blockId, blockId, userId];
    
            const formattedInsertBlockQuery = mysql.format(insertBlockQuery, insertParams);
            const formattedDeleteFollowerQuery = mysql.format(deleteFollowerQuery, deleteParams);
    
            this.pool.getConnection(function (err, connection) {
                if (err) {
                    console.log(err);
                    return resolve(false);
                }
    
                connection.beginTransaction(function (err) {
                    if (err) {
                        connection.release();
                        console.log(err);
                        return resolve(false);
                    }
    
                    connection.query(formattedInsertBlockQuery, function (err, results, fields) {
                        if (err) {
                            return connection.rollback(function () {
                                connection.release();
                                console.log(err);
                                resolve(false);
                            });
                        }
    
                        connection.query(formattedDeleteFollowerQuery, function (err, results, fields) {
                            if (err) {
                                return connection.rollback(function () {
                                    connection.release();
                                    console.log(err);
                                    resolve(false);
                                });
                            }
    
                            connection.commit(function (err) {
                                if (err) {
                                    return connection.rollback(function () {
                                        connection.release();
                                        console.log(err);
                                        resolve(false);
                                    });
                                }
    
                                connection.release();
                                resolve(true);
                            });
                        });
                    });
                });
            });
        }.bind(this));
    }
    

    unblockUser(blockId, uUserId, userId) {
        return new Promise(function (resolve, reject) {
            var query = "DELETE FROM blocked_users WHERE blocked_by = ? OR blocked_id = ? AND unique_id = ?;";
            var params = [userId, blockId, uUserId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    unfollowUser(userId, profileId) {
        return new Promise(function (resolve, reject) {
            var query = "DELETE FROM followers WHERE follower = ? AND following = ?";
            var params = [userId, profileId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        resolve(false);
                    } else {
                        if (results.affectedRows > 0) {
                            await connection.execute("UPDATE users SET totalFollowers = GREATEST(totalFollowers - 1, 0) WHERE id = ?", [profileId]);
                            await connection.execute("UPDATE users SET totalFollowings = GREATEST(totalFollowings - 1, 0) WHERE id = ?", [userId]);
                        }
                        this.deleteNotification(userId, 'follow', profileId);
                        resolve(true);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        }.bind(this));
    }

    getUserById(id) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE id = ?";
            var params = [id];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        user['instagram'] = user['instagram'] ?? "";
                        user['facebook'] = user['facebook'] ?? "";
                        user['twitter'] = user['twitter'] ?? "";
                        user['profilePicture'] = user['profilePicture'] ?? "";
                        user['about'] = user['about'] ?? "";
                        user['isVerified'] = user['isVerified'] == 1;
                        user['isPrivateLikes'] = user['isPrivateLikes'] == 1;
                        user['token'] = user['token'] ?? "";
                        resolve(user);
                    } else {
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }

    getUserByAuth(auth) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE auth = ?";
            var params = [auth];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        user['instagram'] = user['instagram'] ?? "";
                        user['facebook'] = user['facebook'] ?? "";
                        user['twitter'] = user['twitter'] ?? "";
                        user['profilePicture'] = user['profilePicture'] ?? "";
                        user['about'] = user['about'] ?? "";
                        user['isVerified'] = user['isVerified'] == 1;
                        user['isPrivateLikes'] = user['isPrivateLikes'] == 1;
                        user['refferal_code'] = user['refferal_code'] ?? "";
                        resolve(user);
                    } else {
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }

    getUserByUid(uid) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE uid = ?";
            var params = [uid];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        user['instagram'] = user['instagram'] ?? "";
                        user['facebook'] = user['facebook'] ?? "";
                        user['twitter'] = user['twitter'] ?? "";
                        user['profilePicture'] = user['profilePicture'] ?? "";
                        user['about'] = user['about'] ?? "";
                        user['isVerified'] = user['isVerified'] == 1;
                        user['isPrivateLikes'] = user['isPrivateLikes'] == 1;
                        resolve(user);
                    } else {
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }

    registerUser(uid, name, email, password, appVersion, phoneModel, login_type, location) {
        return new Promise(async resolve => {
            var userObj = await this.getUserByUid(uid);
            if (userObj) {
                // console.log(userObj);
                if (userObj.provider == login_type) {
                    resolve({ user: userObj });
                } else {
                    resolve(null);
                }
            } else {
                var query = "INSERT IGNORE INTO users (name, email, username, password, auth, appVersion, phoneModel, country, provider, createTime, uid, refferal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
                const auth = crypto.randomBytes(64).toString('hex');
                const reff = crypto.randomBytes(3).toString('hex');
                var params = [name, email, uid, password, auth, appVersion, phoneModel, location, login_type, getTime(), uid, reff];
                query = mysql.format(query, params);
                this.pool.getConnection(function (err, connection) {
                    connection.query(query, async function (err, results, fields) {
                        connection.release();
                        if (err) {
                            console.error("[Error] " + err);
                            resolve(null);
                            return;
                        } else {
                            if (results.insertId > 0) {
                                const userObj = await this.getUserByAuth(auth);
                                resolve({ user: userObj });
                            } else {
                                resolve(null);
                            }
                        }
                    }.bind(this));
                }.bind(this));
            }
        });
    }

    getFollowers(userId, profileId) {
        return new Promise(resolve => {
            var query = "SELECT u.id, name, `profilePicture`, exists(select * from followers where following = u.id and follower = ?) as viewer_follower, (IF(follower = ?, 1, 0)) AS viewer_own from followers left join users u on u.id = follower where following = ?";
            var params = [userId, userId, profileId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var users = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                users.push({
                                    "id": e.id,
                                    "name": e.name,
                                    "username": e.username,
                                    "profilePicture": e.profilePicture,
                                    "following": e.viewer_follower == 1,
                                    "own": e.viewer_own == 1,
                                });
                            }
                        }
                        resolve(users);
                    }
                });
            });
        });
    }

    deleteNotification(userId, type, profileId = 0, videoId = 0, streamId = 0, postId = 0, commentId = 0) {
        return new Promise((resolve, reject) => {
            let notificationType = constants.notificationTypes.get(type) ?? -1;
            var query = "DELETE FROM notifications WHERE userId = ? AND notificationType = ?";
            var params = [userId, notificationType];
            if (videoId !== 0) {
                query += " AND videoId = ?";
                params.push(videoId);
            }
            if (streamId !== 0) {
                query += " AND streamId = ?";
                params.push(streamId);
            }
            if (postId !== 0) {
                query += " AND postId = ?";
                params.push(postId);
            }
            if (commentId !== 0) {
                query += " AND commentId = ?";
                params.push(commentId);
            }
            if (profileId !== 0) {
                query += " AND receiverId = ?";
                params.push(profileId);
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        resolve(null);
                    } else {
                        resolve(results.affectedRows);
                    }
                });
            });
        });
    }

    insertNotification(receiverId, userId, notificationMessage, notificationType, videoId, postId, commentId, streamId) {
        console.log("db_handler.js", receiverId, userId, notificationMessage, notificationType, videoId, postId, commentId, streamId)
        return new Promise((resolve, reject) => {
            console.log()
            var query = "INSERT INTO notifications (receiverId, userId, notificationMessage, videoId, postId, commentId, streamId, notificationTime, notificationType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var params = [receiverId, userId, notificationMessage, videoId, postId, commentId, streamId, Math.floor(Date.now() / 1000), notificationType];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        resolve(results.insertId);
                    }
                });
            });
        });
    }

    getNotifications(userId, from) {
        return new Promise(resolve => {
            var query = "SELECT n.*, u.name, u.profilePicture FROM notifications n LEFT JOIN users u ON n.userId = u.id WHERE n.receiverId = ? ORDER BY n.id DESC LIMIT ?, 10";
            var params = [userId, parseInt(from)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var notifications = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                let obj = {
                                    "id": e.id,
                                    "receiverId": e.receiverId,
                                    "notificationMessage": JSON.parse(e.notificationMessage),
                                    "notificationTime": e.notificationTime,
                                    "postId": e.postId ?? 0,
                                    "videoId": e.videoId ?? 0,
                                    "commentId": e.commentId ?? 0,
                                    "streamId": e.streamId ?? 0,
                                }
                                if (e.name != null) {
                                    obj.user = {
                                        "id": e.userId,
                                        "name": e.name,
                                        "picture": e.profilePicture,
                                    };
                                }
                                notifications.push(obj);
                            }
                        }
                        resolve(notifications);
                    }
                });
            });
        });
    }

    getFollowings(userId, profileId, from = 0) {
        return new Promise((resolve) => {
          var query =
            "select u.id, name, `profilePicture`, exists(select * from followers where following = u.id and follower = ?) as viewer_follower, (IF(following = ?, 1, 0)) AS viewer_own from followers left join users u on u.id = following where follower = ? LIMIT ?, 10";
          var params = [userId, userId, profileId, parseInt(from)];
          query = mysql.format(query, params);
          this.pool.getConnection(function (err, connection) {
            connection.query(query, async function (err, results, fields) {
              connection.release();
              if (err) {
                console.error(err);
                console.error(results);
                resolve([]);
              } else {
                var users = [];
                if (results.length > 0) {
                  for (let i = 0; i < results.length; i++) {
                    const e = results[i];
                    users.push({
                      id: e.id,
                      name: e.name,
                      username: e.username,
                      profilePicture: e.profilePicture,
                      following: e.viewer_follower == 1,
                      own: e.viewer_own == 1,
                    });
                  }
                }
                resolve(users);
              }
            });
          });
        });
      }

    getBlockedUsers(userId) {
        return new Promise(resolve => {
            var query = "SELECT b.*, u.name, u.profilePicture, u.username FROM blocked_users b JOIN users u ON u.id = b.blocked_id WHERE b.blocked_by = ?";
            var params = [userId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var users = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                users.push({
                                    "id": e.blocked_id,
                                    "name": e.name,
                                    "username": e.username,
                                    "profilePicture": e.profilePicture,
                                });
                            }
                        }
                        resolve(users);
                    }
                });
            });
        });
    }

    getReports(userId) {
        return new Promise(resolve => {
            var query = "SELECT * FROM report_reasons";
            query = mysql.format(query);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var reasons = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                reasons.push({
                                    "id": e.id,
                                    "name": e.reason,
                                    "points": e.points,
                                });
                            }
                        }
                        resolve(reasons);
                    }
                });
            });
        });
    }

    searchUsers(userId, searchQuery, from = 0, threshold = 10) {
        return new Promise(resolve => {
            const self = this; // Capture the reference to 'this'
    
            if (searchQuery != "") {
                var query = "SELECT u.*, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_follower, (IF(u.id = ?, 1, 0)) AS viewer_own FROM users u LEFT JOIN blocked_users bu ON u.id = bu.blocked_id AND bu.blocked_by = ? WHERE u.name LIKE CONCAT('%', ?, '%') OR u.username LIKE CONCAT('%', ?, '%') AND bu.blocked_id IS NULL";
                var params = [userId, userId, userId, searchQuery, searchQuery];
            } else {
                var query = "SELECT u.*, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_follower, (IF(u.id = ?, 1, 0)) AS viewer_own FROM users u LEFT JOIN blocked_users bu ON u.id = bu.blocked_id AND bu.blocked_by = ? WHERE bu.blocked_id IS NULL ORDER BY u.totalVideos DESC LIMIT ?, ?;";
                var params = [userId, userId, userId, parseInt(from), parseInt(threshold)];
            }
            query = mysql.format(query, params);
    
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var users = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                users.push({
                                    "id": e.id,
                                    "name": e.name,
                                    "username": e.username,
                                    "profilePicture": e.profilePicture,
                                    "level": null,
                                    "following": e.viewer_follower == 1,
                                    "own": e.viewer_own == 1,
                                });
                            }
                        }
                        resolve(users);
                    }
                });
            });
        });
    }

    getProfile(userId, profileId) {
        return new Promise(resolve => {
            var query = "SELECT u.*, EXISTS(SELECT * FROM followers WHERE follower = ? AND following = u.id) AS following, (? = u.id) AS viewer_own, (SELECT COUNT(*) FROM followers WHERE following = u.id) as followers, (SELECT COUNT(*) FROM products WHERE seller_id = u.id) as products, (SELECT COUNT(*) FROM followers WHERE follower = u.id) as followings, (SELECT COUNT(*) FROM videos WHERE user_id = u.id) as videos, k.public_exponent, k.public_modulus FROM users u LEFT JOIN user_keys k ON u.id = k.user_id WHERE u.id = ? AND NOT EXISTS( SELECT * FROM blocked_users WHERE blocked_by = ? AND blocked_id = u.id ) AND NOT EXISTS( SELECT * FROM blocked_users WHERE blocked_by = u.id AND blocked_id = ?)";
            var params = [userId, userId, profileId, userId, userId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve(false);
                    } else {
                        if (results.length > 0) {
                            const e = results[0];
                            // resolve(this.parseUserObject(e));
                            const levels = null;
                            const userObj = this.parseUserObject(e);
                            userObj.level = levels ? levels : null;
                            resolve(userObj);
                        } else {
                            resolve(false);
                        }
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    // discoverFollowing(userId, uUserId, from = 0, threshold = 10) {
    //     return new Promise(resolve => {
    //         var query = "SELECT s.title as 'sound_title', albumPhotoUrl, (? = v.user_id) as viewer_own, v.*, u.name, u.profilePicture, u.username, u.levelXP, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.isPrivate = 0 AND EXISTS(SELECT id FROM followers WHERE follower = ? AND following = v.user_id ) AND NOT EXISTS (SELECT 1 FROM blocked_users WHERE (blocked_id = v.user_id AND blocked_by = ?) OR (blocked_id = ? AND blocked_by = v.user_id)) GROUP BY v.id ORDER BY score DESC LIMIT ?, ?";
    //         var params = [userId, userId, userId, userId, userId, userId, userId, parseInt(from), parseInt(threshold)];
    //         query = mysql.format(query, params);
    //         this.pool.getConnection(function (err, connection) {
    //             connection.query(query, async function (err, results, fields) {
    //                 connection.release();
    //                 if (err) {
    //                     console.error(err);
    //                     console.error(results);
    //                     resolve([]);
    //                 } else {
    //                     var videos = [];
    //                     if (results.length > 0) {
    //                         for (let i = 0; i < results.length; i++) {
    //                             const e = results[i];
    //                             // videos.push(this.parseVideoObject(e));
    //                             const levels = null;
    //                             const videoObj = this.parseVideoObject(e);
    //                             videoObj.user.level = levels ? levels : null;
    //                             videos.push(videoObj);
    //                         }
    //                     }
    //                     // connection.release();
    //                     resolve(videos);
    //                 }
    //             }.bind(this));
    //         }.bind(this));
    //     });
    // }

    discoverFollowing(userId, uUserId, from = 0, threshold = 10) {
        return new Promise(resolve => {
            var query = `
                SELECT s.title as 'sound_title', albumPhotoUrl, (? = v.user_id) as viewer_own, v.*, 
                    u.name, u.profilePicture, u.username, u.levelXP, 
                    EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, 
                    CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, 
                    (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts,
                    EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, 
                    LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score 
                FROM videos v 
                JOIN users u ON u.id = v.user_id 
                LEFT JOIN sounds s ON s.id = v.soundId 
                WHERE v.isPrivate = 0
                AND v.user_id != ?
                AND EXISTS(SELECT id FROM followers WHERE follower = ? AND following = v.user_id)
                AND NOT EXISTS(SELECT 1 FROM not_interested ni WHERE ni.video_id = v.id AND ni.user_id = ?)
                AND NOT EXISTS(SELECT 1 FROM blocked_users WHERE (blocked_id = v.user_id AND blocked_by = ?) OR (blocked_id = ? AND blocked_by = v.user_id))
                AND NOT EXISTS(SELECT 1 FROM reports WHERE video_id = v.id AND user_id = ?)
                GROUP BY v.id 
                ORDER BY score DESC 
                LIMIT ?, ?`;
            var params = [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                const levels = null; // You may replace this with the actual call to get user levels if needed.
                                const videoObj = this.parseVideoObject(e);
                                videoObj.user.level = levels ? levels : null;
                                videos.push(videoObj);
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }
    

    discoverFeatured(userId, uUserId, from = 0, threshold = 10) {
        return new Promise(resolve => {
            var query = "SELECT s.title AS 'sound_title', albumPhotoUrl, (? = v.user_id) AS viewer_own, v.*, u.name, u.profilePicture, u.username, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) AS viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END AS isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_following, (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts, LOG10(ABS(v.likes + views) + v.videoTime / 300000) AS score FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.isPrivate = 0 AND u.isVerified = 1 AND NOT EXISTS(SELECT id FROM not_interested ni WHERE ni.video_id = v.id AND (ni.user_id = ? OR ni.unique_id = ?)) AND NOT EXISTS(SELECT id FROM blocked_users WHERE blocked_id = v.user_id AND (blocked_by = ? OR unique_id = ?)) AND NOT EXISTS(SELECT id FROM reports WHERE ( user_id = ? OR unique_id = ?) AND video_id = v.id) AND NOT EXISTS(SELECT id FROM report_users WHERE (user_id = ? OR unique_id = ?) AND report_user_id = v.user_id) AND v.user_id != ? AND v.user_id GROUP BY v.id ORDER BY v.id DESC LIMIT ?, ?";
            var params = [userId, userId, userId, userId, userId, uUserId, userId, uUserId, userId, uUserId, userId, uUserId, userId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                e.comments = e.commentCounts
                                videos.push(this.parseVideoObject(e));
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    discoverExclusive(userId, uUserId, from = 0, threshold = 15) {
        return new Promise(resolve => {
            var query = "SELECT s.title as 'sound_title', albumPhotoUrl, (? = v.user_id) as viewer_own, v.*, u.name, u.profilePicture, u.username, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.isExclusive = 1 GROUP BY v.id ORDER BY id DESC LIMIT ?, ?";
            var params = [userId, userId, userId, userId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                videos.push(this.parseVideoObject(e));
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getDiscoverVideos(userId, searchQuery = '', from = 0, threshold = 15) {
        return new Promise((resolve, reject) => {
            let query;
            let params;
    
            if (searchQuery === "") {
                query = `
                    SELECT s.title AS 'sound_title', 
                           albumPhotoUrl, 
                           (? = v.user_id) AS viewer_own, 
                           v.*, 
                           u.name, 
                           u.profilePicture, 
                           u.username, 
                           u.levelXP, 
                           EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) AS viewer_liked, 
                           CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END AS isUnlocked,
                           (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts, 
                           EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_following, 
                           CASE WHEN av.video_id IS NULL THEN 0 ELSE 1 END AS viewed
                    FROM videos v 
                    JOIN users u ON u.id = v.user_id 
                    LEFT JOIN sounds s ON s.id = v.soundId 
                    LEFT JOIN ad_viewed av ON av.video_id = v.id AND av.user_id = ? 
                    WHERE v.isPrivate = 0 
                      AND v.user_id != ?
                      AND NOT EXISTS(SELECT 1 FROM not_interested ni WHERE ni.video_id = v.id AND ni.user_id = ?)
                      AND NOT EXISTS (SELECT 1 FROM blocked_users WHERE (blocked_id = v.user_id AND blocked_by = ?) 
                                      OR (blocked_id = ? AND blocked_by = v.user_id))
                      AND NOT EXISTS (SELECT 1 FROM followers WHERE follower = ? AND following = v.user_id)
                      AND NOT EXISTS(SELECT 1 FROM reports WHERE video_id = v.id AND user_id = ?)
                    ORDER BY viewed ASC, RAND()
                    LIMIT ?, ?;
                `;
    
                params = [
                    userId, // viewer_own
                    userId, // viewer_liked
                    userId, // isUnlocked
                    userId, // viewer_following
                    userId, // ad_viewed
                    userId, // v.user_id
                    userId, // not_interested
                    userId, // blocked_users (blocked_by)
                    userId, // blocked_users (blocked_id)
                    userId, // followers
                    userId, // reports
                    parseInt(from), 
                    parseInt(threshold)
                ];
    
            } else {
                query = `
                    SELECT s.title as 'sound_title', 
                           albumPhotoUrl, 
                           (? = v.user_id) as viewer_own, 
                           v.*, 
                           u.name, 
                           u.profilePicture, 
                           u.username, 
                           u.levelXP, 
                           EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, 
                           CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, 
                           EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, 
                           (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts, 
                           LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score,
                           CASE WHEN av.video_id IS NULL THEN 0 ELSE 1 END AS viewed
                    FROM videos v 
                    JOIN users u ON u.id = v.user_id 
                    LEFT JOIN sounds s ON s.id = v.soundId 
                    LEFT JOIN ad_viewed av ON av.video_id = v.id AND av.user_id = ?
                    WHERE v.title LIKE CONCAT('%', ?, '%')
                      AND v.isPrivate = 0
                      AND v.user_id != ?
                      AND NOT EXISTS (SELECT 1 FROM blocked_users WHERE (blocked_id = v.user_id AND blocked_by = ?) 
                                      OR (blocked_id = ? AND blocked_by = v.user_id)) 
                      AND NOT EXISTS (SELECT 1 FROM followers WHERE follower = ? AND following = v.user_id)
                    ORDER BY viewed ASC, RAND()
                    LIMIT ?, ?;
                `;
                params = [
                    userId, // viewer_own
                    userId, // viewer_liked
                    userId, // isUnlocked
                    userId, // viewer_following
                    userId, // ad_viewed
                    searchQuery, // searchQuery
                    userId, // v.user_id
                    userId, // blocked_users (blocked_by)
                    userId, // blocked_users (blocked_id)
                    userId, // followers
                    parseInt(from), 
                    parseInt(threshold)
                ];
            }
    
            query = mysql.format(query, params);
    
            this.pool.getConnection((err, connection) => {
                if (err) {
                    console.error(err);
                    return reject([]);
                }
    
                connection.query(query, async (err, results) => {
                    connection.release();
                    if (err) {
                        console.error(err);
                        return resolve([]);
                    }
    
                    try {
                        const videos = [];
                        const userIds = new Set();
                        for (const e of results) {
                            if (!userIds.has(e.user_id)) {
                                userIds.add(e.user_id);
                                const levels = null; // Or fetch levels if necessary
                                const videoObj = this.parseVideoObject(e);
                                videoObj.user.level = levels ? levels : null;
                                videos.push(videoObj);
                            }
                        }
                        resolve(videos);
                    } catch (error) {
                        console.error(error);
                        resolve([]);
                    }
                });
            });
        });
    }
    

    deductCredit(authUserId, budget) {
        return new Promise(async (resolve) => {
          const promisePool = this.pool.promise();
          const connection = await promisePool.getConnection();
    
          // Check if user details exist
          const [checkRows, checkFields] = await promisePool.query(
            "SELECT credit FROM users WHERE id = ?;",
            [authUserId]
          );
          if (checkRows.length > 0) {
            // If user details exist, update them
            const updateParams = [budget, authUserId];
            const [updateRows, updateFields] = await promisePool.query(
              "UPDATE users SET credit = credit - ? WHERE id = ?;",
              updateParams
            );
            connection.release();
            resolve(updateRows);
          } else {
            resolve(null);
          }
          connection.release();
        });
      }
    

    getSound(userId, soundId) {
        return new Promise(resolve => {
            var query = "SELECT *, EXISTS(SELECT sound_id from sound_favorites WHERE sound_id = ? AND user_id = ?) as isFav FROM sounds WHERE id = ?";
            var params = [soundId, userId, soundId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve(null);
                    } else {
                        if (results.length > 0) {
                            const e = results[0];
                            const sound = this.parseSoundObject(e);
                            const soundVideos = await this.getSoundVideos(connection, userId, e.id);
                            sound.totalVideos = soundVideos.length
                            sound.videos = soundVideos;
                            resolve(sound);
                        } else {
                            resolve(null);
                        }
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getDiscoverSounds(userId, searchQuery, from = 0, threshold = 10) {
        return new Promise(resolve => {
            if (searchQuery == "") {
                var query = "SELECT * FROM sounds ORDER BY admin DESC, videos DESC LIMIT ?, ?";
                var params = [parseInt(from), parseInt(threshold)];
            } else {
                var query = "SELECT * FROM sounds WHERE title LIKE CONCAT('%', ?, '%') ORDER BY videos DESC LIMIT ?, ?";
                var params = [searchQuery, parseInt(from), parseInt(threshold)]
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                        connection.release();
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                const sound = this.parseSoundObject(e);
                                const soundVideos = await this.getSoundVideos(connection, userId, e.id);
                                sound.totalVideos = soundVideos.length
                                sound.videos = soundVideos;
                                videos.push(sound);
                            }
                        }
                        connection.release();
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getFavSounds(userId) {
        return new Promise(resolve => {
            var query = "SELECT s.*, fs.* FROM sounds s JOIN sound_favorites fs ON fs.sound_id = s.id WHERE fs.user_id = ?";
            var params = [userId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                        connection.release();
                    } else {
                        var sounds = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                const sound = this.parseSoundObject(e);
                                sounds.push(sound);
                            }
                        }
                        connection.release();
                        resolve(sounds);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getProfileVideos(userId, profileId, filter = "normal", from = 0) {
        return new Promise(resolve => {
            if (filter == "premium") {
                var query = "SELECT s.title as 'sound_title',  v.*, (? = v.user_id) as viewer_own, u.name, u.profilePicture, u.username, u.levelXP, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.user_id = ? AND v.isExclusive = 1 AND v.ad_id = 0 GROUP BY v.id ORDER BY v.id DESC LIMIT ?, 10";
            } else if (filter == "liked") {
                var query = "SELECT s.title as 'sound_title', v.*, (? = v.user_id) as viewer_own,  u.name, u.profilePictureBase64, u.username, u.levelXP, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM likes l JOIN videos v ON v.id = l.video_id JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE l.user_id = ? AND v.ad_id = 0 ORDER BY l.id DESC LIMIT ?, 10";
            } else if (filter == "bookmarks") {
                var query = "SELECT s.title as 'sound_title', v.*, (? = v.user_id) as viewer_own,  u.name, u.profilePictureBase64, u.username, u.levelXP, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM likes l JOIN videos v ON v.id = l.video_id JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE l.user_id = ? AND v.ad_id = 0 ORDER BY l.id DESC LIMIT ?, 10";
            } else if (filter == "private") {
                var query = "SELECT s.title as 'sound_title',  v.*, (? = v.user_id) as viewer_own, u.name, u.profilePicture, u.username, u.levelXP, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.user_id = ? AND v.isPrivate = 1 AND v.ad_id = 0 GROUP BY v.id ORDER BY v.id DESC LIMIT ?, 10";
            } else {
                // Normal query
                var query = "SELECT s.title as 'sound_title',  v.*, (? = v.user_id) as viewer_own, u.name, u.profilePicture, u.username, u.levelXP, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, (SELECT COUNT(*) FROM comments WHERE video_id = v.id) AS commentCounts, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.user_id = ? AND v.ad_id = 0 AND v.isExclusive = 0 AND v.isPrivate = 0 GROUP BY v.id ORDER BY v.id DESC  LIMIT ?, 10";
                // var query = "SELECT s.title as 'sound_title', (? = v.user_id) as viewer_own, v.*, u.name, u.profilePictureBase64, u.username, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score FROM videos v JOIN users u ON u.id = v.user_id JOIN sounds s ON s.id = v.soundId WHERE v.isPrivate = 0 GROUP BY v.id ORDER BY score DESC LIMIT ?, 15";
            }
            var params = [userId, userId, userId, userId, profileId, parseInt(from)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                // videos.push(this.parseVideoObject(e));
                                const levels = null;
                                const videoObj = this.parseVideoObject(e);
                                videoObj.user.level = levels ? levels : null;
                                videos.push(videoObj);
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    addComment(userId, videoId, comment, commentId) {
        return new Promise(resolve => {
            var query = "INSERT INTO comments (user_id, video_id, comment, parentId, commentTime) VALUES (?, ?, ?, ?, ?)";
            var params = [userId, videoId, comment, commentId, getTime()];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.error(err);
                    if (err) {
                        resolve(null);
                        return;
                    } else {
                        if (results.insertId > 0) {
                            await connection.execute("UPDATE videos SET comments = comments + 1 WHERE id = ?", [videoId]);
                        }
                        if (commentId > 0) {
                            await connection.execute("UPDATE comments SET replies = replies + 1 WHERE id = ?", [commentId]);
                        }
                        resolve({
                            "id": results.insertId,
                        });
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getReplies(userId, commentId, from = 0) {
        return new Promise(resolve => {
            var query = "SELECT c.*, u.name, u.profilePicture, u.username, EXISTS(SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = c.id) as liked, CASE WHEN EXISTS(SELECT user_id FROM comments WHERE user_id = ? AND id = c.id) THEN 1 ELSE 0 END as own FROM comments c JOIN users u ON u.id = c.user_id WHERE parentId = ?";
            var params = [userId, userId, commentId, parseInt(from)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var comments = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                comments.push({
                                    "id": e.id,
                                    "comment": e.comment,
                                    "own": e.own == 1,
                                    "liked": e.liked == 1,
                                    "video_id": e.video_id,
                                    "time": e.commentTime,
                                    "replies": e.replies,
                                    "likes": e.likes,
                                    "user": {
                                        "id": e.user_id,
                                        "name": e.name,
                                        "username": e.username,
                                        "profilePicture": e.profilePicture,
                                    },
                                });
                            }
                        }
                        resolve(comments);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    // getComments(userId, videoId, from = 0) {
    //     return new Promise((resolve) => {
    //       console.log("userId, videoId", userId, videoId);
    //       var query =
    //         "SELECT c.*, u.name, u.profilePicture, u.username, EXISTS(SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = c.id) as liked, CASE WHEN EXISTS(SELECT user_id FROM comments WHERE user_id = ? AND id = c.id) THEN 1 ELSE 0 END as own FROM comments c JOIN users u ON u.id = c.user_id WHERE video_id = ? AND parentId = 0";
    //       var params = [userId, userId, userId, videoId, parseInt(from)];
    //       query = mysql.format(query, params);
    //       this.pool.getConnection(
    //         function (err, connection) {
    //           connection.query(
    //             query,
    //             async function (err, results, fields) {
    //               connection.release();
    //               if (err) {
    //                 console.error(err);
    //                 console.error(results);
    //                 resolve([]);
    //               } else {
    //                 var comments = [];
    //                 if (results.length > 0) {
    //                   for (let i = 0; i < results.length; i++) {
    //                     const e = results[i];
    //                             comments.push({
    //                                 "id": e.id,
    //                                 "comment": e.comment,
    //                                 "own": e.own == 1,
    //                                 "liked": e.liked == 1,
    //                                 "video_id": e.video_id,
    //                                 "time": e.commentTime,
    //                                 "replies": e.replies,
    //                                 "likes": e.likes,
    //                                 "user": {
    //                                     "id": e.user_id,
    //                                     "name": e.name,
    //                                     "username": e.username,
    //                                     "profilePicture": e.profilePicture,
    //                                 },
    //                             });
    //                   }
    //                 }
    //                 console.log("comments", comments);
    //                 resolve(comments);
    //               }
    //             }.bind(this)
    //           );
    //         }.bind(this)
    //       );
    //     });
    //   }

    getComments(userId, videoId, from = 0) {
        return new Promise(resolve => {
            const query = `
                SELECT c.*, u.name, u.profilePicture, u.username,
                    EXISTS(SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = c.id) AS liked,
                    CASE WHEN c.user_id = ? THEN 1 ELSE 0 END AS own,
                    (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likeCount,
                    (SELECT COUNT(*) FROM comments WHERE parentId = c.id) AS repliesCount
                FROM comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.video_id = ? AND c.parentId = 0
                LIMIT ?, 10`;
            const params = [userId, userId, videoId, parseInt(from)];
            
            const formattedQuery = mysql.format(query, params);
            
            this.pool.getConnection((err, connection) => {
                if (err) {
                    console.error(err);
                    resolve([]);
                    return;
                }
                
                connection.query(formattedQuery, async (err, results) => {
                    connection.release();
                    if (err) {
                        console.error(err);
                        resolve([]);
                        return;
                    }
                    
                    const comments = results.map(e => ({
                        id: e.id,
                        comment: e.comment,
                        own: e.own === 1,
                        liked: e.liked === 1,
                        video_id: e.video_id,
                        time: e.commentTime,
                        replies: e.repliesCount, // Use repliesCount here
                        likes: e.likeCount,
                        user: {
                            id: e.user_id,
                            name: e.name,
                            username: e.username,
                            profilePicture: e.profilePicture,
                        },
                    }));
                    
                    resolve(comments);
                });
            });
        });
    }
    

    

    deleteProfile(userId) {
        return new Promise(resolve => {
            this.pool.getConnection(async function (err, connection) {
                var query = "DELETE FROM users WHERE id = ?";
                var params = [userId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        resolve(null);
                    } else {
                        if (results.affectedRows > 0) {
                            connection.execute("DELETE FROM messages WHERE user_id = ? OR receiver_id = ?", [
                                userId,
                                userId
                            ]);
                            connection.execute("DELETE FROM posts WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM videos WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM post_comments WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM comments WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM bookmark WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM followers WHERE follower = ? OR following = ?", [
                                userId,
                                userId
                            ]);
                            connection.execute("DELETE FROM notifications WHERE userId = ? OR receiverId = ?", [
                                userId,
                                userId
                            ]);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                    connection.release();
                });
            });
        });
    }

    updateUserToken(userId, token) {
        return new Promise(async (resolve, reject) => {
            const promisePool = this.pool.promise();
            let connection;
            try {
                connection = await promisePool.getConnection();
                // Check if the token already exists for the user
                const [existingTokenRows, existingTokenFields] = await connection.query(
                    "SELECT * FROM user_fcm_tokens WHERE user_id = ? AND fcm_token = ?",
                    [userId, token]
                );
    
                if (existingTokenRows.length > 0) {
                    // Token already exists, no need to insert
                    resolve(true);
                } else {
                    // Token does not exist, insert it
                    const [insertRows, insertFields] = await connection.query(
                        "INSERT INTO user_fcm_tokens (user_id, fcm_token) VALUES (?, ?)",
                        [userId, token]
                    );
                    if (insertRows.affectedRows > 0) {
                        resolve(token);
                    } else {
                        resolve(false);
                    }
                }
            } catch (error) {
                reject(error);
            } finally {
                if (connection) {
                    connection.release();
                }
            }
        });
    }

    updateToken(userId, token) {
        return new Promise(async (resolve, reject) => {
            const promisePool = this.pool.promise();
            console.log("Db handler", userId, token)
            let connection;
            try {
                connection = await promisePool.getConnection();
                const [rows, fields] = await connection.query('UPDATE users SET token = ? WHERE id = ?', [token, userId]);
                console.log(rows);
                if (rows.affectedRows > 0) {
                    const [result] = await connection.query('SELECT token from users where id = ?', [userId]);
                    console.log(result);
                    resolve(result);
                    return;
                }
                resolve(false);
            } catch (error) {
                reject(error);
            } finally {
                if (connection) {
                    connection.release();
                }
            }
        });
    }

    getExploreBanners() {
        return new Promise(resolve => {
            var query = "SELECT * FROM banners";
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var banners = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                banners.push(e);
                            }
                        }
                        resolve(banners);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getTags() {
        return new Promise(resolve => {
            var query = "SELECT * FROM tags ORDER BY totalVideos DESC LIMIT 10";
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var coins = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                coins.push({
                                    "id": e.id,
                                    "tag": e.tag,
                                    "totalVideos": e.totalVideos
                                });
                            }
                        }
                        resolve(coins);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getExploreTags(userId, from = 0) {
        return new Promise(resolve => {
            var query = "SELECT * FROM tags WHERE totalVideos != 0 ORDER BY priority DESC LIMIT ?, 10";
            var params = [parseInt(from)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var tags = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                const videos = await this.getTagVideos(connection, userId, e.id);
                                console.log("getTagVideos", videos.length)
                                const tag = {
                                    "id": e.id,
                                    "views": e.views,
                                    "tag": e.tag,
                                    "totalVideos": videos.length,
                                    "videos": videos,
                                };
                                if (videos.length > 0) tags.push(tag);
                            }
                        }
                        resolve(tags);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getTagDetails(userId, tagId, tagName = "") {
        return new Promise(resolve => {
            var query = "SELECT * FROM tags WHERE tag = ?";
            var params = [tagName];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve(null);
                    } else {
                        if (results.length > 0) {
                            const e = results[0];
                            const videos = await this.getTagVideos(connection, userId, e.id)
                            console.log("getTagVideos", videos.length)
                            const tag = {
                                "id": e.id,
                                "views": e.views,
                                "tag": e.tag,
                                "totalVideos": videos.length,
                                "videos": videos,
                            };
                            resolve(tag);
                        } else {
                            resolve(null);
                        }
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getTagVideos(connection, userId, tagId, from = 0) {
        return new Promise(resolve => {
            var query = "SELECT s.title AS 'sound_title', v.*, u.name, u.profilePictureBase64, u.username, u.levelXP, (? = v.user_id) AS viewer_own, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END AS isUnlocked, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) AS viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId LEFT JOIN blocked_users bu ON u.id = bu.blocked_id AND bu.blocked_by = ? WHERE v.id IN (SELECT video_id FROM video_tags WHERE tag_id = ?) AND v.isPrivate = 0 AND bu.blocked_id IS NULL LIMIT ?, 1000";
            var params = [userId, userId, userId, userId, userId, tagId, parseInt(from)];
            query = mysql.format(query, params);
            connection.query(query, async function (err, results, fields) {
                if (err) {
                    console.error(err);
                    console.error(results);
                    resolve([]);
                } else {
                    var videos = [];
                    if (results.length > 0) {
                        for (let i = 0; i < results.length; i++) {
                            const e = results[i];
                            // videos.push(this.parseVideoObject(e));
                            const levels = null;
                            const videoObj = this.parseVideoObject(e);
                            videoObj.user.level = levels ? levels : null;
                            videos.push(videoObj);
                        }
                    }
                    resolve(videos);
                }
                connection.release();
            }.bind(this));
        });
    }

    getSoundVideos(connection, userId, soundId, from = 0) {
        return new Promise(resolve => {
            if (connection) {
                var query = "SELECT s.title as 'sound_title', v.*, u.name, u.profilePictureBase64, u.username, (? = v.user_id) as viewer_own, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId AND v.isPrivate = 0 WHERE s.id = ? LIMIT ?, 10";
                var params = [userId, userId, userId, userId, soundId, parseInt(from)];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                videos.push(this.parseVideoObject(e));
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            } else {
                this.pool.getConnection(function (err, connection) {
                    var query = "SELECT s.title as 'sound_title', v.*, u.name, u.profilePictureBase64, u.username, (? = v.user_id) as viewer_own, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId AND v.isPrivate = 0 WHERE s.id = ? LIMIT ?, 10";
                    var params = [userId, userId, userId, userId, soundId, parseInt(from)];
                    query = mysql.format(query, params);
                    connection.query(query, async function (err, results, fields) {
                        connection.release();
                        if (err) {
                            console.error(err);
                            console.error(results);
                            resolve([]);
                        } else {
                            var videos = [];
                            if (results.length > 0) {
                                for (let i = 0; i < results.length; i++) {
                                    const e = results[i];
                                    videos.push(this.parseVideoObject(e));
                                }
                            }
                            resolve(videos);
                        }
                    }.bind(this));
                }.bind(this));
            }
        });
    }

    parseUserObject(obj) {
        return {
            "id": obj["id"],
            "name": obj["name"] ?? "",
            "username": obj["username"],
            "profilePicture": obj["profilePicture"] ?? "",
            "about": obj["about"] ?? "",
            "country": obj["country"] ?? "",
            "twitter": obj["twitter"] ?? "",
            "instagram": obj["instagram"] ?? "",
            "facebook": obj["facebook"] ?? "",
            "isVerified": obj["isVerified"] == 1,
            "totalVideos": obj["videos"],
            "totalViews": obj["totalViews"],
            "totalGifts": obj["totalGifts"],
            "blocked": obj["blocked"] == 1,
            "totalFollowers": obj["followers"],
            "totalFollowings": obj["followings"],
            "totalLikes": obj["totalLikes"],
            "totalLiked": obj["totalLiked"],
            "isPrivateLikes": obj["isPrivateLikes"] == 1,
            "following": obj["following"] == 1,
            "coins": obj["coins"],
            "products": obj["products"],
            "own": obj["viewer_own"] == 1,
            "public_key": {
                "public_exponent": obj["public_exponent"],
                "public_modulus": obj["public_modulus"]
            },
        };
    }

    parsePostObject(obj) {
        return {
            "id": obj["id"],
            "caption": obj["caption"],
            "contentData": obj["contentData"],
            "tags": obj["tags"],
            "liked": obj["viewer_liked"] == 1,
            "viewed": obj["viewed"] == 1,
            "allowComments": obj["allowComments"] == 1,
            "allowSharing": obj["allowSharing"] == 1,
            "allowGifts": obj["allowGifts"] == 1,
            "exclusiveCoins": obj["exclusiveAmount"],
            "locked": obj["isUnlocked"] == 0,
            "likes": obj["likes"],
            "comments": obj["comments"],
            "gifts": obj["gifts"] ?? 0,
            // User node
            "user": {
                "id": obj["user_id"],
                "name": obj["name"],
                "profilePicture": obj["profilePicture"] ?? "",
                "following": obj["following"] == 1,
                "levelBadge": obj["levelBadge"] ?? "",
                "levelName": obj["levelName"] ?? "",
                "levelIcon": obj["levelIcon"] ?? "",
                "levelColor": obj["levelColor"] ?? "",
                "own": obj["viewer_own"] == 1,
            },
        };
    }

    insertVerification(userId, contentUrl, message) {
        return new Promise(async (resolve, reject) => {
          var status = 0;
          var query =
            "INSERT INTO verification_requests (user_id, verificationMessage, documentSnap, creationTime, status) VALUES (?, ?, ?, CURRENT_TIMESTAMP(), ?)";
          var params = [userId, message, contentUrl, status];
          query = mysql.format(query, params);
          this.pool.getConnection(
            async function (err, connection) {
              connection.query(
                query,
                async function (err, results, fields) {
                  connection.release();
                  
                  if (err) {
                    console.error(err);
                    resolve(null);
                  } else {
                    resolve(results);
                  }
                }.bind(this)
              );
            }.bind(this)
          );
        });
      }

      checkVerification(userId) {
        return new Promise((resolve) => {
          var query = "SELECT status FROM verification_requests WHERE user_id = ?";
          var params = [userId];
          query = mysql.format(query, params);
          this.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, results, fields) {
              connection.release();
              if (err) {
                console.error(err);
                console.error(results);
                resolve([]);
              } else {
                resolve(results[0]);
              }
            });
          });
        });
      }

    insertSubscriptionBankDetails(
        userId,
        firstName,
        lastName,
        email,
        address,
        bank_name,
        acc_no,
        iban_no
      ) {
        return new Promise(
          function (resolve, reject) {
            var query =
              "INSERT INTO creator_info (user_id, first_name, last_name, email, address, bank_name, acc_no, iban_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            var params = [
              userId,
              firstName,
              lastName,
              email,
              address,
              bank_name,
              acc_no,
              iban_no,
            ];
            query = mysql.format(query, params);
            this.pool.getConnection(
              function (err, connection) {
                if (err) {
                  reject(err);
                  return;
                }
                connection.query(query, async function (err, results, fields) {
                  connection.release();
                  
                  if (err) {
                    reject(err);
                    return;
                  } else {
                    if (results.affectedRows > 0) {
                      resolve({
                        status: true,
                        message: "You subscribed successfully.",
                      });
                    } else {
                      resolve({ status: false, message: "Subscription Failed." });
                    }
                  }
                });
              }.bind(this)
            );
          }.bind(this)
        );
      }

    parseVideoObject(obj) {
        var i = {
            "id": obj["id"] ?? 0,
            "title": obj["title"] ?? "",
            "tags": obj["tags"] ?? "",
            "gifUrl": obj["videoGifUrl"],
            "thumbnailUrl": obj["thumbnailUrl"],
            "videoUrl": obj["videoUrl"] ?? "",
            "liked": obj["viewer_liked"] == 1,
            "viewed": obj["viewed"] == 1,
            "own": obj["viewer_own"] == 1,
            "allowDuet": obj["allowDuet"] == 1,
            "allowComments": obj["allowComments"] == 1,
            "allowSharing": obj["allowSharing"] == 1,
            "allowGifts": obj["allowGifts"] == 1,
            "exclusiveCoins": obj["exclusiveAmount"] ?? 0,
            "locked": obj["isUnlocked"] == 0,
            "likes": obj["likes"] ?? 0,
            "timestamp": obj["videoTime"] ?? 0,
            "comments": obj["commentCounts"] ?? 0,
            "gifts": obj["rewards"] ?? 0,
            "height": obj["height"],
            "width": obj["width"],
            "views": obj["views"],
            "clickable_url" :  `https://yidtok.com/refer/videos/${obj["id"]}` ?? obj["clickableUrl"],
            // User node
            "user": {
                "id": obj["user_id"] ?? 0,
                "name": obj["name"] ?? "",
                "username": obj["username"] ?? "",
                "picture": obj["profilePicture"] ?? "",
                "following": obj["viewer_following"] == 1,
                "levelBadge": obj["levelBadge"] ?? "",
                "levelName": obj["levelName"] ?? "",
                "levelIcon": obj["levelIcon"] ?? "",
                "levelColor": obj["levelColor"] ?? "",
            },
        };
        if (obj.soundId) {
            i['sound'] = {
                "id": obj["soundId"] ?? 0,
                "title": obj["sound_title"] ?? "",
                "icon": obj["albumPhotoUrl"] ?? "",
            };
        }
        return i;
    }

    parseAdVideoObject(obj) {
        var i = {
            "id": obj["id"] ?? 0,
            "title": obj["title"] ?? "",
            "tags": obj["tags"] ?? "",
            "gifUrl": obj["videoGifUrl"],
            "thumbnailUrl": obj["thumbnailUrl"],
            "videoUrl": obj["videoUrl"] ?? "",
            "clickable_url": obj["clickable_url"] ?? "",
            "budget": obj["budget"] ?? 0,
            "targetViews": obj["days_count"] ?? 0,
            "liked": obj["viewer_liked"] == 1,
            "duration": obj["total_duration"] ?? 0,
            "viewed": obj["viewed"] == 1,
            "own": true,
            "isAd": 1,
            "allowDuet": obj["allowDuet"] == 0,
            "allowComments": obj["allowComments"] == 0,
            "allowSharing": obj["allowSharing"] == 1,
            "allowGifts": obj["allowGifts"] == 1,
            "exclusiveCoins": obj["exclusiveAmount"] ?? 0,
            "locked": obj["isUnlocked"] == 0,
            "likes": obj["likes"] ?? 0,
            "comments": obj["comments"],
            "gifts": obj["gifts"] ?? 0,
            "views": obj["total_views"],
            // User node
            "user": {
                "id": obj["user_id"] ?? 0,
                "name": obj["name"] ?? "",
                "username": obj["username"] ?? "",
                "picture": obj["profilePicture"] ?? "",
                "levelBadge": obj["levelBadge"] ?? "",
                "levelName": obj["levelName"] ?? "",
                "levelIcon": obj["levelIcon"] ?? "",
                "levelColor": obj["levelColor"] ?? "",
            },
        };
        if (obj.soundId) {
            i['sound'] = {
                "id": obj["soundId"] ?? 0,
                "title": obj["sound_title"] ?? "",
                "icon": obj["albumPhotoUrl"] ?? "",
            };
        }
        return i;
    }

    parseSoundObject(obj) {
        var i = {
            "id": obj["id"] ?? 0,
            "title": obj["title"] ?? "",
            "icon": obj["albumPhotoUrl"] ?? "",
            "soundUrl": obj["soundUrl"] ?? "",
            "artist": obj["artist"] ?? "",
            "favorite": obj["isFav"] == 1,
            "duration": obj["duration"] ?? "",
            "totalVideos": obj["videos"] ?? "",
        };
        if (obj.name) {
            i['user'] = {
                "id": obj["user_id"] ?? 0,
                "name": obj["name"] ?? "",
                "username": obj["username"] ?? "",
                "picture": obj["profilePicture"],
                "levelBadge": obj["levelBadge"] ?? "",
                "levelNumber": obj["levelNumber"] ?? 1,
                "levelIcon": obj["levelIcon"] ?? "",
                "levelColor": obj["levelColor"] ?? "",
            };
        }
        return i;
    }

    // Messaging Module

    getInbox(authUserId, from, threshold = 10) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT DISTINCT u.isVerified, u.id as userId, CASE WHEN m.user_id = ? THEN r.name ELSE s.name END AS IbName, CASE WHEN m.user_id = ? THEN 1 ELSE 0 END AS isOwn, CASE WHEN m.user_id = ? THEN r.profilePicture ELSE s.profilePicture END AS IbProfilePicture, m.id, m.message, m.`sentTime`, m.deliveredTime, m.seenTime, (SELECT COUNT(*) from messages WHERE (user_id = ? AND receiver_id = m.receiver_id AND seenTime = 0) OR (user_id = m.user_id AND receiver_id = ? AND seenTime = 0)) AS messageCount FROM messages m JOIN users r ON m.receiver_id = r.id JOIN users s ON m.user_id = s.id JOIN users u ON u.id = CASE WHEN m.user_id = ? THEN m.receiver_id ELSE m.user_id END JOIN ( SELECT CASE WHEN user_id = ? THEN receiver_id ELSE user_id END AS chat_partner_id, MAX(sentTime) AS max_sent_time FROM messages WHERE user_id = ? OR receiver_id = ? GROUP BY chat_partner_id ) max_sent_times ON CASE WHEN m.user_id = ? THEN m.receiver_id ELSE m.user_id END = max_sent_times.chat_partner_id AND m.`sentTime` = max_sent_times.max_sent_time ORDER BY m.sentTime DESC LIMIT ?,?";
            var params = [authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        resolve(false);
                    } else {
                        let messages = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const message = results[i];
                                messages.push({
                                    "messageCount": message.messageCount,
                                    "messageId": message.id,
                                    "message": {
                                        type: JSON.parse(message.message).type,
                                        message: JSON.parse(message.message).text
                                    },
                                    "sentTime": message.sentTime,
                                    "user": {
                                        "id": message.userId,
                                        "name": message.IbName,
                                        "profilePicture": message.IbProfilePicture,
                                        "isVerified": message.isVerified
                                    },
                                });
                            }
                            resolve(messages);
                        }
                        else {
                            resolve(null)
                        }
                    }
                });
            });
        }.bind(this));
    }

    getWallet(userId) {
        return new Promise(async resolve => {
            const config = await this.getConfigs();
            var query = "SELECT coins, gems, credit from users WHERE id = ?";
            var params = [userId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) reject(err);
                    if (results.length > 0) {
                        resolve({
                            "minimum_withdrawal": parseInt(config["minimum_withdrawal"]) ?? 0,
                            "conversion_rate": parseInt(config["conversion_rate"]) ?? 0,
                            "commision": parseInt(config["commision"]) ?? 0,
                            "coins": results[0]['coins'] ?? 0,
                            "gems": results[0]['gems'] ?? 0,
                            "credit": results[0]['credit'] ?? 0,
                            "motd": config["motd"] ?? "",
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        });
    }

    sendGift(user, receiverId, giftInfo, body) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            const xpValues = await this.getXpValues();
            const updateXp = parseInt(xpValues["sending_gifts"]) ?? 0;
            const transferRes = await this.transferCoin(user, receiverId, giftInfo.giftCoin);
            if (transferRes) {
                // Send transaction history
                const [rows, fields] = await promisePool.query("INSERT INTO gift_history (sender_id, receiver_id, gift_id, gift_gems, sentTime) VALUES (?, ?, ?, ?, ?)", [user.id, receiverId, giftInfo.id, giftInfo.giftCoin, getTime()]);
                if (rows.affectedRows > 0) {
                    console.log(body);
                    // Increment
                    if (body['video_id']) {
                        // Video
                        await promisePool.query("UPDATE videos SET rewards = rewards + 1 WHERE id = ?", [body['video_id']]);
                        if (updateXp) {
                            console.log("Updating XP for user", updateXp)
                            await promisePool.query("UPDATE users SET levelXP = levelXP + ? WHERE id = ?", [updateXp, user.id]);
                        }
                        else {
                            console.log("Setup XP for sending gift")
                        }
                    } else if (body['stream_id']) {
                        // Stream
                        await promisePool.query("UPDATE live_streams SET rewards = rewards + 1 WHERE id = ?", [body['stream_id']]);
                        if (updateXp) {
                            console.log("Updating XP for user", updateXp)
                            await promisePool.query("UPDATE users SET levelXP = levelXP + ? WHERE id = ?", [updateXp, user.id]);
                        }
                        else {
                            console.log("Setup XP for sending gift in admin panel.")
                        }
                    } else if (body['post_id']) {
                        // Community
                        await promisePool.query("UPDATE posts SET gifts = gifts + 1 WHERE id = ?", [body['post_id']]);
                        if (updateXp) {
                            console.log("Updating XP for user", updateXp)
                            await promisePool.query("UPDATE users SET levelXP = levelXP + ? WHERE id = ?", [updateXp, user.id]);
                        }
                        else {
                            console.log("Setup XP for sending gift")
                        }
                    } else {
                        // Dismiss
                    }
                    resolve(true);
                    return;
                }
            }
            // connection.release();
            resolve(false);
        });
    }

    transferCoin(user, receiverId, amount) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            const config = await this.getConfigs();
            const conversionRate = parseInt(config["conversion_rate"]) ?? 0;
            const diamondsRequired = amount / conversionRate;
            if (user.coins >= amount) {
                // Okay
                const [rows, fields] = await promisePool.query('UPDATE users SET coins = GREATEST(coins - ?, 0) WHERE id = ?', [amount, user.id]);
                if (rows.affectedRows > 0) {
                    const [rows, fields] = await promisePool.query('UPDATE users SET gems = (gems + ?) WHERE id = ?', [diamondsRequired, receiverId]);
                    if (rows.affectedRows > 0) {
                        await promisePool.query('UPDATE users SET totalGifts = totalGifts + 1 WHERE id = ?', [receiverId]);
                        resolve({
                            coins: amount,
                        }); // Transaction ahs been made.
                        return;
                    }
                }
                resolve(false);
            } else {
                resolve(false);
            }
            // connection.release();
        });
    }

    getLevelDetails(userObject) {
        let userXP = userObject.levelXP;
        return new Promise(async resolve => {
            this.pool.getConnection(function (err, connection) {
                // Query the levels table to get the level details
                connection.query('SELECT * FROM levels ORDER BY levelNumber ASC', (error, results, fields) => {
                    connection.release();
                    if (error) {
                        console.error('Error retrieving levels: ', error);
                        resolve(null);
                    } else {
                        let currentLevel;
                        let nextLevel;
                        let remainingXP = 0;

                        // Loop through each level to determine the current and next levels
                        for (let i = 0; i < results.length; i++) {
                            const level = results[i];

                            if (userXP < level.levelXP) {
                                nextLevel = level;
                                remainingXP = level.levelXP - userXP;
                                break;
                            }

                            currentLevel = level;
                        }
                        const levelDetails = results.map(level => ({
                            levelName: level.levelName,
                            levelBadge: level.levelBadge ?? ""
                        }));

                        // Return the current level details and remaining XP needed to reach next level
                        resolve({
                            currentLevel: currentLevel,
                            nextLevel: nextLevel,
                            remainingXP: remainingXP,
                            currentXP: userObject.levelXP,
                            levelDetails: levelDetails
                        });
                    }
                });
            });
        });
    }
    
    getCoinPackages() {
        return new Promise(resolve => {
            var query = "SELECT * FROM coins";
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var coins = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                coins.push({
                                    "id": e.id,
                                    "coins": e.coins,
                                    "price": e.price.toFixed(2),
                                    "iap": e.iap,
                                });
                            }
                        }
                        resolve(coins);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getGiftInformation(user, giftId) {
        return new Promise(resolve => {
            var query = "SELECT * FROM gifts WHERE id = ?";
            var params = [giftId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve(null);
                    } else {
                        if (results.length > 0) {
                            const e = results[0];
                            e.eligible = e.levelLimit < 10;
                            resolve(e);
                        } else {
                            resolve(null);
                        }
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    // getGiftInformation(user, giftId) {
    //     return new Promise((resolve, reject) => {
    //         const query = "SELECT * FROM gifts WHERE id = ?";
    //         const params = [giftId];
    //         const formattedQuery = mysql.format(query, params);
    
    //         this.pool.getConnection(async (err, connection) => {
    //             if (err) {
    //                 console.error(err);
    //                 reject(err);
    //                 return;
    //             }
    
    //             try {
    //                 const [results] = await connection.query(formattedQuery);
    //                 connection.release();
    
    //                 if (results.length > 0) {
    //                     const gift = results[0];
    
    //                     // Get the level limit for the gift
    //                     const levelLimitQuery = "SELECT levelXP FROM levels WHERE levelNumber = ?";
    //                     const levelLimitParams = [gift.levelLimit];
    //                     const formattedLevelLimitQuery = mysql.format(levelLimitQuery, levelLimitParams);
    
    //                     const [levelResults] = await connection.query(formattedLevelLimitQuery);
    
    //                     if (levelResults.length > 0) {
    //                         const levelThreshold = levelResults[0].xp_threshold;
    
    //                         // Check if user's levelXP is greater than or equal to the level threshold
    //                         gift.eligible = user.levelXP >= levelThreshold;
    //                     } else {
    //                         gift.eligible = false;
    //                     }
    
    //                     resolve(gift);
    //                 } else {
    //                     resolve(null);
    //                 }
    //             } catch (queryError) {
    //                 console.error(queryError);
    //                 connection.release();
    //                 resolve(null);
    //             }
    //         });
    //     });
    // }
    

    getGiftsByCategory(authId, categoryId, from = 0, threshold = 50) {
        return new Promise(resolve => {
            var query = "SELECT * FROM gifts WHERE category_id = ?";
            var params = [categoryId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var gifts = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                e.eligible = e.levelLimit < 5;
                                gifts.push(e);
                            }
                        }
                        resolve(gifts);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getGiftCategories(authId) {
        return new Promise(resolve => {
            var query = "SELECT * FROM gift_categories";
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var categories = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                e.gifts = await this.getGiftsByCategory(authId, e.id);
                                categories.push(e);
                            }
                        }
                        resolve(categories);
                    }
                }.bind(this));
            }.bind(this));
        });
    }


    getMessages(authUserId, userId, from, threshold = 10) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT m.*, r.name AS receiverName, r.isVerified AS receiverVerified, r.`profilePicture` AS receiverProfilePicture, s.name AS senderName, s.isVerified AS senderVerified, s.`profilePicture` AS senderProfilePicture, CASE WHEN m.user_id = ? THEN 1 ELSE 0 END AS isOwn FROM messages m JOIN users r ON m.receiver_id = r.id JOIN users s ON m.user_id = s.id WHERE ((user_id = ? AND receiver_id = ?) OR (user_id = ? AND receiver_id = ?)) ORDER BY `sentTime` ASC LIMIT ?, ?";
            var params = [authUserId, authUserId, userId, userId, authUserId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        resolve(false);
                    } else {
                        let messages = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const message = results[i];
                                // messages.push(message)
                                messages.push({
                                    "messageId": message.id,
                                    "sentTime": message.sentTime,
                                    "deliveredTime": message.deliveredTime,
                                    "seenTime": message.seenTime,
                                    "ack": message.ack,
                                    "isOwn": message.isOwn,
                                    "message": {
                                        type: JSON.parse(message.message).type,
                                        message: JSON.parse(message.message).text
                                    },
                                    "sentTime": message.sentTime,
                                    "sender": {
                                        "id": message.user_id,
                                        "name": message.senderName,
                                        "profilePicture": message.senderProfilePicture,
                                        "isVerified": message.senderVerified
                                    },
                                    "receiver": {
                                        "id": message.receiver_id,
                                        "name": message.receiverName,
                                        "profilePicture": message.receiverProfilePicture,
                                        "isVerified": message.receiverVerified
                                    },
                                });
                            }
                            resolve(messages);
                        }
                        else {
                            resolve(null)
                        }
                    }
                });
            });
        }.bind(this));
    }

    getPendingMessages(userId) {
        return new Promise(async resolve => {
            this.pool.getConnection(async function (err, connection) {
                var query = "SELECT m.*, u.name, u.profilePicture FROM messages m JOIN users u ON u.id = m.user_id WHERE m.deliveredTime = 0 AND m.receiver_id = ?";
                var params = [userId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    // connection.release();
                    var messages = [];
                    for (let i = 0; i < results.length; i++) {
                        const message = results[i];
                        messages.push({
                            "serverMessageId": message.id,
                            "message": message.message,
                            "sentTime": message.sentTime,
                            "user": {
                                "id": message.user_id,
                                "name": message.name,
                                "profilePicture": message.profilePicture,
                            },
                        });
                    }
                    connection.release();
                    resolve(messages);
                });
            });
        });
    }

    addMessage(user, conversationId, message, isAdmin = false) {
        return new Promise(async function (resolve, reject) {
            this.pool.getConnection(async function (err, connection) {
                var canMessage = true;
                // Check if sender is blocked by receiver
                const isSenderBlocked = await this.isBlocked(user.id, conversationId);
                if (isSenderBlocked) {
                    connection.release();
                    resolve(null);
                    return;
                }

                // Check if receiver is blocked by sender
                const isReceiverBlocked = await this.isBlocked(conversationId, user.id);
                if (isReceiverBlocked) {
                    connection.release();
                    resolve(null);
                    return;
                }
                if (canMessage || isAdmin) {
                    var query = "INSERT INTO messages (user_id, receiver_id, message, sentTime, ack) VALUES (?, ?, ?, ?, 1);";
                    const createTime = parseInt((new Date().getTime() / 1000).toFixed(0));
                    var params = [user.id, conversationId, message, createTime];
                    query = mysql.format(query, params);
                    connection.query(query, async function (err, results, fields) {
                        connection.release();
                        if (err) {
                            console.error("Error: ", err);
                            resolve(null);
                            return;
                        } else {
                            if (results.insertId > 0) {
                                resolve({
                                    "serverMessageId": results.insertId,
                                    "message": message,
                                    "timestamp": createTime,
                                    "user": {
                                        id: user.id,
                                        name: user.name,
                                        profilePicture: user.profilePicture,
                                    },
                                });
                            } else {
                                resolve(null);
                                return;
                            }
                        }
                    });
                } else {
                    connection.release();
                    resolve(null);
                }
            }.bind(this));
        }.bind(this));
    }

    isBlocked(userId, blockedUserId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM blocked_users WHERE blocked_by = ? AND blocked_id = ?';
            const params = [userId, blockedUserId];
            const formattedQuery = mysql.format(query, params);

            this.pool.getConnection((err, connection) => {
                if (err) {
                    reject(err);
                    return;
                }

                connection.query(formattedQuery, (err, results, fields) => {
                    connection.release();

                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(results.length > 0);
                });
            });
        });
    }

    checkUsername(values) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE username = ?";
            var params = [values.username];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        resolve(user);
                    } else {
                        connection.release();
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }

    updateProfile(userId, values) {
        return new Promise(async (resolve, reject) => {
            const existingUser = await this.checkUsername(values);
            if (existingUser) {
                resolve(null);
                return;
            }

            const query = 'UPDATE users SET ? WHERE id = ?';
            const params = [values, userId];
            const formattedQuery = mysql.format(query, params);

            this.pool.getConnection((err, connection) => {
                if (err) {
                    reject(err);
                    return;
                }

                connection.query(formattedQuery, (err, results, fields) => {
                    connection.release();

                    if (err) {
                        reject(err);
                        return;
                    }

                    if (results.affectedRows > 0) {
                        resolve(values);
                    } else {
                        resolve(null);
                    }
                });
            });
        });
    }

    messageDelivered(conversationId, serverMessageId) {
        return new Promise(function (resolve, reject) {
            this.pool.getConnection(async function (err, connection) {
                var query = "UPDATE messages SET deliveredTime = ?, ack = 0 WHERE id = ?";
                const createTime = getTime();
                var params = [createTime, serverMessageId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("Error: ", err);
                        resolve(null);
                        return;
                    } else {
                        if (results.affectedRows > 0) {
                            resolve({
                                "serverMessageId": serverMessageId,
                                "timestamp": createTime,
                            });
                        } else {
                            resolve(null);
                            return;
                        }
                    }
                });
            });
        }.bind
            (this));
    }

    updateUserCoins(userId, coins) {
        return new Promise(
          async function (resolve, reject) {
            var query =
              "UPDATE users SET coins = GREATEST(coins + ?, 0) WHERE id = ?";
            var params = [coins, userId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
              connection.query(query, function (err, results, fields) {
                console.error(err);
                connection.release();
                if (err) {
                  resolve(null);
                  return;
                }
                if (results.affectedRows > 0) {
                  resolve(coins);
                } else {
                  resolve(null);
                }
              });
            });
          }.bind(this)
        );
      }
    
      getCoinDetails(code) {
        return new Promise(
          function (resolve, reject) {
            var query = "SELECT * FROM coins WHERE iap = ?";
            var params = [code];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
              connection.query(query, function (err, results, fields) {
                connection.release();
                if (err) {
                  console.error("[Error]", err);
                  resolve(null);
                  return;
                }
                if (results && results.length > 0) {
                  var user = results[0];
                  resolve(user);
                } else {
                  connection.release();
                  resolve(null);
                }
              });
            });
          }.bind(this)
        );
      }
    
      insertTransaction(userId, amount, data, type) {
        return new Promise(async (resolve, reject) => {
          var status = 0;
          var query =
            "INSERT INTO transaction_history (user_id, paid, creationTime, transaction_metadata, transaction_type) VALUES (?, ?, ?, ?, ?)";
          var params = [userId, amount, data, type];
          query = mysql.format(query, params);
          this.pool.getConnection(
            async function (err, connection) {
              connection.query(
                query,
                async function (err, results, fields) {
                  connection.release();
                  if (err) {
                    console.error(err);
                    resolve(null);
                  } else {
                    resolve(true);
                  }
                }.bind(this)
              );
            }.bind(this)
          );
        });
      }
    
      insertTransactionHistory(
        userId,
        coins,
        price,
        productId,
        purchaseToken,
        purchaseMillis
      ) {
        return new Promise(async (resolve, reject) => {
          try {
            const promisePool = this.pool.promise();
            const connection = await promisePool.getConnection();
    
            var query =
              "INSERT INTO purchases (purchaseToken, purchaseTimeMillis, purchaseTime, coinsRewarded, productId, user_id, costing) VALUES (?, ?, CURRENT_TIMESTAMP(), ?, ?, ?, ?)";
            var params = [
              purchaseToken,
              purchaseMillis,
              coins,
              productId,
              userId,
              price,
            ];
            query = mysql.format(query, params);
    
            // Insert into purchases table
            const insertResult = await promisePool.query(query);
    
            // Replace with appropriate values for sender_id, receiver_id, and getTime()
            const senderId = userId;
            const receiverId = 0;
            const currentTime = new Date(); // Replace with the actual time
    
            // Insert into transaction_history table
            await promisePool.query(
              "INSERT INTO transaction_history (sender_id, receiver_id, paid, creationTime) VALUES (?, ?, ?, ?)",
              [senderId, receiverId, price, currentTime]
            );
    
            connection.release();
            resolve(true);
          } catch (error) {
            console.error(error);
            resolve(null);
          }
        });
      }

    messageSeen(conversationId, serverMessageId) {
        return new Promise(function (resolve, reject) {
            this.pool.getConnection(async function (err, connection) {
                var query = "UPDATE messages SET seenTime = ?, ack = 0 WHERE id = ?";
                const createTime = getTime();
                var params = [createTime, serverMessageId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("Error: ", err);
                        resolve(null);
                        return;
                    } else {
                        if (results.affectedRows > 0) {
                            resolve({
                                "serverMessageId": serverMessageId,
                                "timestamp": createTime,
                            });
                        } else {
                            resolve(null);
                            return;
                        }
                    }
                });
            });
        }.bind
            (this));
    }
}
module.exports = new DbHandler(config.dbConfig.dbHost,
    config.dbConfig.dbUsername,
    config.dbConfig.dbPassword,
    config.dbConfig.dbName,
    config.dbConfig.dbPort);