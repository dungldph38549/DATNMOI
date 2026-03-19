const ProductRouter = require("./ProductRouter");
const BrandRouter = require("./BrandRouter");
const VoucherRouter = require("./VoucherRouter");
const CategoryRouter = require("./CategoryRouter");
const ReviewRouter = require("./ReviewRouter");
const AdminReviewRouter = require("./adminReviewRoutes");
const SizeRouter = require("./SizeRouter");
const ColorRouter = require("./ColorRouter");
const UserRouter = require("./UserRouter");
const OrderRouter = require("./OrderRouter");
const inventoryRouter = require("./inventoryRoutes");
const CartRouter = require("./CartRouter");

const routes = (app) => {
  app.use("/api/product", ProductRouter);
  app.use("/api/user", UserRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/category", CategoryRouter);
  app.use("/api/brand", BrandRouter);
  app.use("/api/voucher", VoucherRouter);
  app.use("/api/reviews", ReviewRouter);
  app.use("/api/admin", AdminReviewRouter);
  app.use("/api/size", SizeRouter);
  app.use("/api/color", ColorRouter);
  app.use("/api/order", OrderRouter);
  app.use("/api/cart", CartRouter);
};

module.exports = routes;
