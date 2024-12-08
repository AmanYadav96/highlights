const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');

const Notification = {};

Notification.getAll = async () => {
  const notifications = await db.query("SELECT * FROM notifications_admin ORDER BY id DESC;");
  return notifications.map(notification => {
    const formatDateTime = utils.formatDateTime(notification.notification_time);
    return { ...notification, notificationTime: formatDateTime };
  });
}

// Notification.getAndroidUsers = async () => {
//   const androidUsers = await db.query("SELECT token FROM users WHERE phoneModel = 'android' AND token != '' LIMIT 1");
//   console.log(androidUsers)
//     return androidUsers ;
// }

Notification.getAndroidUsers = async () => {
  // const androidUsers = await db.query("SELECT token FROM users WHERE phoneModel = 'android' AND token != ''");
  const androidUsers = await db.query("SELECT lu.token FROM users u INNER JOIN logged_devices lu ON u.id = lu.userId WHERE u.phoneModel = 'android' AND lu.token != ''");
  const tokens = androidUsers.map(user => user.token);
  return tokens;
}

Notification.getiosUsers = async () => {
  const ioSusers = await db.query("SELECT lu.token FROM users u INNER JOIN logged_devices lu ON u.id = lu.userId WHERE u.phoneModel = 'iOS' AND lu.token != ''");
  const tokens = ioSusers.map(user => user.token);
  return tokens;
}

Notification.getAllUsers = async () => {
  const allUsers = await db.query("SELECT token FROM logged_devices WHERE token != ''");
  const tokens = allUsers.map(user => user.token);
  return tokens;
}

Notification.create = async (notificationData) => {
  const result = await db.execute(
    `INSERT INTO notifications_admin (title, description, notification_time, audience) VALUES (?, ?, curtime(), ?);`,
    [notificationData.title, notificationData.description, notificationData.audience]
  );

  if (result.affectedRows === 1) {
    const insertedData = {
      id: result.insertId,
      title: notificationData.title,
      description: notificationData.description,
      audience: notificationData.audience,
      notification_time: new Date().toLocaleTimeString(),
    };
    return insertedData;
  } else {
    throw new Error('Failed to insert notification data');
  }
};

module.exports = Notification;
