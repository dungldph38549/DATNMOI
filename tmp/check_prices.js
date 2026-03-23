const mongoose = require('mongoose');

const mongoURI = "mongodb://dungldph38549:dungleph38549@ac-u6vbxpm-shard-00-00.gyc0fo3.mongodb.net:27017,ac-u6vbxpm-shard-00-01.gyc0fo3.mongodb.net:27017,ac-u6vbxpm-shard-00-02.gyc0fo3.mongodb.net:27017/DATN1?ssl=true&replicaSet=atlas-bg64i3-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(mongoURI);
    const Product = mongoose.model('Product', new mongoose.Schema({}, {strict: false}));
    const p = await Product.findOne({name: /Valentine/i});
    if (p) {
        console.log("PRODUCT INFO:");
        console.log(`Name: ${p.name}`);
        console.log(`isSale: ${p.isSale}`);
        console.log(`originalPrice: ${p.originalPrice}`);
        console.log(`price: ${p.price}`);
        console.log(`discountPercentage: ${p.discountPercentage}`);
        console.log("VARIANTS:");
        if (p.variants && p.variants.length > 0) {
            p.variants.forEach((v, i) => {
                console.log(`  Variant ${i}: price=${v.price}, sku=${v.sku}`);
            });
        }
    } else {
        console.log("Product not found.");
    }
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
