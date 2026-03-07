const mongoose = require("mongoose");
require("dotenv").config();
const SizeService = require("./src/service/SizeService");
const ColorService = require("./src/service/ColorService");

const mongoURI = process.env.MONGO_DB;

async function runTests() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB for testing");

        // Test Size
        console.log("--- Testing Size ---");
        const newSize = await SizeService.createSize({ name: "42" });
        console.log("Create Size:", JSON.stringify(newSize, null, 2));

        const sizeId = newSize.data._id;
        const updateSize = await SizeService.updateSize(sizeId, { name: "43" });
        console.log("Update Size:", JSON.stringify(updateSize, null, 2));

        const detailSize = await SizeService.getDetailSize(sizeId);
        console.log("Detail Size:", JSON.stringify(detailSize, null, 2));

        const allSizes = await SizeService.getAllSize();
        console.log("All Sizes Count:", allSizes.data.length);

        const deleteSize = await SizeService.deleteSize(sizeId);
        console.log("Delete Size:", JSON.stringify(deleteSize, null, 2));

        // Test Color
        console.log("\n--- Testing Color ---");
        const newColor = await ColorService.createColor({ name: "Red", code: "#FF0000" });
        console.log("Create Color:", JSON.stringify(newColor, null, 2));

        const colorId = newColor.data._id;
        const updateColor = await ColorService.updateColor(colorId, { name: "Crimson", code: "#DC143C" });
        console.log("Update Color:", JSON.stringify(updateColor, null, 2));

        const detailColor = await ColorService.getDetailColor(colorId);
        console.log("Detail Color:", JSON.stringify(detailColor, null, 2));

        const allColors = await ColorService.getAllColor();
        console.log("All Colors Count:", allColors.data.length);

        const deleteColor = await ColorService.deleteColor(colorId);
        console.log("Delete Color:", JSON.stringify(deleteColor, null, 2));

        console.log("\nTests completed successfully!");
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await mongoose.connection.close();
    }
}

runTests();
