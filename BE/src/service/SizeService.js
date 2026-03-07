const mongoose = require("mongoose");
const Size = require("../model/SizeModel");

const createSize = async (newSize) => {
    try {
        const { name } = newSize;
        if (!name) {
            return {
                status: "ERR",
                message: "The name is required",
            };
        }
        const checkSize = await Size.findOne({ name: name.trim() });
        if (checkSize !== null) {
            return {
                status: "ERR",
                message: "The name of size is already exist",
            };
        }
        const createdSize = await Size.create({
            name: name.trim(),
        });
        if (createdSize) {
            return {
                status: "OK",
                message: "SUCCESS",
                data: createdSize,
            };
        }
    } catch (e) {
        throw e;
    }
};

const updateSize = async (id, data) => {
    try {
        const checkSize = await Size.findOne({ _id: id });
        if (checkSize === null) {
            return {
                status: "ERR",
                message: "The size is not defined",
            };
        }

        const updatedSize = await Size.findByIdAndUpdate(id, data, { new: true });
        return {
            status: "OK",
            message: "SUCCESS",
            data: updatedSize,
        };
    } catch (e) {
        throw e;
    }
};

const deleteSize = async (id) => {
    try {
        const checkSize = await Size.findOne({ _id: id });
        if (checkSize === null) {
            return {
                status: "ERR",
                message: "The size is not defined",
            };
        }

        await Size.findByIdAndDelete(id);
        return {
            status: "OK",
            message: "Delete size success",
        };
    } catch (e) {
        throw e;
    }
};

const getAllSize = async () => {
    try {
        const allSize = await Size.find().sort({ createdAt: -1, updatedAt: -1 });
        return {
            status: "OK",
            message: "Success",
            data: allSize,
        };
    } catch (e) {
        throw e;
    }
};

const getDetailSize = async (id) => {
    try {
        const size = await Size.findOne({ _id: id });
        if (size === null) {
            return {
                status: "ERR",
                message: "The size is not defined",
            };
        }
        return {
            status: "OK",
            message: "SUCCESS",
            data: size,
        };
    } catch (e) {
        throw e;
    }
};

module.exports = {
    createSize,
    updateSize,
    deleteSize,
    getAllSize,
    getDetailSize,
};
