const db = require('../../config/db_wrapper');

exports.getReportReason = async () => {
  return await db.query("SELECT * FROM report_reasons");
}

exports.addReportData = async (reason, videoId) => {
  const getTime = Math.floor(Date.now() / 1000);
  return await db.query("INSERT INTO report_reasons (reason, points, create_time) VALUES (?, ?, ?)", [reason, videoId, getTime]);
}

exports.deleteReason = async (id) => {
  return await db.execute(`DELETE FROM report_reasons WHERE id = ?`, [id]);
}
