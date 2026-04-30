const mongoose = require("mongoose");
const Product = require("../models/ProductModel");
const Order = require("../models/OrderModel");
const Voucher = require("../models/VoucherModel");
const User = require("../models/UserModel");
const { enrichProductPricing } = require("../utils/salePricing");

const baseProductQuery = {
  isDeleted: { $ne: true },
  isActive: true,
  isVisible: true,
  status: { $ne: "inactive" },
};

const MS_DAY = 86400000;

const toId = (v) =>
  v && mongoose.Types.ObjectId.isValid(String(v))
    ? new mongoose.Types.ObjectId(String(v))
    : null;

const totalSold = (p) => {
  let s = Number(p?.soldCount ?? p?.sold ?? 0);
  if (p?.hasVariants && Array.isArray(p.variants)) {
    s += p.variants.reduce((a, v) => a + Number(v?.sold ?? 0), 0);
  }
  return s;
};

const hasActiveSaleRules = (p, now = new Date()) => {
  const rules = p?.saleRules;
  if (!Array.isArray(rules) || !rules.length) return false;
  return rules.some((r) => {
    if (!r || r.status !== "active") return false;
    const start = r.startAt ? new Date(r.startAt) : null;
    const end = r.endAt ? new Date(r.endAt) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  });
};

const voucherIsActiveDoc = (v, now) => {
  if (!v || v.isDeleted) return false;
  const active =
    v.isActive === true ||
    (v.isActive == null && String(v.status || "") === "active");
  if (!active) return false;
  const start = v.startDate ? new Date(v.startDate) : null;
  const end = v.endDate ? new Date(v.endDate) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  const lim = Number(v.usageLimit ?? 1);
  if (lim > 0 && Number(v.usedCount ?? 0) >= lim) return false;
  return true;
};

/** Voucher đang hiệu lực → id SP áp dụng + cờ global */
const loadVoucherHotContext = async (now = new Date()) => {
  const vouchers = await Voucher.find({ isDeleted: false }).lean();
  const productIds = new Set();
  const categoryIds = new Set();
  let hasGlobal = false;

  for (const v of vouchers) {
    if (!voucherIsActiveDoc(v, now)) continue;
    const prods = v.applicableProducts?.length
      ? v.applicableProducts
      : v.applicableProductIds || [];
    const cats = v.applicableCategories || [];
    if (
      (!prods || prods.length === 0) &&
      (!cats || cats.length === 0)
    ) {
      hasGlobal = true;
      continue;
    }
    prods.forEach((id) => productIds.add(String(id)));
    cats.forEach((id) => categoryIds.add(String(id)));
  }

  return { productIds, categoryIds, hasGlobal };
};

const productHasVoucherHot = (p, vctx) => {
  const pid = String(p._id || "");
  if (vctx.productIds.has(pid)) return true;
  const cid = p.categoryId ? String(p.categoryId) : "";
  if (cid && vctx.categoryIds.has(cid)) return true;
  return false;
};

const isHotSaleProduct = (p, vctx, now) =>
  Boolean(
    p.isFeatured ||
      hasActiveSaleRules(p, now) ||
      productHasVoucherHot(p, vctx),
  );

const isNewProduct = (p, now, days = 30) => {
  const t = new Date(p.createdAt || 0).getTime();
  return t >= now.getTime() - days * MS_DAY;
};

const isHighRated = (p) =>
  Number(p.rating ?? 0) >= 4.5 && Number(p.reviewCount ?? 0) >= 5;

async function getPurchasedProductIds(userId) {
  const uid = toId(userId);
  if (!uid) return new Set();
  const orders = await Order.find({
    userId: uid,
    status: { $ne: "canceled" },
  })
    .select("products")
    .lean();
  const set = new Set();
  for (const o of orders) {
    for (const line of o.products || []) {
      if (String(line.lineStatus || "active") === "canceled") continue;
      set.add(String(line.productId));
    }
  }
  return set;
}

async function getUserViewAndPreference(userId) {
  const uid = toId(userId);
  const viewedIds = [];
  const categoryIds = new Set();
  const brandIds = new Set();

  if (uid) {
    const user = await User.findById(uid).select("viewedProducts").lean();
    const viewed = Array.isArray(user?.viewedProducts) ? user.viewedProducts : [];
    for (const row of viewed) {
      const pid = String(row?.productId || "");
      if (pid) viewedIds.push(pid);
    }
  }

  const allRefIds = [...new Set(viewedIds)];
  if (allRefIds.length) {
    const refProducts = await Product.find({
      _id: { $in: allRefIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) },
    })
      .select("categoryId brandId")
      .lean();
    for (const rp of refProducts) {
      if (rp.categoryId) categoryIds.add(String(rp.categoryId));
      if (rp.brandId) brandIds.add(String(rp.brandId));
    }
  }

  return { viewedIds: [...new Set(viewedIds)], categoryIds, brandIds };
}

