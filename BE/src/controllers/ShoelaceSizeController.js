const ShoelaceSizeService = require("../services/ShoelaceSizeService");

const createShoelaceSize = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(200).json({ status: "ERR", message: "The input is required" });
    }
    const response = await ShoelaceSizeService.createShoelaceSize(req.body);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({ message: e });
  }
};

const updateShoelaceSize = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(200).json({ status: "ERR", message: "The id is required" });
    }
    const response = await ShoelaceSizeService.updateShoelaceSize(id, req.body);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({ message: e });
  }
};

const deleteShoelaceSize = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(200).json({ status: "ERR", message: "The id is required" });
    }
    const response = await ShoelaceSizeService.deleteShoelaceSize(id);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({ message: e });
  }
};

const getAllShoelaceSize = async (req, res) => {
  try {
    const response = await ShoelaceSizeService.getAllShoelaceSize();
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({ message: e });
  }
};

const getDetailShoelaceSize = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(200).json({ status: "ERR", message: "The id is required" });
    }
    const response = await ShoelaceSizeService.getDetailShoelaceSize(id);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(404).json({ message: e });
  }
};

module.exports = {
  createShoelaceSize,
  updateShoelaceSize,
  deleteShoelaceSize,
  getAllShoelaceSize,
  getDetailShoelaceSize,
};
