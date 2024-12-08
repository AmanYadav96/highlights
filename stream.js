const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } = require('agora-access-token')
var crypto = require("crypto");

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const configPath = './config/config.js';

// Check if the config file exists
if (!fs.existsSync(configPath)) {
    console.log(chalk.yellow('The config file does not exist. Please make sure you have configured the files before running this script.'));
    console.log(chalk.green('Closing service...'));
    process.exit();
  }

const db = require('./config/db_handler');

io.use(async (socket, next) => {
    let handshake = socket.handshake;
    if (handshake.headers.authid == global.appAuthKey) {
        if (handshake.headers.authuid) {
            const userObject = await db.getUserByAuth(handshake.headers.authuid);
            if (userObject) {
                socket.userObject = userObject;
                next();
            } else {
                socket.userObject = {
                    id: 0,
                    name: "Anonymous",
                    picture: "",
                };
            }
        } else {
            socket.userObject = {
                id: 0,
                name: "Anonymous",
                picture: "",
            };
            next();
        }
    } else {
        console.log("Unauthorized access");
        socket.disconnect();
    }
});

const streams = new Map();
/*
    StreamId: {
        streamType,
        viewersCount,
        viewers: [],
        hosts: [],
        hostId,
    }
*/
function addStreamData(streamDetails) {
    console.log(streamDetails.insertId, streamDetails);
    streams.set(streamDetails.insertId, streamDetails);
}

function getStream(streamId) {
    console.log(streamId);
    if (streams.has(streamId)) {
        return streams.get(streamId);
    } else {
        return null;
    }
}

function deleteStreamData(streamId) {
    delete streams[streamId];
}

// function increaseViewers(streamId) {
//     streams[streamId].viewers++;
// }

// function decreaseViewers(streamId) {
//     streams[streamId].viewers--;
// }

