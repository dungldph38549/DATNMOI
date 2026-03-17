const ProductRouter = require("./ProductRouter");
const BrandRouter = require("./BrandRouter");
const VoucherRouter = require("./VoucherRouter");
const CategoryRouter = require("./CategoryRouter");
const ReviewRouter = require("./ReviewRouter");
const AdminReviewRouter = require("./adminReviewRoutes");
const SizeRouter = require("./SizeRouter");
const ColorRouter = require("./ColorRouter");
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
  app.use("/api/brand", BrandRouter);
  app.use("/api/voucher", VoucherRouter);
  app.use("/api/category", CategoryRouter);
  app.use("/api/reviews", ReviewRouter);
  app.use("/api/admin", AdminReviewRouter);
  app.use("/api/size", SizeRouter);
  app.use("/api/color", ColorRouter);

  // Dùng /api/user (không có "s") để khớp với API gọi từ Frontend
  app.use("/api/user", UserRouter);
};

module.exports = routes;
