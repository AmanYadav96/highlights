const db = require('../../config/db_wrapper');
const config = require('../../config/config');
const multer = require('multer');
var path = require('path');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

exports.getProducts = async () => {
    let productImages;
    const products = await db.query("SELECT * FROM products WHERE isVisible =1;");
    for (let i = 0; i < products.length; i++) {
        let pImages = [];
        productImages = await db.query("SELECT * FROM product_pictures WHERE product_id = ?", [products[i].id]);
        for (let i = 0; i < productImages.length; i++) {
            pImages.push(productImages[i].image_url);
        }
        products[i].images = pImages;
    }

    return { products };
}

exports.getProductById = async (productId) => {
    let productImage;
    let pImages = [];
    const product = await db.query(
        "SELECT p.*, pc.name as category_name, u.name FROM products p " +
        "LEFT JOIN product_categories pc ON p.categoryId = pc.id " +
        "LEFT JOIN users u ON p.seller_id = u.id " +
        "WHERE p.id = ?;",
        [productId]
      );
      
    productImage = await db.query("SELECT image_url FROM product_pictures WHERE product_id = ?", [productId]);
    for (let i = 0; i < productImage.length; i++) {
        pImages.push(productImage[i].image_url);
    }
    product[0].images = pImages;

    return { product: product[0] };
}

