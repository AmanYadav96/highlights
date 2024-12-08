const utils = require('../../config/utils');
const db = require('../../config/db_wrapper');

exports.getLiveStreamData = async () => {
  const liveStreams = await db.query("SELECT l.*, u.name, u.profilePicture FROM live_streams l JOIN users u ON l.user_id = u.id LIMIT 20");
  liveStreams.forEach(element => {
    const startTime = utils.formatDateTime(element.started);
    const endTIme = utils.formatDateTime(element.ended);
    element.started = startTime;
    element.ended = endTIme;
  });
  return { liveStreams };
}

exports.getFetchLiveStreamData = async (from) => {
  const liveStreams = await db.query("SELECT l.*, u.name, u.profilePicture FROM live_streams l JOIN users u ON l.user_id = u.id LIMIT ?, 50", [parseInt(from)]);
  liveStreams.forEach(element => {
    const startTime = utils.formatDateTime(element.started);
    const endTIme = utils.formatDateTime(element.ended);
    element.started = startTime;
    element.ended = endTIme;
  });
  return { liveStreams };
}

exports.deleteLiveStream = async (id) => {
  await db.execute(`DELETE FROM live_streams WHERE id = ?`, [id]);
}
