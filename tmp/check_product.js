const mongoose = require('mongoose');
require('dotenv').config({path: './BE/.env'});

async function run() {
  await mongoose.connect(process.env.MONGO_DB);
  const Product = mongoose.model('Product', new mongoose.Schema({}, {strict: false}));
  const p = await Product.findOne({name: /Valentine/i});
  console.log(JSON.stringify(p, null, 2));
  process.exit();
}
run().catch(console.error);
