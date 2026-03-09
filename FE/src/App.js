import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./assets/css/bootstrap.min.css";
import "./assets/css/main.css";
import "./assets/css/blue.css";
import "./assets/css/font-awesome.css";

import HeaderComponent from "./components/HeaderComponent/HeaderComponent";
import FooterComponent from "./components/FooterComponent/FooterComponent";

import HomePage from "./pages/HomePage/HomePage";
import ProductPage from "./pages/ProductPage/ProductPage";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import Register from "./pages/Register/Register";
import Login from "./pages/Login/Login";
import ShoppingCartPage from "./pages/ShoppingCartPage/ShoppingCartPage";
import TermsConditionsPage from "./pages/TermsConditionsPage/TermsConditionsPage";
import ContactPage from "./pages/ContactPage/ContactPage";
import CheckOut from "./pages/CheckOut/CheckOut";
import CategoryPage from "./pages/Category/CategoryPage";

//  IMPORT TRANG ADMIN USERS
import User from "./pages/User"; 
// Nếu file của bạn là ./pages/user/index.jsx thì đổi lại cho đúng:
// import User from "./pages/user";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <HeaderComponent />

        <div className="content">
          <Routes>

            {/* CLIENT ROUTES */}
            <Route path="/" element={<HomePage />} />
            <Route path="/product" element={<ProductPage />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/category" element={<CategoryPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cart" element={<ShoppingCartPage />} />
            <Route path="/checkout" element={<CheckOut />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsConditionsPage />} />

            {/*  ADMIN ROUTE */}
            <Route path="/admin/users" element={<User />} />

            {/* 404 */}
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
    </BrowserRouter>
  );
}

export default App;
