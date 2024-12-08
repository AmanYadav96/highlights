
const notificationTypes = new Map([  
  ['liked', 0],
  ['follow', 1],
  ['post', 4],
  ['comment', 9],
  ['comment_replied', 10],
  ['post_comment', 11],
  ['post_comment_replied', 14],
  ['comment_liked', 12],
  ['post_liked', 13],
  ['post_comment_liked', 15],
]);

module.exports = {
    notificationTypes
};