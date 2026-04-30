const RecommendService = require("../services/RecommendService");

const parseRecentIds = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }
  return String(raw)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

exports.getRecommend = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const userId =
      req.query.userId ||
      req.user?.id ||
      req.user?._id ||
      null;
    const tab = req.query.tab || "all";
    const recentIds = parseRecentIds(req.query.recentIds);

    const result = await RecommendService.getMainRecommendations({
      userId,
      limit,
      offset,
      tab,
      recentIds,
    });

    return res.status(200).json({
      status: "OK",
      message: "Thành công",
      data: result.items,
      meta: {
        total: result.total,
        hasMore: result.hasMore,
        limit,
        offset,
        tab,
      },
    });
  } catch (err) {
    console.error("[RecommendController.getRecommend]", err);
    return res.status(500).json({
      status: "ERR",
      message: err.message || "Không thể tải gợi ý sản phẩm",
    });
  }
};

exports.getByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const tab = req.query.tab || "all";

    const result = await RecommendService.getByProductRecommendations({
      productId,
      limit,
      tab,
    });

    return res.status(200).json({
      status: "OK",
      message: "Thành công",
      data: result.items,
      meta: { total: result.total, hasMore: result.hasMore, tab },
    });
  } catch (err) {
    const msg = err.message || "Lỗi gợi ý";
    const code = msg.includes("Không tìm thấy") ? 404 : 500;
    return res.status(code).json({
      status: "ERR",
      message: msg,
    });
  }
};

exports.getTrending = async (req, res) => {
  try {
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const result = await RecommendService.getTrendingRecommendations({ limit });
    return res.status(200).json({
      status: "OK",
      message: "Thành công",
      data: result.items,
    });
  } catch (err) {
    console.error("[RecommendController.getTrending]", err);
    return res.status(500).json({
      status: "ERR",
      message: err.message || "Không thể tải xu hướng",
    });
  }
};
