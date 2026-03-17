const SizeService = require("../services/SizeService");

const createSize = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(200).json({
        status: "ERR",
        message: "The input is required",
      });
    }
    const response = await SizeService.createSize(req.body);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({
      message: e,
    });
  }
};

const updateSize = async (req, res) => {
  try {
    const sizeId = req.params.id;
    const data = req.body;
    if (!sizeId) {
      return res.status(200).json({
        status: "ERR",
        message: "The sizeId is required",
      });
    }
    const response = await SizeService.updateSize(sizeId, data);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({
      message: e,
    });
  }
};

const deleteSize = async (req, res) => {
  try {
    const sizeId = req.params.id;
    if (!sizeId) {
      return res.status(200).json({
        status: "ERR",
        message: "The sizeId is required",
      });
    }
    const response = await SizeService.deleteSize(sizeId);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({
      message: e,
    });
  }
};

const getAllSize = async (req, res) => {
  try {
    const response = await SizeService.getAllSize();
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({
      message: e,
    });
  }
};

const getDetailSize = async (req, res) => {
  try {
    const sizeId = req.params.id;
    if (!sizeId) {
      return res.status(200).json({
        status: "ERR",
        message: "The sizeId is required",
      });
    }
    const response = await SizeService.getDetailSize(sizeId);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({
      message: e,
    });
  }
};

module.exports = {
  createSize,
  updateSize,
  deleteSize,
  getAllSize,
  getDetailSize,
};
