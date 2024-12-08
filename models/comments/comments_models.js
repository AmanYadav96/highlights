// comment-model.js

const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');

exports.getCommentData = async () => {
  const comments = await db.query("SELECT c.*, u.name, u.profilePicture FROM comments c JOIN users u ON c.user_id = u.id LIMIT 20");
  for (let i = 0; i < comments.length; i++) {
      const element = comments[i];
      const commentTime = utils.formatDateTime(element.commentTime);
      element.commentTime = commentTime;
  }
  return { comments };
}

exports.getFetchCommentData = async (from) => {
  const comments = await db.query("SELECT c.*, u.name, u.profilePicture FROM comments c JOIN users u ON c.user_id = u.id LIMIT ?, 50", [parseInt(from)]);
  for (let i = 0; i < comments.length; i++) {
      const element = comments[i];
      const commentTime = utils.formatDateTime(element.commentTime);
      element.commentTime = commentTime;
  }
  return { comments };
}

exports.getPostCommentData = async () => {
  const comments = await db.query("SELECT c.*, u.name, u.profilePicture FROM post_comments c JOIN users u ON c.user_id = u.id LIMIT 20");
  for (let i = 0; i < comments.length; i++) {
      const element = comments[i];
      const commentTime = utils.formatDateTime(element.commentTime);
      element.commentTime = commentTime;
  }
  return { comments };
}

exports.getFetchPostCommentData = async (from) => {
  const comments = await db.query("SELECT c.*, u.name, u.profilePicture FROM post_comments c JOIN users u ON c.user_id = u.id LIMIT ?, 50", [parseInt(from)]);
  for (let i = 0; i < comments.length; i++) {
      const element = comments[i];
      const commentTime = utils.formatDateTime(element.commentTime);
      element.commentTime = commentTime;
  }
  return { comments };
}

exports.deleteComment = async (id) => {
  
  await db.execute(`DELETE FROM comments WHERE id = ?`, [id]);
}

exports.deletePostComment = async (id) => {
  
  await db.execute(`DELETE FROM post_comments WHERE id = ?`, [id]);
}

exports.getCommentVideo = async (id) => {
  const commentVideo = await db.query(`SELECT v.*, c.user_id FROM videos v JOIN comments c ON v.id = c.video_id WHERE v.id = ?`, [id]);
  return { commentVideo: commentVideo[0] };
}

exports.getCommentPost = async (id) => {
  const commentVideo = await db.query(`SELECT v.*, c.user_id FROM posts v JOIN post_comments c ON v.id = c.post_id WHERE v.id = ?`, [id]);
  return { commentPost: commentVideo[0] };
}
