import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <HeaderComponent />

        <div className="content">
          <Routes>
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