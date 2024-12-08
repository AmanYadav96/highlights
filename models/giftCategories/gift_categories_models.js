const db = require('../../config/db_wrapper');
const config = require('../../config/config');
const multer = require('multer');
var path = require('path');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

exports.getGiftCategoryData = async () => {
  const giftCategories = await db.query("SELECT * FROM gift_categories;");
  return { giftCategories };
}

exports.addGiftCategory = async (name, file) => {
  var pictureUrl = "";
  
  if (file) {
      // Picture is uploaded
      const pictureUpload = await upload_manager.upload({ key: 'gifts', fileReference: file.path, contentType: mime.lookup(file.path), fileName: file.filename });
      pictureUrl = pictureUpload.Location;
  } 
  if(pictureUrl == ""){
      await db.execute(`INSERT INTO gift_categories (name) VALUES (?);`, [name]);
  }
  else{
      await db.execute(`INSERT INTO gift_categories (name, picture) VALUES ( ?, ?);`, [name, pictureUrl]);
  }
}

exports.deleteGiftCategory = async (id) => {
  await db.execute(`DELETE FROM gift_categories WHERE id = ?`, [id]);
}
