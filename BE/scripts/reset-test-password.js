require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../src/models/UserModel");

async function run() {
  await mongoose.connect(process.env.MONGO_DB);
  const email = "test@gmail.com";
  const hash = await bcrypt.hash("123456", 12);
  const result = await User.updateOne(
    { email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
    { $set: { password: hash } },
  );
  console.log("UPDATED", result);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
