import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "../redux/counterSlice";
import cartReducer from "../redux/cartSlice";
import userReducer from "../redux/userSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    cart: cartReducer,
    user: userReducer,
  },
});
