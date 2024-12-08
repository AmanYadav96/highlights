const reportsModel = require('../../models/reports_users/reports_users_models');

exports.getReportDataUser = async (req, res) => {
  const reports = await reportsModel.getReportData();
  const data = {
    reports: reports
  };
  res.render('pages/report_users', data);
}

exports.getReportDataMessages = async (req, res) => {
  const reports = await reportsModel.getMessageReportData();
  const data = {
    reports: reports
  };
  res.render('pages/report_messages', data);
}

exports.postDeleteReportUser = async (req, res) => {
  const userData = req.body;
  const deleteReport = await reportsModel.deleteReport(userData.id);
  res.send({ status: 'success', message: 'Report has been deleted successfully!' });
}

