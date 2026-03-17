import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY_USER = "user_v1";
const STORAGE_KEY_ACCESS = "access_token";
const STORAGE_KEY_REFRESH = "refresh_token";

const loadUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return { user: null };
    const user = JSON.parse(raw);
    return { user };
  } catch {
    return { user: null };
  }
};

const saveUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_ACCESS);
      localStorage.removeItem(STORAGE_KEY_REFRESH);
    }
  } catch {
    // ignore
  }
};

const userSlice = createSlice({
  name: "user",
  initialState: loadUser(),
  reducers: {
    setUser: (state, action) => {
      const { user, access_token, refresh_token } = action.payload || {};
      state.user = user || null;
      saveUser(user);
      if (access_token) localStorage.setItem(STORAGE_KEY_ACCESS, access_token);
      if (refresh_token) localStorage.setItem(STORAGE_KEY_REFRESH, refresh_token);
    },
    logout: (state) => {
      state.user = null;
      saveUser(null);
    },
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;
