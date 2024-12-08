const reportsModel = require('../../models/reports/reports_models');

exports.getReportData = async (req, res) => {
  const reports = await reportsModel.getReportData();
  const data = {
    reports: reports
  };
  res.render('pages/reports', data);
}

exports.getReportDataDetails = async (req, res) => {
  const id = req.query.id;
  const data = await reportsModel.getReportDataDetails(id);
  res.render('pages/report_video_details', data);
}

exports.postUpdateReportDetails = async (req, res) => {
  try {
    userData = req.body;
    await reportsModel.updateUpdateReportDetails(userData.status, userData.id);
    res.send({ status: 'success', message: 'Report status has been updated successfully!' });
  } catch (error) {
    console.error(error);
    res.send({ status: 'error', message: error.message });
  }
}

exports.postDeleteReport = async (req, res) => {
  const userData = req.body;
  const deleteReport = await reportsModel.deleteReport(userData.id);
  res.send({ status: 'success', message: 'Report has been deleted successfully!' });
}

exports.postDeleteReportVideo = async (req, res) => {
  const userData = req.body;
  const deleteReport = await reportsModel.deleteReportVideo(userData.id);
  res.send({ status: 'success', message: 'Reported Video has been deleted successfully!' });
}

