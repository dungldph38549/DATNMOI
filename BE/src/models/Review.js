const mongoose = require("mongoose");

// ================================================================
// SUB-SCHEMA: ReviewImage
// ================================================================
const reviewImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    caption: {
      type: String,
      maxLength: [100, "Caption tối đa 100 ký tự"],
      default: null,
    },
  },
  { _id: false },
);

// ================================================================
// SUB-SCHEMA: Reply
// ================================================================
const replySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId của reply không được để trống"],
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role phải là 'user' hoặc 'admin'",
      },
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxLength: [500, "Nội dung reply không được vượt quá 500 ký tự"],
      required: [true, "Nội dung reply không được để trống"],
    },
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

replySchema.virtual("likeCount").get(function () {
  return this.likes?.length ?? 0;
});

// ================================================================
// MAIN SCHEMA: Review
// ================================================================
const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Sản phẩm không được để trống"],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người dùng không được để trống"],
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    /** Phân loại tại thời điểm mua (SKU, thuộc tính dòng đơn) — hiển thị trên đánh giá */
    variantLabel: {
      type: String,
      default: null,
      trim: true,
      maxLength: [500, "Nhãn phân loại tối đa 500 ký tự"],
    },
    /** Ảnh chụp thông tin sản phẩm tại thời điểm đánh giá (tên, giá dòng đơn, thương hiệu…) */
    productSnapshot: {
      name: { type: String, default: null },
      image: { type: String, default: null },
      brandName: { type: String, default: null },
      categoryName: { type: String, default: null },
      price: { type: Number, default: null },
      shortDescription: { type: String, default: null },
      /** Size / màu đã mua (để hiển thị đánh giá theo phân loại) */
      purchaseSize: { type: String, default: null },
      purchaseColor: { type: String, default: null },
      /** Chuỗi biến thể đúng như dòng đơn (Size/Color/…), không gồm SKU */
      orderedVariantText: { type: String, default: null, maxLength: [500, "Tối đa 500 ký tự"] },
    },
    rating: {
      type: Number,
      required: [true, "Vui lòng đánh giá sản phẩm (1 đến 5 sao)"],
      min: [1, "Số sao tối thiểu là 1"],
      max: [5, "Số sao tối đa là 5"],
    },
    title: {
      type: String,
      trim: true,
      maxLength: [150, "Tiêu đề không được vượt quá 150 ký tự"],
      default: null,
    },
    content: {
      type: String,
      trim: true,
      maxLength: [500, "Nội dung đánh giá không được vượt quá 500 ký tự"],
      default: null,
    },
    images: {
      type: [reviewImageSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "Tối đa 5 ảnh trên mỗi đánh giá",
      },
    },
    verifiedPurchase: { type: Boolean, default: false },
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    dislikes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "Status không hợp lệ",
      },
      default: "pending",
      index: true,
    },
    rejectedReason: { type: String, default: null },
    editHistory: {
      type: [
        {
          editedAt: { type: Date, default: Date.now },
          oldRating: { type: Number },
          oldContent: { type: String },
          _id: false,
        },
      ],
      default: [],
    },
    editCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    replies: { type: [replySchema], default: [] },
    replyCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ================================================================
// INDEXES
// ================================================================
/** Mỗi lần giao thành công (orderId) được đánh giá tối đa một lần / sản phẩm; orderId null chỉ cho phép tối đa một bản ghi legacy. */
reviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, isDeleted: 1, status: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, rating: 1, isDeleted: 1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: 1 });

// ================================================================
// VIRTUALS
// ================================================================
reviewSchema.virtual("likeCount").get(function () {
  return this.likes?.length ?? 0;
});
reviewSchema.virtual("dislikeCount").get(function () {
  return this.dislikes?.length ?? 0;
});
reviewSchema.virtual("hasImages").get(function () {
  return (this.images?.length ?? 0) > 0;
});
reviewSchema.virtual("trustBadge").get(function () {
  return this.verifiedPurchase ? "Đã mua hàng" : null;
});
reviewSchema.virtual("activeReplyCount").get(function () {
  const replies = Array.isArray(this.replies) ? this.replies : [];
  return replies.filter((r) => !r.isDeleted).length;
});

// ================================================================
// INSTANCE METHODS
// ================================================================
reviewSchema.methods.softDelete = function (deletedByUserId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedByUserId;
  return this.save();
};

reviewSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

reviewSchema.methods.editReview = function (updates, maxEdits = 3) {
  if (this.editCount >= maxEdits)
    throw new Error(`Bạn chỉ được chỉnh sửa review tối đa ${maxEdits} lần`);
  this.editHistory.push({
    editedAt: new Date(),
    oldRating: this.rating,
    oldContent: this.content,
  });
  this.editCount += 1;
  if (updates.rating !== undefined) this.rating = updates.rating;
  if (updates.content !== undefined) this.content = updates.content;
  if (updates.title !== undefined) this.title = updates.title;
  return this.save();
};

