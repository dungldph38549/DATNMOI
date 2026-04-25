const ProductRouter = require("./ProductRouter");
const BrandRouter = require("./BrandRouter");
const VoucherRouter = require("./VoucherRouter");
const CategoryRouter = require("./CategoryRouter");
const ReviewRouter = require("./ReviewRouter");
const AdminReviewRouter = require("./adminReviewRoutes");
const SizeRouter = require("./SizeRouter");
const ShoelaceSizeRouter = require("./ShoelaceSizeRouter");
const ColorRouter = require("./ColorRouter");
const UserRouter = require("./UserRouter");
const OrderRouter = require("./OrderRouter");
const CartRouter = require("./CartRouter");
const ChatRouter = require("./ChatRouter");
const WalletRouter = require("./WalletRouter");
const ContactRouter = require("./ContactRouter");

const routes = (app) => {
  app.use("/api/product", ProductRouter);
  app.use("/api/user", UserRouter);
  app.use("/api/category", CategoryRouter);
  app.use("/api/brand", BrandRouter);
  app.use("/api/voucher", VoucherRouter);
  app.use("/api/reviews", ReviewRouter);
  app.use("/api/admin", AdminReviewRouter);
  app.use("/api/size", SizeRouter);
  app.use("/api/shoelace-size", ShoelaceSizeRouter);
  app.use("/api/color", ColorRouter);
  app.use("/api/order", OrderRouter);
  app.use("/api/cart", CartRouter);
  app.use("/api/chat", ChatRouter);
  app.use("/api/wallet", WalletRouter);
  app.use("/api/contact", ContactRouter);
};

module.exports = routes;