function buildTabQuery(tab, now) {
  const t = String(tab || "all").toLowerCase();
  const thirtyAgo = new Date(now.getTime() - 30 * MS_DAY);
  if (t === "new" || t === "moi") {
    return { createdAt: { $gte: thirtyAgo } };
  }
  if (t === "rating" || t === "danhgia") {
    return { rating: { $gte: 4.5 }, reviewCount: { $gte: 5 } };
  }
  if (t === "bestseller" || t === "banchay") {
    return {
      $or: [{ soldCount: { $gt: 0 } }, { sold: { $gt: 0 } }],
    };
  }
  if (t === "hotsale" || t === "hot") {
    return {
      $or: [
        { isFeatured: true },
        { saleRules: { $elemMatch: { status: "active" } } },
      ],
    };
  }
  return {};
}

function computeBadges(p, { personalMatch, vctx, now }) {
  const badges = [];
  const sold = totalSold(p);
  if (personalMatch) badges.push("forYou");
  if (sold >= 8 || Number(p.soldCount ?? 0) >= 5) badges.push("bestseller");
  if (isNewProduct(p, now)) badges.push("new");
  if (isHighRated(p)) badges.push("rating");
  if (isHotSaleProduct(p, vctx, now)) badges.push("hotsale");
  return [...new Set(badges)];
}

function computeScore(p, ctx) {
  let score = 0;
  const cat = p.categoryId ? String(p.categoryId) : "";
  const brand = p.brandId ? String(p.brandId) : "";
  const sold = totalSold(p);

  if (
    ctx.prefCategories.size &&
    ctx.prefCategories.has(cat)
  ) {
    score += 38;
    ctx.personalMatch = true;
  }
  if (ctx.prefBrands.size && ctx.prefBrands.has(brand)) {
    score += 28;
    ctx.personalMatch = true;
  }

  score += Math.min(28, Math.floor(sold / 4));

  if (isHotSaleProduct(p, ctx.vctx, ctx.now)) score += 22;

  if (isNewProduct(p, ctx.now)) score += 16;

  if (isHighRated(p)) score += 18;

  if (Number(p.rating) >= 4) score += 5;

  return Math.round(score * 10) / 10;
}

function passesTabFilter(tab, p, vctx, now) {
  const t = String(tab || "all").toLowerCase();
  if (t === "all" || t === "tatca") return true;
  if (t === "new" || t === "moi") return isNewProduct(p, now);
  if (t === "rating" || t === "danhgia") return isHighRated(p);
  if (t === "bestseller" || t === "banchay") return totalSold(p) >= 1;
  if (t === "hotsale" || t === "hot") return isHotSaleProduct(p, vctx, now);
  return true;
}

function attachRecommendMeta(list, ctxBase) {
  return list.map((p) => {
    const ctx = {
      ...ctxBase,
      personalMatch: false,
    };
    const score = computeScore(p, ctx);
    const badges = computeBadges(p, {
      personalMatch: ctx.personalMatch,
      vctx: ctxBase.vctx,
      now: ctxBase.now,
    });
    const enriched = enrichProductPricing(p);
    return {
      ...enriched,
      recommendScore: score,
      recommendBadges: badges,
    };
  });
}

/**
 * Gợi ý chính — scoring + tab + loại trừ đã mua / đã xem / recentIds (query)
 */
