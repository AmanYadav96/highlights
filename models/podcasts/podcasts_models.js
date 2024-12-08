const utils = require('../../config/utils');
const db = require('../../config/db_wrapper');

const Podcast = {};

Podcast.getAll = async () => {
  const podcasts = await db.query("SELECT * FROM live_streams where streamType = 3;");
  return podcasts.map(podcast => {
    const startTime = utils.formatDateTime(podcast.started);
    const endTIme = utils.formatDateTime(podcast.ended);
    return { ...podcast, started: startTime, ended: endTIme };
  });
}

Podcast.delete = async (id) => {
  const result = await db.execute(`DELETE FROM live_streams WHERE id = ?`, [id]);
  return result;
}

module.exports = Podcast;
