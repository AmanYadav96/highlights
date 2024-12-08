const db = require('../../config/db_wrapper');

exports.getReportPostData = async () => {
  return await db.query("SELECT r.*, rr.reason as ReportReason, v.caption, u.name FROM report_posts r LEFT JOIN posts v ON r.post_id = v.id JOIN users u ON r.user_id = u.id JOIN report_reasons rr ON rr.id = r.report_reason");
}

exports.getReportDataDetails = async (id) => {
  const reportDetails = await db.query("SELECT r.*, rr.reason as ReportReason, v.caption, v.contentData, u.name FROM report_posts r LEFT JOIN posts v ON r.post_id = v.id JOIN users u ON r.user_id = u.id JOIN report_reasons rr ON rr.id = r.report_reason WHERE r.id = ?", [id]);
  return { reportDetails: reportDetails[0]};
}

exports.getReportReason = async () => {
  return await db.query("SELECT * FROM report_reasons");
}

exports.updateUpdateReportDetails = async (status, id) => {
  await db.execute(`UPDATE report_posts SET status = ? WHERE id = ?`, [status, id]);        
}

exports.addReportData = async (reason, videoId) => {
  const getTime = Math.floor(Date.now() / 1000);
  return await db.query("INSERT INTO report_reasons (reason, points, create_time) VALUES (?, ?, ?)", [reason, videoId, getTime]);
}

exports.deleteReport = async (id) => {
  return await db.execute(`DELETE FROM report_posts WHERE id = ?`, [id]);
}

exports.deleteReportVideo = async (id) => {
  const reportDelete =  await db.execute(`DELETE FROM posts WHERE id = ?`, [id]);
  const updateStatus = await db.execute(`UPDATE report_posts SET status = 1 WHERE id = ?`, [id]);     
  return { "video": true };
}
