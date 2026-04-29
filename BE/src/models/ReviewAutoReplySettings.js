const mongoose = require("mongoose");

const reviewAutoReplySettingsSchema = new mongoose.Schema(
  {
    autoReplyEnabled: { type: Boolean, default: false },
    autoReplyMessage: {
      type: String,
      default: "",
      trim: true,
      maxLength: [500, "Nội dung tối đa 500 ký tự"],
    },
  },
  { timestamps: true },
);

reviewAutoReplySettingsSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model("ReviewAutoReplySettings", reviewAutoReplySettingsSchema);
