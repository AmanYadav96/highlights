const commentModel = require('../../models/comments/comments_models');

exports.getCommentData = async (req, res) => {
  const data = await commentModel.getCommentData();
  res.render('pages/comments', data);
}

exports.getFetchCommentData = async (req, res) => {
  const data = await commentModel.getFetchCommentData(req.query['from']);
  res.send(data);
}

exports.getPostCommentData = async (req, res) => {
  const data = await commentModel.getPostCommentData();
  res.render('pages/post_comments', data);
}

exports.getFetchPostCommentData = async (req, res) => {
  const data = await commentModel.getFetchPostCommentData(req.query['from']);
  res.send(data);
}

exports.postDeleteComment = async (req, res) => {
  if (req.session.user.power == 0) {
    res.send({ status: 'success', message: 'You are on a demo account. Changes were not applied.' });
    return;
  }
  userData = req.body;
  await commentModel.deleteComment(userData.id);
  res.send({ status: 'success', message: 'Comment has been deleted successfully!' });
}

exports.postDeletePostComment = async (req, res) => {
  if (req.session.user.power == 0) {
    res.send({ status: 'success', message: 'You are on a demo account. Changes were not applied.' });
    return;
  }
  userData = req.body;
  await commentModel.deletePostComment(userData.id);
  res.send({ status: 'success', message: 'Comment has been deleted successfully!' });
}

exports.getEditCommentVideo = async (req, res) => {
  const id = req.query.id;
  const data = await commentModel.getCommentVideo(id);
  res.render('pages/comment_video_details', data);
}

exports.getEditCommentPost = async (req, res) => {
  const id = req.query.id;
  const data = await commentModel.getCommentPost(id);
  res.render('pages/comment_post_details', data);
}
