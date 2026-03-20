import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "cart_v1";

const loadCart = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
    const normalized = parsed.items.map((i) => ({
      ...i,
      qty: i.qty ?? i.quantity ?? 1,
      price: Number(i.price ?? 0),
      sku:
        i.sku == null ? null : String(i.sku).trim().toUpperCase(),
      size: i.size ?? null,
    }));
    return { items: normalized };
  } catch {
    return { items: [] };
  }
};

const saveCart = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }));
  } catch {
    // ignore write errors (storage full, private mode, etc.)
  }
};

const cartSlice = createSlice({
  name: "cart",
  initialState: loadCart(),
  reducers: {
    addToCart: (state, action) => {
      const payload = action.payload || {};
      const productId = payload.productId || payload._id || payload.id;
      if (!productId) return;

      const qty = Math.max(1, Number(payload.qty || 1));
      const name = payload.name || "Unnamed product";
      const image = payload.image || "";
      const price = Number(payload.price || 0);
      const skuRaw = payload.sku ?? null;
      const sku =
        skuRaw == null ? null : String(skuRaw).trim().toUpperCase();
      const size = payload.size ?? null;

      const existing = state.items.find((i) => i.productId === productId);
      if (existing) {
        existing.qty += qty;
        // Nếu user thêm lại cùng sản phẩm nhưng khác biến thể (size/sku) → cập nhật thông tin để checkout đúng SKU.
        if (sku !== null && existing.sku !== sku) {
          existing.sku = sku;
          existing.size = size;
        }
        if (price) existing.price = price;
      } else {
        state.items.push({
          productId,
          name,
          image,
          price,
          qty,
          sku,
          size,
        });
      }

      saveCart(state);
    },
    removeFromCart: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter((i) => i.productId !== id);
      saveCart(state);
    },
    setQty: (state, action) => {
      const { productId, qty } = action.payload || {};
      const item = state.items.find((i) => i.productId === productId);
      if (!item) return;

      const nextQty = Number(qty);
      if (Number.isNaN(nextQty) || nextQty <= 0) {
        state.items = state.items.filter((i) => i.productId !== productId);
      } else {
        item.qty = Math.floor(nextQty);
      }

      saveCart(state);
    },
    clearCart: (state) => {
      state.items = [];
      saveCart(state);
    },
  },
});

export const { addToCart, removeFromCart, setQty, clearCart } =
  cartSlice.actions;

export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + (i.qty || 0), 0);

export const selectCartSubtotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0);

export default cartSlice.reducer;

