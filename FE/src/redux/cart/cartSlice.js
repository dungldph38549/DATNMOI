import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "cart_v1";

const buildCartKey = ({ productId, sku, size }) => {
  const variantKey =
    sku != null && String(sku).trim() !== ""
      ? String(sku).trim().toUpperCase()
      : size != null && String(size).trim() !== ""
        ? `SIZE:${String(size).trim()}`
        : "default";
  return `${String(productId)}::${variantKey}`;
};

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
      originalPrice:
        i.originalPrice == null ? null : Number(i.originalPrice),
      sku:
        i.sku == null ? null : String(i.sku).trim().toUpperCase(),
      size: i.size ?? null,
      cartKey:
        i.cartKey ??
        buildCartKey({
          productId: i.productId || i._id || i.id,
          sku: i.sku,
          size: i.size,
        }),
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
      const originalPrice =
        payload.originalPrice == null ? null : Number(payload.originalPrice);
      const skuRaw = payload.sku ?? null;
      const sku =
        skuRaw == null ? null : String(skuRaw).trim().toUpperCase();
      const size = payload.size ?? null;
      const forceCartKey =
        payload.cartKey != null && String(payload.cartKey).trim() !== ""
          ? String(payload.cartKey).trim()
          : null;
      const noMerge = !!payload.noMerge;
      const cartKey = forceCartKey || buildCartKey({ productId, sku, size });

      const existing = noMerge
        ? null
        : state.items.find((i) => i.cartKey === cartKey);
      if (existing) {
        existing.qty += qty;
        if (price) existing.price = price;
        if (originalPrice != null && Number.isFinite(originalPrice)) {
          existing.originalPrice = originalPrice;
        }
      } else {
        state.items.push({
          cartKey,
          productId,
          name,
          image,
          price,
          originalPrice,
          qty,
          sku,
          size,
        });
      }

      saveCart(state);
    },
    removeFromCart: (state, action) => {
      const payload = action.payload;
      if (payload && typeof payload === "object") {
        const { cartKey, productId } = payload;
        state.items = state.items.filter((i) => {
          if (cartKey) return i.cartKey !== cartKey;
          if (productId) return i.productId !== productId;
          return true;
        });
      } else {
        const id = payload;
        state.items = state.items.filter(
          (i) => i.productId !== id && i.cartKey !== id,
        );
      }
      saveCart(state);
    },
    setQty: (state, action) => {
      const { cartKey, productId, qty } = action.payload || {};
      const item = cartKey
        ? state.items.find((i) => i.cartKey === cartKey)
        : state.items.find((i) => i.productId === productId);
      if (!item) return;

      const nextQty = Number(qty);
      if (Number.isNaN(nextQty) || nextQty <= 0) {
        state.items = state.items.filter((i) =>
          cartKey ? i.cartKey !== cartKey : i.productId !== productId,
        );
      } else {
        item.qty = Math.floor(nextQty);
      }

      saveCart(state);
    },
    updateCartVariant: (state, action) => {
      const { cartKey, sku, size, price, originalPrice } = action.payload || {};
      if (!cartKey) return;
      const item = state.items.find((i) => i.cartKey === cartKey);
      if (!item) return;

      const normalizedSku =
        sku == null || String(sku).trim() === ""
          ? null
          : String(sku).trim().toUpperCase();
      const normalizedSize =
        size == null || String(size).trim() === ""
          ? null
          : String(size).trim();

      const nextCartKey = buildCartKey({
        productId: item.productId,
        sku: normalizedSku,
        size: normalizedSize,
      });

      item.sku = normalizedSku;
      item.size = normalizedSize;
      if (price != null && Number.isFinite(Number(price))) {
        item.price = Number(price);
      }
      if (originalPrice != null && Number.isFinite(Number(originalPrice))) {
        item.originalPrice = Number(originalPrice);
      }
      item.cartKey = nextCartKey;

      // Nếu đổi biến thể trùng item đã có sẵn thì gộp qty vào dòng đó.
      const duplicate = state.items.find(
        (i) => i !== item && i.cartKey === nextCartKey,
      );
      if (duplicate) {
        duplicate.qty += item.qty;
        state.items = state.items.filter((i) => i !== item);
      }

      saveCart(state);
    },
    clearCart: (state) => {
      state.items = [];
      saveCart(state);
    },
    removeManyFromCart: (state, action) => {
      const ids = Array.isArray(action.payload) ? action.payload : [];
      if (ids.length === 0) return;
      const idSet = new Set(ids.map((id) => String(id)));
      state.items = state.items.filter(
        (i) =>
          !idSet.has(String(i.productId)) &&
          !idSet.has(String(i.cartKey || "")),
      );
      saveCart(state);
    },
    removeBuyNowItems: (state, action) => {
      const keys = Array.isArray(action.payload) ? action.payload : null;
      const keySet = keys ? new Set(keys.map((k) => String(k))) : null;
      state.items = state.items.filter((i) => {
        const itemKey = String(i.cartKey || "");
        const isBuyNow = itemKey.includes("::BUY_NOW::");
        if (!isBuyNow) return true;
        if (!keySet) return false;
        return !keySet.has(itemKey);
      });
      saveCart(state);
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  setQty,
  clearCart,
  removeManyFromCart,
  updateCartVariant,
  removeBuyNowItems,
} =
  cartSlice.actions;

export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + (i.qty || 0), 0);

export const selectCartSubtotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0);

export default cartSlice.reducer;

