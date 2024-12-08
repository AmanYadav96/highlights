const db = require('../../config/db_wrapper');
const config = require('../../config/config');
const multer = require('multer');
var path = require('path');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

exports.getProductCategories = async () => {
  const productCategories = await db.query("SELECT * FROM product_categories;");
  return { productCategories };
}

exports.addProductCategory = async (name, file) => {
  let pictureUrl = "";

  if (file) {
    // Picture is uploaded
    const pictureUpload = await upload_manager.upload({ key: 'images', fileReference: file.path, contentType: mime.lookup(file.path), fileName: file.filename });
    pictureUrl = pictureUpload.Location;
  }
  if (pictureUrl == "") {
    console.log("HEY", name, pictureUrl);
    await db.execute(`INSERT INTO product_categories (name) VALUES (?);`, [name]);
  }
  else {
    console.log("HEHELLOclY", name, pictureUrl);
    await db.execute(`INSERT INTO product_categories (name, categoryImageUrl) VALUES (?, ?);`, [name, pictureUrl]);
  }
}

exports.deleteProductCategory = async (id) => {
  await db.execute(`DELETE FROM product_categories WHERE id = ?`, [id]);
}