const Order = require("../model/OrderModel");

const createOrder = async (req, res) => {
  try {

    const newOrder = new Order(req.body);

    const savedOrder = await newOrder.save();

    res.status(200).json({
      status: "OK",
      message: "Create order success",
      data: savedOrder,
    });

  } catch (error) {

    res.status(500).json({
      status: "ERR",
      message: error.message,
    });

  }
};

module.exports = {
  createOrder,
};