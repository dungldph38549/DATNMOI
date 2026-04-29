const BannerService = require("../services/BannerService");

const getPublicBanners = async (req, res) => {
  try {
    const result = await BannerService.getPublicBanners();
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ status: "ERR", message: "Lỗi khi lấy banner công khai" });
  }
};

const getAllBannersAdmin = async (req, res) => {
  try {
    const result = await BannerService.getAllBannersAdmin();
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ status: "ERR", message: "Lỗi khi lấy danh sách banner" });
  }
};

const createBanner = async (req, res) => {
  try {
    const result = await BannerService.createBanner(req.body);
    if (result.status === "ERR") return res.status(400).json(result);
    return res.status(201).json(result);
  } catch (e) {
    return res.status(500).json({ status: "ERR", message: "Lỗi khi tạo banner" });
  }
};

const updateBanner = async (req, res) => {
  try {
    const result = await BannerService.updateBanner(req.params.id, req.body);
    if (result.status === "ERR") return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ status: "ERR", message: "Lỗi khi cập nhật banner" });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const result = await BannerService.deleteBanner(req.params.id);
    if (result.status === "ERR") return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ status: "ERR", message: "Lỗi khi xóa banner" });
  }
};

const toggleBanner = async (req, res) => {
  try {
    const result = await BannerService.toggleBanner(req.params.id);
    if (result.status === "ERR") return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ status: "ERR", message: "Lỗi khi bật/tắt banner" });
  }
};

const reorderBanners = async (req, res) => {
  try {
    const result = await BannerService.reorderBanners(req.body);
    if (result.status === "ERR") return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ status: "ERR", message: "Lỗi khi cập nhật thứ tự banner" });
  }
};

module.exports = {
  getPublicBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBanner,
  reorderBanners,
};