reviewSchema.methods.toggleLike = function (userId) {
  const id = userId.toString();
  const likes = Array.isArray(this.likes) ? this.likes : [];
  const dislikes = Array.isArray(this.dislikes) ? this.dislikes : [];
  const i = likes.findIndex((u) => u.toString() === id);
  if (i === -1) {
    likes.push(userId);
    this.likes = likes;
    this.dislikes = dislikes.filter((u) => u.toString() !== id);
  } else {
    likes.splice(i, 1);
    this.likes = likes;
  }
  return this.save();
};

reviewSchema.methods.toggleDislike = function (userId) {
  const id = userId.toString();
  const dislikes = Array.isArray(this.dislikes) ? this.dislikes : [];
  const likes = Array.isArray(this.likes) ? this.likes : [];
  const i = dislikes.findIndex((u) => u.toString() === id);
  if (i === -1) {
    dislikes.push(userId);
    this.dislikes = dislikes;
    this.likes = likes.filter((u) => u.toString() !== id);
  } else {
    dislikes.splice(i, 1);
    this.dislikes = dislikes;
  }
  return this.save();
};

reviewSchema.methods.addReply = function ({ userId, role, content }) {
  if (!Array.isArray(this.replies)) this.replies = [];
  this.replies.push({ userId, role, content });
  const replies = Array.isArray(this.replies) ? this.replies : [];
  this.replyCount = replies.filter((r) => !r.isDeleted).length;
  return this.save();
};

reviewSchema.methods.softDeleteReply = function (replyId) {
  if (!Array.isArray(this.replies)) this.replies = [];
  const reply = this.replies.id(replyId);
  if (!reply) throw new Error("Không tìm thấy reply");
  reply.isDeleted = true;
  reply.deletedAt = new Date();
  const replies = Array.isArray(this.replies) ? this.replies : [];
  this.replyCount = replies.filter((r) => !r.isDeleted).length;
  return this.save();
};

reviewSchema.methods.getRepliesPaginated = function (page = 1, limit = 5) {
  const replies = Array.isArray(this.replies) ? this.replies : [];
  const active = replies.filter((r) => !r.isDeleted);
  const total = active.length;
  const items = active.slice((page - 1) * limit, page * limit);
  return {
    items,
    meta: {
      total,
      page: +page,
      limit: +limit,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
};

reviewSchema.methods.approve = function () {
  this.status = "approved";
  this.rejectedReason = null;
  return this.save();
};

reviewSchema.methods.reject = function (reason = "Vi phạm nội dung") {
  this.status = "rejected";
  this.rejectedReason = reason;
  return this.save();
};

// ================================================================
// STATIC METHODS
// ================================================================
reviewSchema.statics.getStats = async function (productId) {
  const [result] = await this.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        isDeleted: false,
        status: "approved",
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$rating" },
        total: { $sum: 1 },
        verified: { $sum: { $cond: ["$verifiedPurchase", 1, 0] } },
        totalLikes: { $sum: { $size: "$likes" } },
        distribution: { $push: "$rating" },
      },
    },
  ]);
  if (!result)
    return {
      average: 0,
      total: 0,
      verified: 0,
      totalLikes: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result.distribution.forEach((r) => dist[r]++);
  return {
    average: Math.round(result.average * 10) / 10,
    total: result.total,
    verified: result.verified,
    totalLikes: result.totalLikes,
    distribution: dist,
  };
};

reviewSchema.statics.hasReviewed = async function (userId, productId) {
  return !!(await this.findOne({ userId, productId, isDeleted: false }));
};

reviewSchema.statics.hasReviewedOrder = async function (userId, productId, orderId) {
  if (!orderId || !productId || !userId) return false;
  const uid = mongoose.isValidObjectId(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const pid = mongoose.isValidObjectId(productId)
    ? new mongoose.Types.ObjectId(productId)
    : productId;
  const oid = mongoose.isValidObjectId(orderId)
    ? new mongoose.Types.ObjectId(orderId)
    : orderId;
  return !!(await this.findOne({
    userId: uid,
    productId: pid,
    orderId: oid,
    isDeleted: false,
  }));
};

// ================================================================
// HOOKS
// ================================================================
reviewSchema.pre("save", function () {
  if (this.isNew && this.orderId) this.verifiedPurchase = true;
});

reviewSchema.pre("save", function () {
  const strip = (s) => s?.replace(/<[^>]*>/g, "").trim() ?? s;
  if (this.isModified("content")) this.content = strip(this.content);
  if (this.isModified("title")) this.title = strip(this.title);
  const replies = Array.isArray(this.replies) ? this.replies : [];
  replies.forEach((r) => {
    if (r.isNew) r.content = strip(r.content);
  });
  this.replies = replies;
});

// ================================================================
// QUERY HELPERS
// ================================================================
reviewSchema.query.active = function () {
  return this.where({ isDeleted: false });
};
reviewSchema.query.approved = function () {
  return this.where({ isDeleted: false, status: "approved" });
};
reviewSchema.query.pending = function () {
  return this.where({ isDeleted: false, status: "pending" });
};

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
