const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');

class Admin {
  constructor() {}

  async getAdminData() {
    const users = await db.query("SELECT admins.*, u.profilePicture FROM admins JOIN users u ON u.id = user_id");
    for (let i = 0; i < users.length; i++) {
      const element = users[i];
      if(element.createTime != null){
          const createTime = utils.formatDateTime(element.createTime);
          element.createTime = createTime;
      }
      else{
          element.createTime = "Not Provided";
      }
      if(element.country ==null){
          element.country = "Not available";
      }
    }
    return users;
  }

  async addAdmin(userData) {
    try {
      const addAdmin = await db.execute(`INSERT INTO admins (username, password, power, user_id, admin_auth) VALUES (?, ?, ?, ?, ?);`, [userData.username, userData.password, userData.power, userData.id, userData.auth]);        
      return { status: 'success', message: 'Admin has been assigned!' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  async deleteAdmin(id) {
    try {
      const deleteAdmin = await db.execute(`DELETE FROM admins WHERE id = ?`, [id]);
      return { status: 'success', message: 'Your admin has been deleted successfully!' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  async removeAdmin(id) {
    try {
      const deleteAdmin = await db.execute(`DELETE FROM admins WHERE user_id = ?`, [id]);
      return { status: 'success', message: 'Your admin has been deleted successfully!' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

}

module.exports = Admin;
