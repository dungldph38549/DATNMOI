import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";



import HeaderComponent from "./components/HeaderComponent/HeaderComponent";
import FooterComponent from "./components/FooterComponent/FooterComponent";

import HomePage from "./pages/HomePage/HomePage";
import ProductPage from "./pages/ProductPage/ProductPage";
import AccessoriesPage from "./pages/AccessoriesPage/AccessoriesPage";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import Register from "./pages/Register/Register";
import Login from "./pages/Login/Login";
import ShoppingCartPage from "./pages/ShoppingCartPage/ShoppingCartPage";
import TermsConditionsPage from "./pages/TermsConditionsPage/TermsConditionsPage";
import ShippingPolicyPage from "./pages/ShippingPolicyPage/ShippingPolicyPage";
import ReturnPolicyPage from "./pages/ReturnPolicyPage/ReturnPolicyPage";
import SizeGuidePage from "./pages/SizeGuidePage/SizeGuidePage";
import StoreLocatorPage from "./pages/StoreLocatorPage/StoreLocatorPage";
import RecruitmentPage from "./pages/RecruitmentPage/RecruitmentPage";
import ContactPage from "./pages/ContactPage/ContactPage";
import CheckOut from "./pages/CheckOut/CheckOut";
import CategoryPage from "./pages/Category/CategoryPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import ProfilePage from "./pages/Profile/ProfilePage";
/* eslint-disable no-unused-vars -- used in Routes below */
import OrderHistoryPage from "./pages/OrderHistoryPage/OrderHistoryPage";
import OrderDetailPage from "./pages/OrderDetailPage/OrderDetailPage";
import PaymentReturnPage from "./pages/PaymentReturnPage/PaymentReturnPage";
import WishlistPage from "./pages/Wishlist/WishlistPage";
import SalePage from "./pages/SalePage/SalePage";
import VoucherPage from "./pages/VoucherPage/VoucherPage";
import ChatPage from "./pages/Chat/ChatPage";

//  IMPORT TRANG ADMIN USERS
import User from "./pages/User";
import AdminPage from "./Admin/AdminPage";
import AdminOrderDetail from "./Admin/AdminOrderDetailModern";
import ChatWidget from "./components/Chat/ChatWidget";
import CustomerSocketNotifier from "./components/CustomerSocketNotifier";

function RequireAuth({ children }) {
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!(user?.login && user?.token);
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="app min-h-screen flex flex-col bg-convot-cream">
      {/* Ẩn header site khi vào toàn bộ admin (/admin/*) */}
      {!isAdminRoute && <HeaderComponent />}

      <div className="content flex-1">
        {/* Chat widget (customer) - cố định góc dưới phải */}
        {!isAdminRoute && <CustomerSocketNotifier />}
        {!isAdminRoute && <ChatWidget />}
        <Routes>
          {/* CLIENT ROUTES */}
          <Route path="/" element={<HomePage />} />
          <Route path="/product" element={<ProductPage />} />
          <Route path="/phu-kien" element={<AccessoriesPage />} />
          <Route path="/sale" element={<SalePage />} />
          <Route path="/voucher" element={<VoucherPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/category" element={<CategoryPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route
            path="/profile"
            element={(
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            )}
          />
          <Route
            path="/cart"
            element={(
              <RequireAuth>
                <ShoppingCartPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/checkout"
            element={(
              <RequireAuth>
                <CheckOut />
              </RequireAuth>
            )}
          />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsConditionsPage />} />
          <Route path="/van-chuyen" element={<ShippingPolicyPage />} />
          <Route path="/chinh-sach-doi-tra" element={<ReturnPolicyPage />} />
          <Route path="/huong-dan-chon-size" element={<SizeGuidePage />} />
          <Route path="/he-thong-cua-hang" element={<StoreLocatorPage />} />
          <Route path="/tuyen-dung" element={<RecruitmentPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route
            path="/orders"
            element={(
              <RequireAuth>
                <OrderHistoryPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/orders/:id"
            element={(
              <RequireAuth>
                <OrderDetailPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/payment/return"
            element={<PaymentReturnPage />}
          />

          {/* ADMIN ROUTE */}
          <Route path="/admin/users" element={<User />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />

          {/* Chat */}
          <Route path="/chat" element={<ChatPage />} />

          {/* 404 - Đã sửa thành <Route> */}
          <Route
            path="*"
            element={
              <div className="py-5 text-center">
                <h1>404</h1>
                <p>Trang không tồn tại.</p>
              </div>
            }
          />
        </Routes>
      </div>

      <FooterComponent />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
