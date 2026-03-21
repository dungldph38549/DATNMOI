import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getProductById } from "../../api";
import {
  removeFromCart,
  removeManyFromCart,
  setQty,
  updateCartVariant,
} from "../../redux/cart/cartSlice";

const ShoppingCartPage = () => {
  const cartItems = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedItemKeys, setSelectedItemKeys] = useState([]);
  const [variantOptionsByProduct, setVariantOptionsByProduct] = useState({});
  const [variantModal, setVariantModal] = useState({
    open: false,
    itemKey: null,
    productId: null,
    currentSize: "",
    selectedSize: "",
  });
  const getItemKey = (item) => item.cartKey || item.productId;

  useEffect(() => {
    const keys = cartItems.map((i) => getItemKey(i));
    setSelectedItemKeys((prev) =>
      prev.filter((k) => keys.some((key) => String(key) === String(k))),
    );
  }, [cartItems]);

  const selectedSubtotal = useMemo(() => {
    const selected = new Set(selectedItemKeys.map((id) => String(id)));
    return cartItems.reduce((sum, item) => {
      if (!selected.has(String(getItemKey(item)))) return sum;
      return sum + Number(item.price || 0) * Number(item.qty || 0);
    }, 0);
  }, [cartItems, selectedItemKeys]);

  const allSelected =
    cartItems.length > 0 && selectedItemKeys.length === cartItems.length;
  const selectedCount = selectedItemKeys.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItemKeys([]);
      return;
    }
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
    if (selectedItemKeys.length === 0) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
      return;
    }
    navigate("/checkout", { state: { selectedItemKeys } });
  };

  const removeSelectedItems = () => {
    if (selectedItemKeys.length === 0) {
      alert("Vui lòng chọn sản phẩm cần xóa.");
      return;
    }
    dispatch(removeManyFromCart(selectedItemKeys));
  };

  const loadVariantOptions = async (productId) => {
    if (!productId || variantOptionsByProduct[productId]) return;
    try {
      const data = await getProductById(productId);
      const product = data?.data ?? data;
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const normalized = variants
        .map((v) => {
          const attrs = v?.attributes;
          let size = null;
          if (attrs && typeof attrs.get === "function") {
            size = attrs.get("Size") ?? attrs.get("size") ?? null;
          } else if (attrs && typeof attrs === "object") {
            const found = Object.keys(attrs).find(
              (k) => String(k).toLowerCase() === "size",
            );
            size = found ? attrs[found] : null;
          }
          const label = size != null ? String(size) : String(v?.sku || "");
          return {
            size: label,
            sku: v?.sku ? String(v.sku).trim().toUpperCase() : null,
            stock: Number(v?.stock ?? 0),
          };
        })
        .filter((v) => v.size);
      setVariantOptionsByProduct((prev) => ({ ...prev, [productId]: normalized }));
    } catch {
      setVariantOptionsByProduct((prev) => ({ ...prev, [productId]: [] }));
    }
  };

  const openVariantModal = async (item) => {
    const itemKey = getItemKey(item);
    const productId = item.productId;
    await loadVariantOptions(productId);
    setVariantModal({
      open: true,
      itemKey,
      productId,
      currentSize: item.size || "",
      selectedSize: item.size || "",
    });
  };

  const applyVariantChange = () => {
    if (!variantModal.itemKey) return;
    const options = variantOptionsByProduct[variantModal.productId] || [];
    const selectedOption =
      options.find((o) => String(o.size) === String(variantModal.selectedSize)) ||
      null;
    dispatch(
      updateCartVariant({
        cartKey: variantModal.itemKey,
        sku: selectedOption?.sku || null,
        size: variantModal.selectedSize,
      }),
    );
    setVariantModal({
      open: false,
      itemKey: null,
      productId: null,
      currentSize: "",
      selectedSize: "",
    });
  };

  const isVariantAlreadyInCart = (productId, itemKey, sizeValue) => {
    return cartItems.some((it) => {
      const key = getItemKey(it);
      if (String(key) === String(itemKey)) return false;
      if (String(it.productId) !== String(productId)) return false;
      return String(it.size || "") === String(sizeValue || "");
    });
  };

  const formatMoney = (v) => `${Number(v || 0).toLocaleString()}đ`;

  const PLACEHOLDER_IMG =
    "https://via.placeholder.com/80/f0f0f0/999?text=No+Image";
  const getImageUrl = (img) => {
    if (!img || typeof img !== "string") return PLACEHOLDER_IMG;
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    if (img.startsWith("/uploads/")) return `http://localhost:3002${img}`;
    if (img.startsWith("uploads/")) return `http://localhost:3002/${img}`;
    return `http://localhost:3002/uploads/${img}`;
  };
  const onImgError = (e) => {
    e.target.onerror = null;
    e.target.src = PLACEHOLDER_IMG;
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[32px] font-bold text-[#ee4d2d]">Giỏ hàng</h1>
        <Link
          to="/product"
          className="text-[16px] font-semibold text-gray-700 hover:text-[#ee4d2d]"
        >
          + Tiếp tục mua sắm
        </Link>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-16 border bg-white">
          <p className="text-gray-600">Giỏ hàng của bạn đang trống.</p>
          <Link
            to="/product"
            className="mt-6 inline-block px-6 py-3 bg-[#ee4d2d] text-white hover:opacity-90 transition font-semibold"
          >
            Mua ngay
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white border px-5 py-4 mb-3 grid grid-cols-12 text-[17px] text-gray-700">
            <div className="col-span-6 grid grid-cols-[28px_96px_minmax(0,1fr)_180px] items-center gap-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 justify-self-center"
              />
              <span />
              <span className="font-semibold text-[19px] text-gray-700">Sản phẩm</span>
              <span className="font-semibold text-[19px] text-gray-700">Phân Loại Hàng</span>
            </div>
            <div className="col-span-2 text-center font-semibold text-[19px] text-gray-700">Đơn Giá</div>
            <div className="col-span-2 text-center font-semibold text-[19px] text-gray-700">Số Lượng</div>
            <div className="col-span-1 text-center font-semibold text-[19px] text-gray-700">Số Tiền</div>
            <div className="col-span-1 text-center font-semibold text-[19px] text-gray-700">Thao Tác</div>
          </div>

          <div className="bg-white border mb-4">
            {cartItems.map((item) => {
              const itemKey = getItemKey(item);
              const unit = Number(item.price || 0);
              const qty = Number(item.qty || 1);
              const lineTotal = unit * qty;
              const isSelected = selectedItemKeys.some(
                (id) => String(id) === String(itemKey),
              );

              return (
                <div
                  key={itemKey}
                  className="px-5 py-5 border-b last:border-b-0 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-2 items-center"
                >
                  <div className="md:col-span-6 grid grid-cols-[28px_96px_minmax(0,1fr)_180px] items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(itemKey)}
                      className="justify-self-center w-5 h-5"
                    />
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="w-24 h-24 object-contain border bg-gray-50"
                      onError={onImgError}
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[17px] md:text-[19px] leading-6 line-clamp-2 text-gray-800">
                        {item.name}
                      </h3>
                    </div>
                    <div className="justify-self-start">
                      <button
                        type="button"
                        onClick={() => openVariantModal(item)}
                        className="inline-flex items-center gap-2 text-[15px] text-gray-600 hover:underline"
                      >
                        <span>Phân Loại Hàng:</span>
                        <span aria-hidden="true" className="text-[11px]">▼</span>
                      </button>
                      <div className="text-[15px] text-gray-500 leading-5">
                        {item.size || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 md:text-center text-gray-700 font-medium text-[19px]">
                    {formatMoney(unit)}
                  </div>

                  <div className="md:col-span-2 md:justify-self-center">
                    <div className="inline-flex items-center border">
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(
                            setQty({
                              cartKey: itemKey,
                              qty: qty - 1,
                            }),
                          )
                        }
                        disabled={qty <= 1}
                        className="w-9 h-9 border-r disabled:opacity-40 text-base"
                        aria-label="Giảm số lượng"
                      >
                        -
                      </button>
                      <div className="w-10 h-9 flex items-center justify-center text-base">
                        {qty}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(
                            setQty({
                              cartKey: itemKey,
                              qty: qty + 1,
                            }),
                          )
                        }
                        className="w-9 h-9 border-l text-base"
                        aria-label="Tăng số lượng"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-1 md:text-center text-gray-700 font-medium text-[19px]">
                    {formatMoney(lineTotal)}
                  </div>

                  <div className="md:col-span-1 md:text-center space-y-1">
                    <button
                      type="button"
                      onClick={() => dispatch(removeFromCart({ cartKey: itemKey }))}
                      className="text-[17px] text-gray-700 hover:text-[#ee4d2d]"
                    >
                      Xóa
                    </button>
                    <div>
                      <Link
                        to={`/product?keyword=${encodeURIComponent(item.name || "")}`}
                        className="text-[15px] text-[#ee4d2d] hover:underline"
                      >
                        Tìm sản phẩm tương tự
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 bg-white border px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4">
              <div className="flex items-center justify-center md:justify-start gap-8 text-[17px]">
                <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-6 h-6 accent-[#ee4d2d] cursor-pointer hover:scale-105 transition"
                />
                Chọn Tất Cả ({cartItems.length})
              </label>
              <button
                type="button"
                onClick={removeSelectedItems}
                disabled={selectedCount === 0}
                className="text-[19px] text-gray-700 hover:text-[#ee4d2d] disabled:opacity-40 transition"
              >
                Xóa
              </button>
              </div>

              <div className="flex items-center justify-center md:justify-end gap-6">
                <p className="text-[18px]">
                Tổng cộng ({selectedCount} sản phẩm):
                <span className="ml-2 text-[30px] font-bold text-[#ee4d2d]">
                  {formatMoney(selectedSubtotal)}
                </span>
              </p>
              <button
                type="button"
                onClick={goCheckoutWithSelected}
                disabled={selectedCount === 0}
                className="px-10 h-14 bg-[#ee4d2d] text-white text-[20px] font-semibold disabled:opacity-40"
              >
                Mua Hàng
              </button>
              </div>
            </div>
          </div>

          {variantModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="w-full max-w-lg bg-white rounded shadow-lg">
                <div className="px-6 pt-5 pb-3 border-b">
                  <p className="text-base font-semibold">Phân loại hàng</p>
                </div>
                <div className="px-6 py-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    {(variantOptionsByProduct[variantModal.productId] || []).map(
                      (opt) => {
                        const active =
                          String(variantModal.selectedSize) === String(opt.size);
                        const outOfStock = Number(opt.stock || 0) <= 0;
                        const duplicated = isVariantAlreadyInCart(
                          variantModal.productId,
                          variantModal.itemKey,
                          opt.size,
                        );
                        const disabled = outOfStock || duplicated;
                        return (
                          <button
                            key={`${opt.size}-${opt.sku || "na"}`}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              setVariantModal((prev) => ({
                                ...prev,
                                selectedSize: String(opt.size),
                              }))
                            }
                            className={`px-4 h-10 border text-sm ${
                              active
                                ? "border-[#ee4d2d] text-[#ee4d2d]"
                                : "border-gray-300 text-gray-700"
                            } ${
                              disabled ? "opacity-40 cursor-not-allowed" : "hover:border-[#ee4d2d]"
                            }`}
                            title={
                              duplicated
                                ? "Biến thể này đã có trong giỏ hàng"
                                : outOfStock
                                  ? "Biến thể này đã hết hàng"
                                  : ""
                            }
                          >
                            {opt.size}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
                <div className="px-6 pb-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setVariantModal({
                        open: false,
                        itemKey: null,
                        productId: null,
                        currentSize: "",
                        selectedSize: "",
                      })
                    }
                    className="px-6 h-10 border text-gray-700"
                  >
                    Trở lại
                  </button>
                  <button
                    type="button"
                    onClick={applyVariantChange}
                    disabled={!variantModal.selectedSize}
                    className="px-6 h-10 bg-[#ee4d2d] text-white disabled:opacity-40"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShoppingCartPage;
