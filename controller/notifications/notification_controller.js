const Notification = require('../../models/notifications/notifications_model');

var adminFirebase = require("firebase-admin");
var serverKey = require("../../config/push_notification.json"); 

exports.getNotificationsData = async (req, res) => {
    const notifications = await Notification.getAll();
    const data = {  
        notifications: notifications,
    };
    res.render('pages/notifications', data);
}

exports.postSaveNotifications = async (req, res) => {
    if (req.session.user.power == 0) {
        res.send({ status: 'success', message: 'You are on a demo account. Changes were not applied.' });
        return;
    }
    const userData = req.body;
    const result = await Notification.create(userData);
    const androidUsers = await Notification.getAndroidUsers();
    const iosUsers = await Notification.getiosUsers();
    const allUsers = await Notification.getAllUsers();

    let tokens;
    if(result.audience === 'android'){
        tokens = androidUsers
    }
    if(result.audience === 'ios'){
        tokens = iosUsers
    }
    else{
        tokens = allUsers
    }
  
    if (result) {
      console.log(tokens.length);
      try {
        const tokensChunks = splitTokensIntoChunks(tokens, 500); // Function to split tokens into chunks of 500 tokens
    
        const sendChunk = async (chunk) => {
          const message = {
            notification: {
              title: result.title,
              body: result.description,
            },
            tokens: chunk,
          };
    
          try {
            const response = await adminFirebase.messaging().sendMulticast(message);
            console.log('Successfully sent message to', response.successCount, 'tokens');
            return response;
          } catch (error) {
            console.log('Error sending message:', error);
            throw error;
          }
        };
    
        const promises = tokensChunks.map(sendChunk);
    
        Promise.all(promises)
          .then((responses) => {
            const successCount = responses.reduce((total, response) => total + response.successCount, 0);
            console.log('Successfully sent message to', successCount, 'tokens');
          })
          .catch((error) => {
            console.log('Error sending message:', error);
          });
      } catch (error) {
        console.log(error);
        // Handle error if notification addition fails
      }
      res.send({ status: 'success', message: 'Notifications have been added successfully!' });
    }    
    
    else{
      res.send({ status: 'success', message: 'Notification has not been added successfully!'});

    }
}

function splitTokensIntoChunks(tokens, chunkSize) {
  const chunks = [];
  for (let i = 0; i < tokens.length; i += chunkSize) {
    chunks.push(tokens.slice(i, i + chunkSize));
  }
  return chunks;
}

