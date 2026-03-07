import Category from "../pages/Category/Category.jsx";
import Checkout from "../pages/CheckOut/CheckOut.jsx";
import Detail from "../pages/Detail/Detail.jsx";
import NotFoundPage from "../pages/NotFoundPage/NotFoundPage.jsx";
import HomePages from "../pages/HomePages/HomePages.jsx";
import Login from "../pages/Login/Login.jsx";
import Register from "../pages/Register/Register.jsx";
import CartPage from "../pages/CartPage/CartPage.jsx";
import AdminPage from "../admin/AdminPage.jsx";
import CheckoutPage from "../pages/CheckOutPage/CheckOutPage.jsx";
import OrderPage from "../pages/OrderPage/OrderPage.jsx";
import OrderDetailPage from "../pages/OrderDetailPage/OrderDetailPage.jsx";
import AdminOrderDetailPage from "../admin/AdminOrderDetail.jsx";
import ReturnPayment from "../pages/ReturnPayment/ReturnPayment.jsx";
import CustommerPage from "../pages/CustommerPage/CustommerPage.jsx";
import OrderHistoryPage from "../pages/OrderHistoryPage/OrderHistoryPage.jsx";
import User from "../pages/User/index.jsx";

export const routers = [
  {
    path: "/",
    page: HomePages,
    isShowHeader: true,
  },
  {
    path: "/category",
    page: Category,
    isShowHeader: true,
  },
  {
    path: "/return-payment",
    page: ReturnPayment,
    isShowHeader: true,
  },
  {
    path: "/profile",
    page: CustommerPage,
    isShowHeader: true,
  },
  {
    path: "/detail/:id",
    page: Detail,
    isShowHeader: true,
  },
  {
    path: "/checkout",
    page: Checkout,
    isShowHeader: true,
  },
  {
    path: "/cart",
    page: CartPage,
    isShowHeader: true,
  },
  {
    path: "/login",
    page: Login,
    isShowHeader: true,
  },
  {
    path: "/register",
    page: Register,
    isShowHeader: true,
  },
  {
    path: "/admin",
    page: AdminPage,
    isShowHeader: false,
  },
  {
    path: "/admin/order/:id",
    page: AdminOrderDetailPage,
    isShowHeader: false,
  },
  {
    path: "/admin/users",
    page: User,
    isShowHeader: false,
  },
  {
    path: "/checkoutpage",
    page: CheckoutPage,
    isShowHeader: true,
  },
  {
    path: "/orders",
    page: OrderPage,
    isShowHeader: true,
  },
  {
    path: "/orders-history",
    page: OrderHistoryPage,
    isShowHeader: true,
  },
  {
    path: "/order/:id",
    page: OrderDetailPage,
    isShowHeader: true,
  },

  
  {
    path: "*",
    page: NotFoundPage,
    isShowHeader: false,
  },
];