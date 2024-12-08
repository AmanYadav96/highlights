const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');
exports.getOrders = async () => {
    const orders = await db.query("SELECT o.*, SUM(op.price) as total, u.name as customerName FROM `orders` o LEFT JOIN order_products op ON op.order_id = o.id LEFT JOIN users u ON u.id= o.customerId GROUP BY o.id;");
    for (let i = 0; i < orders.length; i++) {
        const element = orders[i];
        const orderTime = utils.formatDateTime(element.time);
        element.time = orderTime;
    }
    return { orders };
  }
  
