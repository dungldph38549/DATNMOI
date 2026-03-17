const ProductRouter = require("./ProductRouter");
const UserRouter = require("./UserRouter");
const inventoryRouter = require("./inventoryRoutes");
const CategoryRouter = require("./CategoryRouter");
const BrandRouter = require("./BrandRouter");

const routes = (app) => {
  app.use("/api/product", ProductRouter);
  app.use("/api/user", UserRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/category", CategoryRouter);
  app.use("/api/brand", BrandRouter);
};

module.exports = routes;
