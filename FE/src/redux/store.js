import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./slides/counterSlice";
import checkoutReducer from "./checkout/checkoutSlide";
import cartReducer from "./cart/cartSlice";
import userReducer from "./user/index";
import generalReducer from "./genaral/index";
import wishlistReducer from "./wishlist/wishlistSlice";

export const store = configureStore({
  reducer: {
    checkout: checkoutReducer,
    counter: counterReducer,
    cart: cartReducer,
    user: userReducer,
    general: generalReducer,
    wishlist: wishlistReducer,
  },
});

store.subscribe(() => {
  try {
    const state = store.getState();
    const products = state.checkout.products;
    localStorage.setItem("checkout_products", JSON.stringify(products));

    const user = state.user;
    localStorage.setItem("user", JSON.stringify(user));

    const cart = state.cart.items;
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch (e) {
    console.error("Không thể lưu vào localStorage", e);
  }
});
