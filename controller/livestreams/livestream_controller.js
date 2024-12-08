const liveStreamModel = require('../../models/livestreams/livestream_models');

exports.getLiveStreamData = async (req, res) => {
  const data = await liveStreamModel.getLiveStreamData();
  res.render('pages/livestreams', data);
}

exports.getFetchLiveStreamData = async (req, res) => {
  const data = await liveStreamModel.getFetchLiveStreamData(req.query['from']);
  res.send(data);
}

exports.postDeleteLiveStream = async (req, res) => {
  userData = req.body;
  await liveStreamModel.deleteLiveStream(userData.id);
  res.send({ status: 'success', message: 'LiveStream has been deleted successfully!' });
}
