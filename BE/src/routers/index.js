const ProductRouter = require("./ProductRouter");

const routes = (app) => {
  app.use("/api/product", ProductRouter);
};

module.exports = routes;
