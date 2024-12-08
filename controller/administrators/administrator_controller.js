const utils = require('../../config/utils');
const db = require('../../config/db_wrapper');

const Admin = require('../../models/administrators/admins_models');

exports.getAdminData = async (req, res) => {
  const adminModel = new Admin();
  const users = await adminModel.getAdminData();
  const data = {
    users: users,
  };
  res.render('pages/administrators', data);
}


exports.postAddAdmin = async (req, res) => {
    const adminModel = new Admin();
    const result = await adminModel.addAdmin(req.body);
    res.send(result);
  }

  exports.postDeleteAdmin = async (req, res) => {
    const adminModel = new Admin();
    const result = await adminModel.deleteAdmin(req.body.id);
    res.send(result);
  }


  exports.postRemoveAdmin = async (req, res) => {
    const adminModel = new Admin();
    const result = await adminModel.removeAdmin(req.body.id);
    res.send(result);
  }