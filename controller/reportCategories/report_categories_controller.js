const reportsModel = require('../../models/reportCateogories/report_categories_model');

exports.getReportReasonData = async (req, res) => {
  const reasons = await reportsModel.getReportReason();
  const data = {
    reasons: reasons
  };
  res.render('pages/report_reason', data);
}

exports.addReportReason = async (req, res) => {
  const userData = req.body;
  const reason = userData.reason;
  const videoId = userData.points;
  const deleteReport = await reportsModel.addReportData(reason, videoId);
  res.send({ status: 'success', message: 'Report Reason has been added successfully!' });
}

exports.postDeleteReason = async (req, res) => {
  const userData = req.body;
  const deleteReport = await reportsModel.deleteReason(userData.id);
  res.send({ status: 'success', message: 'Reason has been deleted successfully!' });
}
