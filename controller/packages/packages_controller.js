const Packages = require('../../models/packages/packages_model');

exports.getPackageData = async (req, res) => {
    const packages = await Packages.getAll();
    const data = {  
        packages: packages,
    };
    res.render('pages/packages', data);
}

exports.postAddCoins = async (req, res) => {
    const userData = req.body;
  
    console.log(userData);
    const coinsPackage = await Packages.addData(userData.coins, userData.price, userData.iapCode);
    
    res.send({ status: 'success', message: 'Coins package is added successfully!'});
}

exports.postDeletePackage = async (req, res) => {
    const userData = req.body;
    console.log(userData);
    const result = await Packages.delete(userData.id);
    res.send({ status: 'success', message: 'Package has been deleted successfully!' });
}
