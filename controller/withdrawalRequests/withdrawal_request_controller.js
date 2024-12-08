const withdrawalRequestModel = require('../../models/withdrawalRequests/withdrwal_requests_models');

var adminFirebase = require("firebase-admin");
var serverKey = require("../../config/push_notification.json"); 

// adminFirebase.initializeApp({
//   credential: adminFirebase.credential.cert(serverKey),
// });

exports.getWithdrawalRequestData = async (req, res) => {
    const data = await withdrawalRequestModel.getWithdrawalRequestData();
    res.render('pages/withdrawal_requests', data);
  }

  exports.getFetchWithdrawalRequestData = async (req, res) => {
    const data = await withdrawalRequestModel.getFetchWithdrawalRequestData(req.query['from']);
    res.send(data);
  }
  
  exports.getWithdrawalRequestDetails = async (req, res) => {
    const id = req.query.id;
    const data = await withdrawalRequestModel.getVerificationRequestDetails(id);
    res.render('pages/withdrawal_details', data);
  }
  
  exports.postUpdateWithdrawalReqDetails = async (req, res) => {
    try {
      userData = req.body;
      let userObj = {
        id: 0,
      };
      const updatedData = await withdrawalRequestModel.updateVerificationRequestDetails(userData.message, userData.status, userData.id, userData.amount);
      if (updatedData) {
        if(updatedData.status == 1){
          // try {
          //   console.log(updatedData);
          //   adminFirebase.messaging().send({
          //     notification: {
          //       title: "Tikshot",
          //       body: "Withdrawal request has been approved!",
          //     },
          //     token: updatedData.token,
          //   })
          //     .then((response) => {
          //       console.log('Successfully sent message:', response);
          //     })
          //     .catch((error) => {
          //       console.log('Error sending message:', error);
          //     });
            global.addNotification(userObj, updatedData.id, {
              type: "withdrawalApproved",
            });
          // } catch (error) {
          //   // Handle error if notification addition fails
          // }
        }
        else{
          try {
            // adminFirebase.messaging().send({
            //   notification: {
            //     title: "Tikshot",
            //     body: "Withdrawal request has been rejected!",
            //   },
            //   token: updatedData.token,
            // })
            //   .then((response) => {
            //     console.log('Successfully sent message:', response);
            //   })
            //   .catch((error) => {
            //     console.log('Error sending message:', error);
            //   });
            global.addNotification(userObj, updatedData.id, {
              type: "withdrawalRejected",
            });
          } catch (error) {
            // Handle error if notification addition fails
          }
        }
      }
      res.send({ status: 'success', message: 'Withdrawal Request has been updated successfully!' });
    } catch (error) {
      console.error(error);
      res.send({ status: 'error', message: error.message });
    }
  }