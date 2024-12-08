const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const crypto = require('crypto');
const chalk = require('chalk');
var adminFirebase = require("firebase-admin");
var serverKey = require("./config/push_notification.json");
adminFirebase.initializeApp({
    credential: adminFirebase.credential.cert(serverKey),
});

const db = require('./config/db_handler'); // Replace with your actual database module
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
// const { sendFirebaseNotification } = require('./notifications'); // Replace with your actual notifications module

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let userObject;
io.use(async (socket, next) => {
  let handshake = socket.handshake;

  if (handshake.headers.authid == 'd0ad9bc9081fba7902df195fc00237785ff2408ffdc3719664ba82918c523311') {
    userObject = await db.getUserByAuth(handshake.headers.authuid);
    if (userObject) {
      socket.userObject = userObject;
      next();   
    } else {
      console.log("Unauthorized access [AuthId]");
      socket.disconnect();
    }
  } else {
    console.log("Unauthorized access [AppID]");
    socket.disconnect();
  }
});

async function sendFirebaseNotification(sender, event, data) {
    const receiverObj = await db.getUserById(sender);
    if (!receiverObj.token || receiverObj.token == "") return;

    let message;
    if (event.type == "follow") {
        message = "started following you";
    } else if (event.type == "withdrawalApproved") {
        message = "Your withdrawal request has been approved";
    } else if (event.type == "withdrawalRejected") {
        message = "Your withdrawal request has been rejected";
    }

    const payload = {
        data: {
            title: event,
            body: JSON.stringify(data),
        },
        token: receiverObj.token,
        android: {
            priority: "high",
        },
        apns: {
            payload: {
                aps: {
                    "content-available": 1,
                },
            },
            headers: {
                "apns-priority": "10",
            },
        },
    };

    adminFirebase.messaging().send(payload)
        .then((response) => {
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}


// async function sendFirebaseNotification(sender, event, data) {
//     const receiverObj = await db.getUserById(sender);
//     if (!receiverObj.token || receiverObj.token == "") return;
//     let message;
//     if (event.type == "follow") {
//       message = "started following you"
//     }
//     else if (event.type == "withdrawalApproved") {
//       message = "Your withdrawal request has been approved"
//     }
//     else if (event.type == "withdrawalRejected") {
//       message = "Your withdrawal request has been rejected"
//     }
//     adminFirebase.messaging().send({
//       data: {
//         title: event,
//         body: JSON.stringify(data),
//       },
//       token: receiverObj.token
//     })
//       .then((response) => {
//         console.log('Successfully sent message:', response);
//       })
//       .catch((error) => {
//         console.log('Error sending message:', error);
//       });
//   }


var clients = {};

async function sendEmit(userId, event, data) {
    if (userId in clients) {
        clients[userId].emit(event, data);
    } else {
        if (data.user) {
            console.log(userId, event, data);
            sendFirebaseNotification(userId, event, data);
        }
    }
}

io.on('connection', (client) => {
    console.log('client connect...', client.id, client);
    clients[client.userObject.id] = client;

    db.getPendingMessages(client.userObject.id).then((messages) => {
        for (let i = 0; i < messages.length; i++) {
            const messageResponse = messages[i];
            sendEmit(client.userObject.id, 'onMessageReceived', {
                serverMessageId: messageResponse.serverMessageId,
                message: messageResponse.message,
                sentTime: messageResponse.sentTime,
                user: messageResponse.user,
            });
        }
    });

    client.on('sendMessage', async (data) => {
        const userObj = client.userObject;
        const conversationId = data.conversationId;
        const messageId = data.messageId;

        const messageResponse = await db.addMessage(userObj, conversationId, data.message, userObj.isAdmin);
        if (messageResponse) {
            sendEmit(conversationId, 'onMessageReceived', {
                serverMessageId: messageResponse.serverMessageId,
                message: messageResponse.message,
                sentTime: messageResponse.timestamp,
                user: messageResponse.user,
            });

            client.emit('onMessageAdded', {
                messageId: messageId,
                serverMessageId: messageResponse.serverMessageId,
            });
        }
    });

    client.on('onTyping', (data) => {
        const conversationId = data.conversationId;
        sendEmit(conversationId, 'onTyping', {
            conversationId: client.userObject.id,
        });
    });

    client.on('acknowledgeMessage', async (data) => {
        const serverMessageId = data.serverMessageId;
        const conversationId = data.conversationId;

        const response = await db.messageDelivered(conversationId, serverMessageId);
        if (response) {
            sendEmit(conversationId, 'onMessageDelivered', {
                serverMessageId: serverMessageId,
                deliveredTime: response.timestamp,
            });
        }
    });

    client.on('onMessageSeen', async (data, ack) => {
        const serverMessageId = data.serverMessageId;
        const conversationId = data.conversationId;

        const response = await db.messageSeen(conversationId, serverMessageId);
        if (response) {
            sendEmit(conversationId, 'onMessageSeen', {
                serverMessageId: serverMessageId,
                seenTime: response.timestamp,
            });
            ack();
        }
    });

    client.on('onCallBegin', async (data) => {
        const callerId = data.userId;
        const isVideo = data.video || false;
        const id = crypto.randomBytes(16).toString('hex');
        const channelId = callerId + id;

        const callerUserObj = await db.getUserById(callerId);
        if (callerUserObj && callerId in clients) {
            const tokenY = createAgoraToken(callerId, channelId);
            clients[callerId].lastChannelId = channelId;

            sendEmit(callerId, 'onIncomingCall', {
                video: isVideo,
                channelId: channelId,
                token: tokenY,
                user: {
                    id: client.userObject.id,
                    name: client.userObject.name,
                    picture: client.userObject.picture,
                },
            });

            clients[client.userObject.id].lastChannelId = channelId;
            const tokenX = createAgoraToken(client.userObject.id, channelId);

            sendEmit(client.userObject.id, 'onCallSessionInitiated', {
                channelId: channelId,
                token: tokenX,
            });
        } else {
            sendEmit(client.userObject.id, 'onCallEnded', {
                channelId: channelId,
                callerId: callerId,
                reason: 0,
            });
        }
    });

    client.on('onCallEnd', (data) => {
        const callerId = data.userId;
        const channelId = data.channelId;

        if (callerId in clients) {
            if (clients[callerId].lastChannelId === channelId) {
                sendEmit(callerId, 'onCallEnded', {
                    callerId: client.userObject.id,
                    channelId: channelId,
                    reason: 1,
                });
            } else {
                console.error('Invalid caller end session: ', channelId, callerId);
            }
        }
    });

    client.on('disconnect', () => {
        delete clients[client.userObject.id];
        console.log('client disconnect...', client.id);
    });

    client.on('error', (err) => {
        console.log('received error from client:', client.id);
        console.log(err);
    });
});

function createAgoraToken(userId, channelId) {
    const configs = global.config;

    if (!configs.agora_id || !configs.agora_certificate) {
        console.log('Agora ID and/or certificate not configured from panel');
        return '';
    }

    const appID = configs.agora_id;
    const appCertificate = configs.agora_certificate;
    const channelName = channelId;
    const uid = userId;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
    console.log('Token With Integer Number Uid: ' + tokenA);
    return tokenA;
}

// Start the messaging server on port 3001
server.listen(3001, () => {
    console.log('Messaging server listening on port 3001');
});
