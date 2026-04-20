import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "checkout_products";

// Load data from localStorage
const loadFromLocalStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return [];
  }
};

// Save data to localStorage
const saveToLocalStorage = (products) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
};

// Helper function to find product by ID and SKU
const findProduct = (products, productId, sku) => {
  return products.find(
    (p) => p.productId === productId && (p.sku || null) === (sku || null),
  );
};

// Helper function to create unique key for product identification
const getProductKey = (productId, sku) => {
  return `${productId}-${sku || "default"}`;
};

const initialState = {
  products: loadFromLocalStorage(),
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    addProduct: (state, action) => {
      const { productId, sku, quantity = 1 } = action.payload;

      // Validate input
      if (!productId) {
        console.error("Product ID is required");
        return;
      }

      const existing = findProduct(state.products, productId, sku);

      if (existing) {
        // Update existing product quantity
        existing.quantity += quantity;
      } else {
        // Add new product
        state.products.push({
          ...action.payload,
          quantity,
          key: getProductKey(productId, sku), // Add unique key for debugging
        });
      }

      // Save to localStorage
      saveToLocalStorage(state.products);
    },

    setMultiProducts: (state, action) => {
      if (!Array.isArray(action.payload)) {
        console.error("setMultiProducts expects an array");
        return;
      }

      action.payload.forEach((product) => {
        const { productId, sku, quantity = 1 } = product;

        if (!productId) {
          console.error("Product ID is required");
          return;
        }

        const existing = findProduct(state.products, productId, sku);

        if (existing) {
          existing.quantity += quantity;
        } else {
          state.products.push({
            ...product,
            quantity,
            key: getProductKey(productId, sku),
          });
        }
      });

      saveToLocalStorage(state.products);
    },

    removeProduct: (state, action) => {
      const { productId, sku = null } = action.payload;

      if (!productId) {
        console.error("Product ID is required for removal");
        return;
      }

      const initialLength = state.products.length;
      state.products = state.products.filter(
        (p) => !(p.productId === productId && (p.sku || null) === sku),
      );

      // Check if product was actually removed
      if (state.products.length === initialLength) {
        console.warn("No product found to remove:", { productId, sku });
      }

      saveToLocalStorage(state.products);
    },

    changeQuantity: (state, action) => {
      const { productId, sku = null, delta } = action.payload;

      if (!productId || typeof delta !== "number") {
        console.error("Invalid parameters for changeQuantity");
        return;
      }

      const product = findProduct(state.products, productId, sku);

      if (product) {
        const newQuantity = product.quantity + delta;
        product.quantity = Math.max(1, newQuantity); // Minimum quantity is 1
      } else {
        console.warn("Product not found for quantity change:", {
          productId,
          sku,
        });
      }

      saveToLocalStorage(state.products);
    },

    setQuantity: (state, action) => {
      const { productId, sku = null, quantity } = action.payload;

      if (!productId || typeof quantity !== "number" || quantity < 1) {
        console.error("Invalid parameters for setQuantity");
        return;
      }

      const product = findProduct(state.products, productId, sku);

      if (product) {
        product.quantity = quantity;
      } else {
        console.warn("Product not found for quantity setting:", {
          productId,
          sku,
        });
      }

      saveToLocalStorage(state.products);
    },

    clearProduct: (state) => {
      state.products = [];
      saveToLocalStorage(state.products);
    },

    // New action to remove duplicates if they exist
    removeDuplicates: (state) => {
      const seen = new Set();
      const uniqueProducts = [];

      state.products.forEach((product) => {
        const key = getProductKey(product.productId, product.sku);

        if (seen.has(key)) {
          // If duplicate found, add quantity to existing product
          const existing = uniqueProducts.find(
            (p) => getProductKey(p.productId, p.sku) === key,
          );
          if (existing) {
            existing.quantity += product.quantity;
          }
        } else {
          seen.add(key);
          uniqueProducts.push({ ...product, key });
        }
      });

      state.products = uniqueProducts;
      saveToLocalStorage(state.products);
    },

    // Debug action to log current state
    debugProducts: (state) => {
      console.group("Checkout Products Debug");
      console.log("Total products:", state.products.length);
      console.log("Products:", state.products);
      console.log(
        "Product keys:",
        state.products.map((p) => getProductKey(p.productId, p.sku)),
      );

      // Check for duplicates
      const keys = state.products.map((p) => getProductKey(p.productId, p.sku));
      const duplicateKeys = keys.filter(
        (key, index) => keys.indexOf(key) !== index,
      );
      if (duplicateKeys.length > 0) {
        console.warn("Duplicate products found:", duplicateKeys);
      }
      console.groupEnd();
    },
  },
});

export const {
  addProduct,
  removeProduct,
  changeQuantity,
  setQuantity,
  clearProduct,
  setMultiProducts,
  removeDuplicates,
  debugProducts,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
