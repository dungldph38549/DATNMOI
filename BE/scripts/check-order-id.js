const mongoose = require("mongoose");
require("dotenv").config();
const Order = require("../src/models/OrderModel");

async function run() {
  await mongoose.connect(process.env.MONGO_DB);
  const id = process.argv[2];
  if (!id) {
    throw new Error("Missing order id arg");
  }
  const byId = await Order.findById(id).select("_id createdAt status fullName");
  console.log("BY_ID:", byId ? JSON.stringify(byId) : "NOT_FOUND");
  const suffix = String(id).slice(-8).toUpperCase();
  const bySuffix = await Order.find({
    $expr: {
      $regexMatch: {
        input: { $toUpper: { $toString: "$_id" } },
        regex: `${suffix}$`,
      },
    },
  }).select("_id createdAt status fullName");
  console.log("BY_SUFFIX_COUNT:", bySuffix.length);
  if (bySuffix.length) console.log(JSON.stringify(bySuffix, null, 2));
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