// function getStream(streamId) {
//     return streams[streamId];
// }
io.on('connection', function (client) {
    console.log('client connect...', client.id, client.userObject.name ?? "guest");
    // client.on('generateToken', async function name(data) {
    //     const isBroadcast = data["broadcast"] ?? false;
    //     client.emit("onStreamListener", {
    //         "type": "stream_token",
    //         "streamId": streamId,
    //         "streamToken": tokenA,
    //     });
    // });
    client.on('closeStream', async function name(data) {
        if (client.streamId) {
            var streamDetails = getStream(client.streamId);
            if (streamDetails && streamDetails.hostId == client.userObject.id) {
                await db.endLive(streamDetails.insertId);
                streamDetails.endStream();
                streams.delete(client.streamId);
            } else {
                console.error("[Error] Request was rejected because it was not an original host");
            }
        }
    });
    client.on('startStream', async function name(data) {
        // Get data
        // UserId
        // Uid
        if (!client.streamId) {
            // var streamId;
            // if (isBroadcast) {
            // } else {
            //     streamId = data["streamId"];
            // }
            // const tokenA = createAgoraToken(client.userObject.id ?? 0, streamId);
            // const streamId = data["streamId"];
            console.log(data);
            const streamDetails = await db.addLive(client, data.streamTitle, data.streamType, io);
            if (streamDetails) {
                const tokenA = createAgoraToken(client.userObject.id, streamDetails.streamId);
                client.join(streamDetails.streamId);
                console.log(streamDetails.getJSON);
                client.emit("onStreamListener", {
                    "error": false,
                    "type": "stream_started",
                    "streamToken": tokenA,
                    ...streamDetails.getJSON,
                });
                client.streamId = streamDetails.insertId;
                console.log(client.userObject.name + " started streaming...");
                addStreamData(streamDetails);
            } else {
                console.error(client.userObject.name + " streaming failed.");
                client.emit("onStreamListener", {
                    "error": true,
                    "type": "stream_not_started",
                    "streamId": null,
                });
            }
        } else {
            console.error("[Error] Request was rejected because there was already an on-going stream.");
        }
    });
    client.on('joinStream', async function name(data) {
        // Get data
        // streamId
        var streamDetails = getStream(data['streamId']);
        if (streamDetails) {
            const channelId = streamDetails.streamId;
            const tokenA = createAgoraToken(client.userObject.id, channelId);
            client.streamId = streamDetails.insertId;
            client.emit("onStreamListener", {
                "error": false,
                "type": "stream_started",
                "streamToken": tokenA,
                ...streamDetails.getJSON,
            });
            console.log(client.userObject.name + " join the stream %d...", streamDetails.streamId);
            streamDetails.addViewer(client);
            if (client.userObject.id != 0) {
                io.to(streamDetails.streamId).emit('onCommentListener', {
                    "serverMessageId": 0,
                    "message": "joined",
                    "broadcast": true,
                    "sentTime": getTime(),
                    "user": {
                        "id": client.userObject.id,
                        "name": client.userObject.name,
                        "picture": client.userObject.profilePicture,
                    }
                });
            }
        } else {
            client.emit("onStreamListener", {
                "error": true,
                "type": "stream_invalid",
                "streamId": data['streamId'],
            });
        }
    });
    client.on('sentGift', async function name(data) {
        if (client.streamId) {
            var streamDetails = getStream(client.streamId);
            if (streamDetails) {
                io.to(streamDetails.streamId).emit('onGiftListener', data);
            }
        }
    });
    client.on('toggleMicrophone', async function name(data) {
        if (client.streamId) {
            var streamDetails = getStream(client.streamId);
            streamDetails.toggleMicrophone(client.userObject.id, data['value']);
        }
    });
    client.on('toggleCamera', async function name(data) {
        if (client.streamId) {
            var streamDetails = getStream(client.streamId);
            streamDetails.toggleCamera(client.userObject.id, data['value']);
        }
    });
    client.on('acceptGuest', async function name(data) {
        if (client.streamId) {
            var streamDetails = getStream(client.streamId);
            streamDetails.acceptGuest(client, data['guestId']);
        } else {
            console.error("[Error] Request was rejected because there was no stream connected");
        }
    });
    client.on('requestGuest', async function name(data) {
        if (client.streamId) {
            var streamDetails = getStream(client.streamId);
            streamDetails.requestGuest(client);
        } else {
            console.error("[Error] Request was rejected because there was no stream connected");
        }
    });
    client.on('cancelGuestRequest', async function name(data) {
        // Data
        // GuestId
        if (client.streamId) {
            const streamDetails = getStream(client.streamId);
            if (streamDetails) {
                streamDetails.cancelRequest(client.userObject.id, data['guestId']);
            }
        } else {
            console.error("[Error] Request was rejected because there was no stream connected");
        }
    });
    client.on('sendMessage', async function name(data) {
        if (client.streamId) {
            const streamDetails = getStream(client.streamId);
            if (streamDetails) {
                const userObj = client.userObject;
                const message = data['message'];
                const messageDetails = await db.addStreamMessage(userObj, streamDetails.insertId, message);
                if (messageDetails) {
                    io.to(streamDetails.streamId).emit('onCommentListener', messageDetails);
                }
            }
        } else {
            console.error("[Error] Message was rejected because there was no stream connected");
        }
    });
    client.on('disconnect', async function () {
        if (client.streamId) {
            var stream = getStream(client.streamId);
            if (stream) {
                if (stream.hostId == client.userObject.id) {
                    // User is a host of a stream
                    await db.endLive(stream.insertId);
                    stream.endStream();
                    deleteStreamData(client.streamId);
                } else {
                    // User is just an audience
                    stream.removeViewer(client);
                }
            }
        }
        console.log('client disconnect...', client.id);
    });
    client.on('error', function (err) {
        console.log('received error from client:', client.id)
        console.log(err)
    });
});

db.getConfigs().then((config) => {
    global.config = config;
    var server_port = process.env.PORT || config.stream_address_port;
    global.appAuthKey = config.app_id;
    global.hostAddress = `${config.service_url}:${config.stream_address_port}/`;
    server.listen(server_port, () => {
        console.log('listening on *%d', server_port);
    });
});

function createAgoraToken(userId, channelId) {
    // Rtc Examples
    const configs = global.config;

    // Rtc Examples
    if (!configs.agora_id || configs.agora_id.trim() === '' || !configs.agora_certificate || configs.agora_certificate.trim() === '') {
      console.log('Agora ID and/or certificate not configured from panel');
    }

    const appID = configs.agora_id;
    const appCertificate = configs.agora_certificate;
    const channelName = channelId;
    const uid = userId;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    // IMPORTANT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.

    // Build token with uid
    const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
    console.log("Token With Integer Number Uid: " + tokenA);
    return tokenA;
}

function getTime() {
    return Math.floor(new Date().getTime() / 1000)
}