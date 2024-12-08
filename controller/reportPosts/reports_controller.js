const reportsModel = require('../../models/reportPost/reports_models');

exports.getReportPostData = async (req, res) => {
  const reports = await reportsModel.getReportPostData();
  const data = {
    reports: reports
  };
  res.render('pages/report_posts', data);
}

exports.getPostReportDataDetails = async (req, res) => {
  const id = req.query.id;
  const data = await reportsModel.getReportDataDetails(id);
  res.render('pages/report_post_details', data);
}

exports.postUpdatePostReportDetails = async (req, res) => {
  try {
    userData = req.body;
    await reportsModel.updateUpdateReportDetails(userData.status, userData.id);
    res.send({ status: 'success', message: 'Report status has been updated successfully!' });
  } catch (error) {
    console.error(error);
    res.send({ status: 'error', message: error.message });
  }
}

exports.postDeletePostReport = async (req, res) => {
  const userData = req.body;
  const deleteReport = await reportsModel.deleteReport(userData.id);
  res.send({ status: 'success', message: 'Report has been deleted successfully!' });
}

exports.postDeleteReportPost = async (req, res) => {
  const userData = req.body;
  const deleteReport = await reportsModel.deleteReportVideo(userData.id);
  res.send({ status: 'success', message: 'Reported Video has been deleted successfully!' });
}

