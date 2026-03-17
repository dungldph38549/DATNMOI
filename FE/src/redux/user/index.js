import { createSlice } from "@reduxjs/toolkit";
import { getOrCreateGuestId } from "../../const/index.ts";

const user = JSON.parse(localStorage.getItem("user"));
let initialState = {
  id: getOrCreateGuestId(),
  isGuest: true,
  login: false,
  name: "",
  email: "",
  phone: "",
  address: "",
  isAdmin: false,
  token: "",
  refreshToken: "",
};
if (user) {
  initialState = {
    ...user,
  };
}

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      return {
        ...state,
        ...action.payload,
        id: action.payload._id,
        isGuest: false,
      };
    },
    clearUser: () => {
      localStorage.removeItem("user");
      return {
        id: getOrCreateGuestId(),
        isGuest: true,
        login: false,
        name: "",
        email: "",
        phone: "",
        address: "",
        isAdmin: false,
        token: "",
        refreshToken: "",
      };
    },
    updateUserInfo: (state, action) => {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { setUser, clearUser, updateUserInfo } = userSlice.actions;

export default userSlice.reducer;
