import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getProductById, getStocks } from "../../api";
import {
  removeFromCart,
  removeManyFromCart,
  setQty,
  updateCartVariant,
} from "../../redux/cart/cartSlice";
import { FaTrashAlt, FaChevronDown, FaArrowRight } from "react-icons/fa";
import notify from "../../utils/notify";

const ShoppingCartPage = () => {
  const allCartItems = useSelector((state) => state.cart.items);
  const cartItems = useMemo(
    () =>
      (allCartItems || []).filter(
        (item) =>
          !String(item?.cartKey || "").includes("::BUY_NOW::"),
      ),
    [allCartItems],
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedItemKeys, setSelectedItemKeys] = useState([]);
  const [variantOptionsByProduct, setVariantOptionsByProduct] = useState({});
  const [stockByItemKey, setStockByItemKey] = useState({});
  const [stockNoticeKey, setStockNoticeKey] = useState("");
  const [variantModal, setVariantModal] = useState({
    open: false, itemKey: null, productId: null, currentSize: "", selectedSize: "",
  });
  const getItemKey = (item) => item.cartKey || item.productId;

  useEffect(() => {
    const keys = cartItems.map((i) => getItemKey(i));
    setSelectedItemKeys((prev) => prev.filter((k) => keys.some((key) => String(key) === String(k))));
  }, [cartItems]);

  useEffect(() => {
    const run = async () => {
      if (cartItems.length === 0) {
        setStockByItemKey({});
        return;
      }
      try {
        const payload = cartItems.map((i) =>
          i?.sku ? { productId: i.productId, sku: i.sku } : { productId: i.productId },
        );
        const res = await getStocks(payload);
        const rows = Array.isArray(res) ? res : [];
        const next = {};
        cartItems.forEach((item, idx) => {
          const row = rows[idx];
          const key = getItemKey(item);
          const max = Number(row?.countInStock ?? row?.stock ?? 0);
          next[key] = Number.isFinite(max) ? Math.max(0, max) : 0;
        });
        setStockByItemKey(next);
      } catch {
        setStockByItemKey({});
      }
    };
    run();
  }, [cartItems]);

  useEffect(() => {
    cartItems.forEach((item) => {
      const key = getItemKey(item);
      const max = stockByItemKey[key];
      if (!Number.isFinite(max) || max <= 0) return;
      const qty = Number(item.qty || 1);
      if (qty > max) dispatch(setQty({ cartKey: key, qty: max }));
    });
  }, [cartItems, stockByItemKey, dispatch]);

  const selectedSubtotal = useMemo(() => {
    const selected = new Set(selectedItemKeys.map((id) => String(id)));
    return cartItems.reduce((sum, item) => {
      if (!selected.has(String(getItemKey(item)))) return sum;
      return sum + Number(item.price || 0) * Number(item.qty || 0);
    }, 0);
  }, [cartItems, selectedItemKeys]);
  const taxAmount = useMemo(() => Math.round(selectedSubtotal * 0.08), [selectedSubtotal]);
  const grandTotal = useMemo(() => selectedSubtotal + taxAmount, [selectedSubtotal, taxAmount]);

  const allSelected = cartItems.length > 0 && selectedItemKeys.length === cartItems.length;
  const selectedCount = selectedItemKeys.length;

  const toggleSelectAll = () => {
    if (allSelected) { setSelectedItemKeys([]); return; }
    setSelectedItemKeys(cartItems.map((i) => getItemKey(i)));
  };

  const toggleSelectItem = (itemKey) => {
    setSelectedItemKeys((prev) => {
      const exists = prev.some((id) => String(id) === String(itemKey));
      if (exists) return prev.filter((id) => String(id) !== String(itemKey));
      return [...prev, itemKey];
    });
  };

  const goCheckoutWithSelected = () => {
    if (selectedItemKeys.length === 0) { notify.warning("Vui long chon it nhat 1 san pham de thanh toan."); return; }
    navigate("/checkout", { state: { selectedItemKeys } });
  };

  const loadVariantOptions = async (productId) => {
    if (!productId || variantOptionsByProduct[productId]) return;
    try {
      const data = await getProductById(productId);
      const product = data?.data ?? data;
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const normalized = variants.map((v) => {
        const attrs = v?.attributes;
        let size = null;
        if (attrs && typeof attrs.get === "function") { size = attrs.get("Size") ?? attrs.get("size") ?? null; }
        else if (attrs && typeof attrs === "object") {
          const found = Object.keys(attrs).find((k) => String(k).toLowerCase() === "size");
          size = found ? attrs[found] : null;
        }
        const label = size != null ? String(size) : String(v?.sku || "");
          return {
            size: label,
            sku: v?.sku ? String(v.sku).trim().toUpperCase() : null,
            stock: Number(v?.stock ?? 0),
            price: Number(v?.effectivePrice ?? v?.price ?? 0),
            originalPrice: Number(v?.originalPrice ?? v?.price ?? 0),
          };
      }).filter((v) => v.size);
      setVariantOptionsByProduct((prev) => ({ ...prev, [productId]: normalized }));
    } catch { setVariantOptionsByProduct((prev) => ({ ...prev, [productId]: [] })); }
  };

  const openVariantModal = async (item) => {
    const itemKey = getItemKey(item);
    const productId = item.productId;
    await loadVariantOptions(productId);
    setVariantModal({ open: true, itemKey, productId, currentSize: item.size || "", selectedSize: item.size || "" });
  };

  const applyVariantChange = () => {
    if (!variantModal.itemKey) return;
    const options = variantOptionsByProduct[variantModal.productId] || [];
    const selectedOption = options.find((o) => String(o.size) === String(variantModal.selectedSize)) || null;
    dispatch(updateCartVariant({
      cartKey: variantModal.itemKey,
      sku: selectedOption?.sku || null,
      size: variantModal.selectedSize,
      price: selectedOption?.price,
      originalPrice: selectedOption?.originalPrice,
    }));
    setVariantModal({ open: false, itemKey: null, productId: null, currentSize: "", selectedSize: "" });
  };

  const isVariantAlreadyInCart = (productId, itemKey, sizeValue) => {
    return cartItems.some((it) => {
      const key = getItemKey(it);
      if (String(key) === String(itemKey)) return false;
      if (String(it.productId) !== String(productId)) return false;
      return String(it.size || "") === String(sizeValue || "");
    });
  };

  const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;
  const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='28' font-family='Plus Jakarta Sans'>No Image</text></svg>";

  const getImageUrl = (img) => {
    if (!img || typeof img !== "string") return PLACEHOLDER_IMG;
    if (img.startsWith("http")) return img;
    return `http://localhost:3002/uploads/${img.startsWith("/") ? img.slice(1) : img}`;
  };

  return (
    <div className="min-h-screen bg-[#edf1f5] font-body pt-10 pb-20 text-neutral-900">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 border-b border-neutral-300 pb-4">
          <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold mb-2">Nhật ký hệ thống: thanh toán người dùng</p>
          <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-black md:text-5xl lg:text-[2.75rem]">
            GIỎ HÀNG
          </h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl text-slate-400">🛒</span>
            </div>
            <h3 className="text-2xl font-black text-neutral-800 mb-2 uppercase tracking-wide">Giỏ hàng trống</h3>
            <p className="text-neutral-500 max-w-md mb-8">Bạn chưa thêm sản phẩm nào vào giỏ hàng. Hãy quay lại cửa hàng để tiếp tục mua sắm nhé.</p>
            <Link to="/product" className="bg-[#101820] text-white px-8 py-4 rounded-full font-bold hover:bg-[#1c2b36] transition-colors shadow-lg">Tiếp tục mua sắm</Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* CART ITEMS LIST */}
            <div className="w-full lg:w-[65%] xl:w-[70%]">
              <div className="bg-[#f4f7fa] rounded-2xl shadow-sm border border-neutral-200 p-5 md:p-6">
                {/* LIST HEADER */}
                <div className="flex items-center justify-between pb-5 border-b border-neutral-200 mb-5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="peer appearance-none w-6 h-6 border-2 border-slate-300 rounded-lg checked:border-primary checked:bg-primary transition-colors cursor-pointer"
                      />
                      <svg className="absolute w-4 h-4 text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="font-bold text-neutral-700 group-hover:text-primary transition-colors uppercase tracking-wide text-sm">Chọn tất cả ({cartItems.length})</span>
                  </label>
                  {selectedCount > 0 && (
                    <button onClick={() => dispatch(removeManyFromCart(selectedItemKeys))} className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline transition-all uppercase tracking-wide">Xóa đã chọn</button>
                  )}
                </div>

                {/* ITEMS */}
                <div className="space-y-6">
                  {cartItems.map((item) => {
                    const itemKey = getItemKey(item);
                    const unit = Number(item.price || 0);
                    const originalUnit = Number(item.originalPrice ?? unit);
                    const qty = Number(item.qty || 1);
                    const maxStock = Number(stockByItemKey[itemKey]);
                    const hasStockData = Number.isFinite(maxStock);
                    const safeMaxStock = hasStockData ? Math.max(0, maxStock) : null;
                    const canIncrease = hasStockData ? qty < safeMaxStock : true;
                    const isSelected = selectedItemKeys.some((id) => String(id) === String(itemKey));

                    return (
                      <div key={itemKey} className={`flex flex-col sm:flex-row gap-6 p-4 rounded-xl border transition-all ${isSelected ? "border-cyan-500/50 bg-cyan-50/40" : "border-neutral-200 bg-white hover:border-neutral-300"}`}>

                        {/* LEFT: Checkbox + Image */}
                        <div className="flex gap-4 items-center sm:items-start shrink-0">
                          <div className="relative flex items-center justify-center mt-2 sm:mt-8">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(itemKey)}
                              className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-[6px] checked:border-primary checked:bg-primary transition-colors cursor-pointer"
                            />
                            <svg className="absolute w-3.5 h-3.5 text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <Link to={`/product/${item.productId}`} className="w-24 h-24 sm:w-32 sm:h-32 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 shrink-0 group">
                            <img src={getImageUrl(item.image)} alt={item.name} onError={(e) => { e.target.src = PLACEHOLDER_IMG; }} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </Link>
                        </div>

                        {/* RIGHT: Details & Actions */}
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <div>
                              <Link to={`/product/${item.productId}`} className="font-display font-bold text-lg text-slate-800 hover:text-primary transition-colors line-clamp-2 leading-tight mb-1">{item.name}</Link>
                              <button onClick={() => openVariantModal(item)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 hover:bg-neutral-200 transition-colors uppercase tracking-wide">
                                Size: {item.size || "Mặc định"} <FaChevronDown size={10} />
                              </button>
                            </div>
                            <div className="text-right">
                              {originalUnit > unit && (
                                <p className="text-xs font-semibold text-slate-400 line-through">
                                  {formatMoney(originalUnit)}
                                </p>
                              )}
                              <p className="font-black text-lg text-[#0a6f86]">{formatMoney(unit)}</p>
                              {unit !== unit * qty && <p className="text-xs font-semibold text-slate-400 mt-0.5">Tổng: {formatMoney(unit * qty)}</p>}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center h-10 w-28 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <button onClick={() => dispatch(setQty({ cartKey: itemKey, qty: qty - 1 }))} disabled={qty <= 1} className="w-9 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 font-medium">-</button>
                                <div className="flex-1 h-full border-x border-slate-100 flex items-center justify-center font-bold text-sm text-slate-900 bg-slate-50">{qty}</div>
                                <button onClick={() => { if (canIncrease) { dispatch(setQty({ cartKey: itemKey, qty: qty + 1 })); } else { setStockNoticeKey(String(itemKey)); setTimeout(() => setStockNoticeKey(""), 2500); if (hasStockData) { notify.warning(safeMaxStock === 0 ? "Sản phẩm đã hết hàng." : `Đã đạt số lượng tối đa trong kho (${safeMaxStock}).`); } else { notify.warning("Không thể tăng số lượng."); } } }} className="w-9 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium">+</button>
                              </div>
                              {stockNoticeKey === String(itemKey) && <span className="text-xs font-bold text-red-500 animate-pulse">{safeMaxStock === 0 ? "Hết hàng" : `Tối đa ${safeMaxStock}`}</span>}
                            </div>

                            <div className="flex items-center gap-4">
                              <button onClick={() => dispatch(removeFromCart({ cartKey: itemKey }))} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors" title="Xóa sản phẩm">
                                <FaTrashAlt size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ORDER SUMMARY (RIGHT SIDEBAR) */}
            <div className="w-full lg:w-[35%] xl:w-[30%] lg:sticky lg:top-28">
              <div className="bg-[#f8fafc] rounded-2xl shadow-sm border border-neutral-200 p-6 md:p-7">
                <h2 className="text-2xl font-display font-bold text-[#101820] mb-6 uppercase tracking-wide">Tóm tắt đơn hàng</h2>

                <div className="space-y-4 mb-6 pb-6 border-b border-neutral-200 text-neutral-600 font-medium text-sm md:text-base">
                  <div className="flex justify-between items-center">
                    <span className="uppercase tracking-wide text-xs">Tạm tính ({selectedCount})</span>
                    <span className="font-bold text-neutral-800">{formatMoney(selectedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-500">
                    <span className="uppercase tracking-wide text-xs">Vận chuyển</span>
                    <span className="font-semibold text-emerald-600">Miễn phí</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-500">
                    <span className="uppercase tracking-wide text-xs">Thuế hệ thống (8%)</span>
                    <span className="font-semibold text-neutral-800">{formatMoney(taxAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <span className="font-bold text-neutral-700 uppercase tracking-wide">Tổng thanh toán</span>
                  <div className="text-right">
                    <span className="block text-3xl font-black text-[#101820]">{formatMoney(grandTotal)}</span>
                    <span className="text-[11px] text-neutral-500 mt-1 block uppercase tracking-wide">Đơn vị: VNĐ</span>
                  </div>
                </div>

                <button
                  onClick={goCheckoutWithSelected}
                  disabled={selectedCount === 0}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-[#0c98b8] to-[#0580a0] text-white rounded-lg font-bold text-sm uppercase tracking-[0.14em] hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  thanh toán <FaArrowRight size={12} />
                </button>

                <div className="mt-4 text-[11px] text-neutral-500 uppercase tracking-wide text-center">
                  Giao dịch mã hóa • Bảo mật an toàn
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* VARIANT MODAL */}
      {variantModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-display font-black text-slate-800 mb-6 text-center">Chọn Phân Loại Kích Cỡ</h3>

            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {(variantOptionsByProduct[variantModal.productId] || []).map((opt) => {
                const active = String(variantModal.selectedSize) === String(opt.size);
                const outOfStock = Number(opt.stock || 0) <= 0;
                const duplicated = isVariantAlreadyInCart(variantModal.productId, variantModal.itemKey, opt.size);
                const disabled = outOfStock || duplicated;

                return (
                  <button
                    key={`${opt.size}-${opt.sku || "na"}`}
                    disabled={disabled}
                    onClick={() => setVariantModal((prev) => ({ ...prev, selectedSize: String(opt.size) }))}
                    title={duplicated ? "Đã có trong giỏ" : outOfStock ? "Hết hàng" : ""}
                    className={`min-w-[4rem] h-12 px-4 rounded-xl font-bold transition-all text-sm border
                      ${active ? "bg-primary border-primary text-white shadow-md shadow-primary/30" :
                        disabled ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" :
                          "bg-white border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900"
                      }`}
                  >
                    {opt.size}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setVariantModal({ open: false, itemKey: null, productId: null, currentSize: "", selectedSize: "" })}
                className="flex-1 h-12 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={applyVariantChange}
                disabled={!variantModal.selectedSize}
                className="flex-[1.5] h-12 rounded-xl font-bold text-white bg-slate-900 hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                Xác Nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingCartPage;
