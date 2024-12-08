const db = require('../../config/db_wrapper');
const config = require('../../config/config');
const multer = require('multer');
var path = require('path');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

exports.getBanksData = async () => {
  const banks = await db.query("SELECT * FROM withdraw_banks;");
  return { banks };
}

exports.addBank = async (name, file) => {
  var pictureUrl = "";
  console.log(file, name)
  if (file) {
      // Picture is uploaded
      const pictureUpload = await upload_manager.upload({ key: 'images', fileReference: file.path, contentType: mime.lookup(file.path), fileName: file.filename });
      pictureUrl = pictureUpload.Location;
  } 
  if(pictureUrl == "" || pictureUrl == undefined){
      await db.execute(`INSERT INTO withdraw_banks (name) VALUES (?);`, [name]);
  }
  else{
      await db.execute(`INSERT INTO withdraw_banks (logo, name) VALUES ( ?, ?);`, [pictureUrl, name]);
  }
}

exports.deleteBank = async (id) => {
  await db.execute(`DELETE FROM withdraw_banks WHERE id = ?`, [id]);
}
