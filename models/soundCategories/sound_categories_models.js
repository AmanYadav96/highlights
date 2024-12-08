const db = require('../../config/db_wrapper');
const config = require('../../config/config');
const multer = require('multer');
var path = require('path');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

exports.getSoundCategoryData = async () => {
  const soundCategories = await db.query("SELECT * FROM sound_categories;");
  return { soundCategories };
}

exports.addSoundCategory = async (name, file) => {
  var pictureUrl = "";
  
  if (file) {
      // Picture is uploaded
      const pictureUpload = await upload_manager.upload({ key: 'sounds', fileReference: file.path, contentType: mime.lookup(file.path), fileName: file.filename });
      pictureUrl = pictureUpload.Location;
  } 
  if(pictureUrl == ""){
      await db.execute(`INSERT INTO sound_categories (name) VALUES (?);`, [name]);
  }
  else{
      await db.execute(`INSERT INTO sound_categories (name, picture) VALUES ( ?, ?);`, [name, pictureUrl]);
  }
}

exports.deleteSoundCategory = async (id) => {
  await db.execute(`DELETE FROM sound_categories WHERE id = ?`, [id]);
}