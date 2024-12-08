const verificationRequestModel = require('../../models/verificationRequests/verification_requests_models');

exports.getVerificationRequestData = async (req, res) => {
    const data = await verificationRequestModel.getVerificationRequestData();
    res.render('pages/verification_requests', data);
  }


  exports.getFetchVerificationRequestData = async (req, res) => {
    const data = await verificationRequestModel.getFetchVerificationRequestData(req.query['from']);
    res.send(data);
  }
  
  exports.getVerificationRequestDetails = async (req, res) => {
    const id = req.query.id;
    const verDetails = await verificationRequestModel.getVerificationRequestDetails(id);
    let data;
    if(verDetails){
      const getBankDetails = await verificationRequestModel.getBankDetails(verDetails.user_id);
      data = {
        verDetails: verDetails ?? null,
        bankDetails: getBankDetails ?? null
      }
    } 
    res.render('pages/verification_details', data);
  }
  
  exports.postUpdateVerificationReqDetails = async (req, res) => {
    try {
      userData = req.body;
      let userObj = {
        id: 0,
      };
      await verificationRequestModel.updateVerificationRequestDetails(userData.message, userData.status, userData.id);
      if(userData.status == '1' || userData.status == 1){
        console.log(userData.userId, "userData.status sending notifica")
        await verificationRequestModel.updateUserVerificationRequestDetails(userData.userId);
        global.addNotification(userObj, parseInt(userData.userId), {
          type: "verificationApproved",
        });
      }
      else{
        console.log("fffffffffff")
        await verificationRequestModel.updateUserVerificationRequestDetail(userData.userId);
        global.addNotification(userObj, parseInt(userData.userId), {
          type: "verificationRejected",
        });
      }
      res.send({ status: 'success', message: 'Your Verification Request has been updated successfully!' });
    } catch (error) {
      console.error(error);
      res.send({ status: 'error', message: error.message });
    }
  }