import { createSlice } from '@reduxjs/toolkit';

const WISHLIST_KEY = 'sneakerconverse_wishlist_v1';

const loadWishlist = () => {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistWishlist = (items) => {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Could not save wishlist to localStorage", err);
  }
};

const initialState = {
  items: loadWishlist(),
};

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const item = action.payload; // Usually the whole product object
      const exists = state.items.find((x) => x._id === item._id);
      if (!exists) {
        state.items.push(item);
        persistWishlist(state.items);
      }
    },
    removeFromWishlist: (state, action) => {
      const id = action.payload; // Item ID
      state.items = state.items.filter((x) => x._id !== id);
      persistWishlist(state.items);
    },
    toggleWishlist: (state, action) => {
      const item = action.payload;
      const index = state.items.findIndex((x) => x._id === item._id);
      if (index >= 0) {
        state.items.splice(index, 1);
      } else {
        state.items.push(item);
      }
      persistWishlist(state.items);
    },
    clearWishlist: (state) => {
      state.items = [];
      persistWishlist(state.items);
    },
  },
});

export const { addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist } = wishlistSlice.actions;

export default wishlistSlice.reducer;
