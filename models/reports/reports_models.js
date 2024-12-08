const db = require('../../config/db_wrapper');

exports.getReportData = async () => {
  return await db.query("SELECT r.*, rr.reason as ReportReason, v.title, u.name FROM reports r LEFT JOIN videos v ON r.video_id = v.id JOIN users u ON r.user_id = u.id JOIN report_reasons rr ON rr.id = r.report_reason");
}

exports.getReportDataDetails = async (id) => {
  const reportDetails = await db.query("SELECT r.*, rr.reason as ReportReason, v.title, v.videoUrl, u.name FROM reports r LEFT JOIN videos v ON r.video_id = v.id JOIN users u ON r.user_id = u.id JOIN report_reasons rr ON rr.id = r.report_reason WHERE r.id = ?", [id]);
  return { reportDetails: reportDetails[0] };
}

exports.getReportReason = async () => {
  return await db.query("SELECT * FROM report_reasons");
}

exports.updateUpdateReportDetails = async (status, id) => {
  await db.execute(`UPDATE reports SET status = ? WHERE id = ?`, [status, id]);        
}

exports.addReportData = async (reason, videoId) => {
  const getTime = Math.floor(Date.now() / 1000);
  return await db.query("INSERT INTO report_reasons (reason, points, create_time) VALUES (?, ?, ?)", [reason, videoId, getTime]);
}

exports.deleteReport = async (id) => {
  return await db.execute(`DELETE FROM reports WHERE id = ?`, [id]);
}

exports.deleteReportVideo = async (id) => {
  const reportDelete =  await db.execute(`DELETE FROM videos WHERE id = ?`, [id]);
  const updateStatus = await db.execute(`UPDATE reports SET status = 1 WHERE id = ?`, [id]);     
  return { "video": true };
}