const getMainRecommendations = async ({
  userId = null,
  limit = 10,
  offset = 0,
  tab = "all",
  recentIds = [],
} = {}) => {
  const now = new Date();
  const safeLimit = Math.min(60, Math.max(1, Number(limit) || 10));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const purchased = await getPurchasedProductIds(userId);
  const { viewedIds, categoryIds: prefCat, brandIds: prefBrand } =
    await getUserViewAndPreference(userId);

  const exclude = new Set([
    ...purchased,
    ...viewedIds,
    ...recentIds.map(String),
  ]);

  const vctx = await loadVoucherHotContext(now);
  const tabQ = buildTabQuery(tab, now);

  const query = {
    ...baseProductQuery,
    ...tabQ,
    _id: {
      $nin: [...exclude]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
    },
  };

  let candidates = await Product.find(query)
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .limit(450)
    .lean();

  candidates = candidates.filter((p) => passesTabFilter(tab, p, vctx, now));

  const purchasedMeta = await enrichPurchasedPreferences(userId, prefCat, prefBrand);

  const ctxBase = {
    now,
    vctx,
    prefCategories: purchasedMeta.categories,
    prefBrands: purchasedMeta.brands,
  };

  let scored = attachRecommendMeta(candidates, ctxBase).sort((a, b) => {
    const d = Number(b.recommendScore) - Number(a.recommendScore);
    if (d !== 0) return d;
    return totalSold(b) - totalSold(a);
  });

  if (!userId || (!purchasedMeta.categories.size && !purchasedMeta.brands.size)) {
    scored = scored.sort(
      (a, b) =>
        totalSold(b) - totalSold(a) ||
        new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  const slice = scored.slice(safeOffset, safeOffset + safeLimit);
  return {
    items: slice,
    total: scored.length,
    hasMore: safeOffset + safeLimit < scored.length,
  };
};

/** Cộng category/brand từ sản phẩm đã mua */
async function enrichPurchasedPreferences(userId, prefCat, prefBrand) {
  const categories = new Set(prefCat);
  const brands = new Set(prefBrand);
  const uid = toId(userId);
  if (!uid) return { categories, brands };

  const orders = await Order.find({
    userId: uid,
    status: { $ne: "canceled" },
  })
    .select("products")
    .lean();
  const pids = new Set();
  for (const o of orders) {
    for (const line of o.products || []) {
      if (String(line.lineStatus || "active") === "canceled") continue;
      pids.add(String(line.productId));
    }
  }
  const ids = [...pids].filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!ids.length) return { categories, brands };

  const products = await Product.find({ _id: { $in: ids } })
    .select("categoryId brandId")
    .lean();
  for (const p of products) {
    if (p.categoryId) categories.add(String(p.categoryId));
    if (p.brandId) brands.add(String(p.brandId));
  }
  return { categories, brands };
}

const getByProductRecommendations = async ({
  productId,
  limit = 6,
  tab = "all",
} = {}) => {
  const pid = toId(productId);
  if (!pid) {
    throw new Error("Sản phẩm không hợp lệ");
  }
  const base = await Product.findById(pid)
    .select("categoryId brandId")
    .lean();
  if (!base) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  const now = new Date();
  const vctx = await loadVoucherHotContext(now);
  const tabQ = buildTabQuery(tab, now);

  const or = [{ categoryId: base.categoryId }];
  if (base.brandId) or.push({ brandId: base.brandId });

  const query = {
    ...baseProductQuery,
    ...tabQ,
    _id: { $ne: pid },
    $or: or,
  };

  let candidates = await Product.find(query)
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .limit(200)
    .lean();

  candidates = candidates.filter((p) => passesTabFilter(tab, p, vctx, now));

  const ctxBase = {
    now,
    vctx,
    prefCategories: new Set([String(base.categoryId || "")]),
    prefBrands: new Set(
      base.brandId ? [String(base.brandId)] : [],
    ),
  };

  let scored = attachRecommendMeta(candidates, ctxBase).sort((a, b) => {
    const sameCat =
      String(a.categoryId?._id || a.categoryId) ===
      String(base.categoryId);
    const sameCatB =
      String(b.categoryId?._id || b.categoryId) ===
      String(base.categoryId);
    if (sameCat !== sameCatB) return sameCat ? -1 : 1;
    const sameBrand =
      String(a.brandId?._id || a.brandId) === String(base.brandId);
    const sameBrandB =
      String(b.brandId?._id || b.brandId) === String(base.brandId);
    if (sameBrand !== sameBrandB) return sameBrand ? -1 : 1;
    return Number(b.recommendScore) - Number(a.recommendScore);
  });

  const safeLimit = Math.min(30, Math.max(1, Number(limit) || 6));
  return { items: scored.slice(0, safeLimit), total: scored.length, hasMore: false };
};

const getTrendingRecommendations = async ({ limit = 8 } = {}) => {
  const since = new Date(Date.now() - 7 * MS_DAY);
  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        status: { $ne: "canceled" },
      },
    },
    { $unwind: "$products" },
    {
      $match: {
        "products.lineStatus": { $ne: "canceled" },
      },
    },
    {
      $group: {
        _id: "$products.productId",
        units: { $sum: "$products.quantity" },
      },
    },
    { $sort: { units: -1 } },
    { $limit: Math.min(40, Math.max(1, Number(limit) || 8) * 5) },
  ]);

  const ids = rows.map((r) => r._id).filter(Boolean);
  if (!ids.length) {
    const fallback = await Product.find(baseProductQuery)
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .sort({ soldCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    const now = new Date();
    const vctx = await loadVoucherHotContext(now);
    const ctxBase = { now, vctx, prefCategories: new Set(), prefBrands: new Set() };
    return {
      items: attachRecommendMeta(fallback, ctxBase).map((p) => ({
        ...p,
        trendingUnits: 0,
      })),
    };
  }

  const orderMap = new Map(rows.map((r) => [String(r._id), r.units]));
  const products = await Product.find({
    ...baseProductQuery,
    _id: { $in: ids },
  })
    .populate("brandId", "name logo")
    .populate("categoryId", "name")
    .lean();

  const now = new Date();
  const vctx = await loadVoucherHotContext(now);
  const ctxBase = { now, vctx, prefCategories: new Set(), prefBrands: new Set() };

  const enriched = attachRecommendMeta(products, ctxBase)
    .map((p) => ({
      ...p,
      trendingUnits: orderMap.get(String(p._id)) || 0,
    }))
    .sort((a, b) => b.trendingUnits - a.trendingUnits);

  const safeLimit = Math.min(30, Math.max(1, Number(limit) || 8));
  return { items: enriched.slice(0, safeLimit) };
};

module.exports = {
  getMainRecommendations,
  getByProductRecommendations,
  getTrendingRecommendations,
};
