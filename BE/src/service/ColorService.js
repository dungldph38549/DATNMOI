const mongoose = require("mongoose");
const Color = require("../model/ColorModel");

const createColor = async (newColor) => {
    try {
        const { name, code } = newColor;
        if (!name || !code) {
            return {
                status: "ERR",
                message: "The name and code are required",
            };
        }
        const checkColor = await Color.findOne({ name: name.trim() });
        if (checkColor !== null) {
            return {
                status: "ERR",
                message: "The name of color is already exist",
            };
        }
        const createdColor = await Color.create({
            name: name.trim(),
            code: code.trim(),
        });
        if (createdColor) {
            return {
                status: "OK",
                message: "SUCCESS",
                data: createdColor,
            };
        }
    } catch (e) {
        throw e;
    }
};

const updateColor = async (id, data) => {
    try {
        const checkColor = await Color.findOne({ _id: id });
        if (checkColor === null) {
            return {
                status: "ERR",
                message: "The color is not defined",
            };
        }

        const updatedColor = await Color.findByIdAndUpdate(id, data, { new: true });
        return {
            status: "OK",
            message: "SUCCESS",
            data: updatedColor,
        };
    } catch (e) {
        throw e;
    }
};

const deleteColor = async (id) => {
    try {
        const checkColor = await Color.findOne({ _id: id });
        if (checkColor === null) {
            return {
                status: "ERR",
                message: "The color is not defined",
            };
        }

        await Color.findByIdAndDelete(id);
        return {
            status: "OK",
            message: "Delete color success",
        };
    } catch (e) {
        throw e;
    }
};

const getAllColor = async () => {
    try {
        const allColor = await Color.find().sort({ createdAt: -1, updatedAt: -1 });
        return {
            status: "OK",
            message: "Success",
            data: allColor,
        };
    } catch (e) {
        throw e;
    }
};

const getDetailColor = async (id) => {
    try {
        const color = await Color.findOne({ _id: id });
        if (color === null) {
            return {
                status: "ERR",
                message: "The color is not defined",
            };
        }
        return {
            status: "OK",
            message: "SUCCESS",
            data: color,
        };
    } catch (e) {
        throw e;
    }
};

module.exports = {
    createColor,
    updateColor,
    deleteColor,
    getAllColor,
    getDetailColor,
};
