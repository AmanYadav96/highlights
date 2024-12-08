const utils = require('../../config/utils');

const User = require('../../models/users/users_models');

exports.getUsersData = async (req, res) => {
  const userModel = new User();
  const users = await userModel.getUsersData(req.query['query']);
  const data = {
    users: users,
  };
  res.render('pages/users', data);
}

exports.getFetchUserData = async (req, res) => {
    const userModel = new User();
    const data = await userModel.fetchUserData(req.query['query'], req.query['from']);
    res.send(data);
  }

  exports.getEditUserData = async (req, res) => {
    const userModel = new User();
    const data = await userModel.getEditUserData(req.query.id);
    res.render('pages/edit_users', data);
  }

  exports.postAddUser = async (req, res) => {
    if (req.session.user.power == 0) {
      return { status: 'success', message: 'You are on a demo account. Changes were not applied.' };
    }
    const userModel = new User();
    const data = await userModel.addUser(req.body, req);
    res.send(data);
  }

  exports.postUpdateUser = async (req, res) => {
    if (req.session.user.power == 0) {
      return { status: 'success', message: 'You are on a demo account. Changes were not applied.' };
    }
    const userModel = new User();
    const data = await userModel.updateUser(req.body, req);
    res.send(data);
  }

  exports.postDeleteUser = async (req, res) => {
    if (req.session.user.power == 0) {
      return { status: 'success', message: 'You are on a demo account. Changes were not applied.' };
    }
    const userModel = new User();
    const data = await userModel.deleteUser(req.body.id);
    res.send(data);
  }