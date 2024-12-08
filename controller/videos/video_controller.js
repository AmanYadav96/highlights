const Video = require('../../models/videos/videos_models');

exports.getVideoData = async (req, res) => {
    const videos = await Video.getAll();
    const data = {  
        videos: videos,
    };
    res.render('pages/videos', data);
}

exports.getFetchVideoData = async (req, res) => {
    const videos = await Video.getFetchAll(req.query['from']);
    const data = {  
        videos: videos,
    };
    res.send(data);
}

exports.getVideoDetails = async (req, res) => {
    const id = req.query.id;
    const video = await Video.getOne(id);
    const data = {
            video : video
    };
    res.render('pages/edit_videos', data);
}

exports.postUpdateVideoDetails = async (req, res) => {
    console.log(req.session.user, "In videos")
    if (req.session.user.power == 0) {
        return { status: 'success', message: 'You are on a demo account. Changes were not applied.' };
      }
    try {
        const userData = req.body;
        const result = await Video.update(userData.id, userData);        
        res.send({ status: 'success', message: 'Your video has been updated successfully!' });
    } catch (error) {
        console.error(error);
        res.send({ status: 'error', message: error.message });
    }
}

exports.postDeleteVideo = async (req, res) => {
    if (req.session.user.power == 0) {
        return { status: 'success', message: 'You are on a demo account. Changes were not applied.' };
      }
    const userData = req.body;
    const result = await Video.delete(userData.id);
    res.send({ status: 'success', message: 'Video has been deleted successfully!' });
}
