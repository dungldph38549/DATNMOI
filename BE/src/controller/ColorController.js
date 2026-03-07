const ColorService = require("../service/ColorService");

const createColor = async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) {
            return res.status(200).json({
                status: "ERR",
                message: "The input is required",
            });
        }
        const response = await ColorService.createColor(req.body);
        return res.status(200).json(response);
    } catch (e) {
        return res.status(404).json({
            message: e,
        });
    }
};

const updateColor = async (req, res) => {
    try {
        const colorId = req.params.id;
        const data = req.body;
        if (!colorId) {
            return res.status(200).json({
                status: "ERR",
                message: "The colorId is required",
            });
        }
        const response = await ColorService.updateColor(colorId, data);
        return res.status(200).json(response);
    } catch (e) {
        return res.status(404).json({
            message: e,
        });
    }
};

const deleteColor = async (req, res) => {
    try {
        const colorId = req.params.id;
        if (!colorId) {
            return res.status(200).json({
                status: "ERR",
                message: "The colorId is required",
            });
        }
        const response = await ColorService.deleteColor(colorId);
        return res.status(200).json(response);
    } catch (e) {
        return res.status(404).json({
            message: e,
        });
    }
};

const getAllColor = async (req, res) => {
    try {
        const response = await ColorService.getAllColor();
        return res.status(200).json(response);
    } catch (e) {
        return res.status(404).json({
            message: e,
        });
    }
};

const getDetailColor = async (req, res) => {
    try {
        const colorId = req.params.id;
        if (!colorId) {
            return res.status(200).json({
                status: "ERR",
                message: "The colorId is required",
            });
        }
        const response = await ColorService.getDetailColor(colorId);
        return res.status(200).json(response);
    } catch (e) {
        return res.status(404).json({
            message: e,
        });
    }
};

module.exports = {
    createColor,
    updateColor,
    deleteColor,
    getAllColor,
    getDetailColor,
};
