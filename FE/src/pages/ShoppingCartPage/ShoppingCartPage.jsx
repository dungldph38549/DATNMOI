import React from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  removeFromCart,
  setQty,
  selectCartSubtotal,
} from "../../redux/cart/cartSlice";

const ShoppingCartPage = () => {
  const cartItems = useSelector((state) => state.cart.items);
  const subtotal = useSelector(selectCartSubtotal);
  const dispatch = useDispatch();

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
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Giỏ hàng</h1>
          <p className="text-gray-500 mt-1">
            {cartItems.length > 0
              ? `${cartItems.length} sản phẩm trong giỏ`
              : "Chưa có sản phẩm"}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/product"
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition font-semibold"
          >
            Tiếp tục mua sắm
          </Link>
          {cartItems.length > 0 && (
            <Link
              to="/checkout"
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-red-600 transition font-semibold"
            >
              Thanh toán
            </Link>
          )}
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-white">
          <p className="text-gray-600">Giỏ hàng của bạn đang trống.</p>
          <Link
            to="/product"
            className="mt-6 inline-block px-6 py-3 bg-black text-white rounded-xl hover:bg-red-600 transition font-semibold"
          >
            Mua ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const unit = Number(item.price || 0);
              const qty = Number(item.qty || 1);
              const lineTotal = unit * qty;

              return (
                <div
                  key={item.productId}
                  className="border rounded-2xl bg-white p-4"
                >
                  <div className="flex gap-4">
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="w-24 h-24 object-contain rounded-lg bg-gray-50"
                      onError={onImgError}
                    />

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-1">
                        {item.name}
                      </h3>

                      <div className="text-sm text-gray-500 mt-1 flex gap-2 flex-wrap">
                        {item.size && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded">
                            {`Size: ${item.size}`}
                          </span>
                        )}
                        {!item.size && item.sku && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded">
                            {`SKU: ${item.sku}`}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-4">
                        <div className="text-red-500 font-bold">
                          {formatMoney(unit)}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              dispatch(
                                setQty({
                                  productId: item.productId,
                                  qty: qty - 1,
                                }),
                              )
                            }
                            disabled={qty <= 1}
                            className="w-9 h-9 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold"
                            aria-label="Giảm số lượng"
                          >
                            -
                          </button>

                          <div className="w-10 text-center font-semibold">
                            {qty}
                          </div>

                          <button
                            onClick={() =>
                              dispatch(
                                setQty({
                                  productId: item.productId,
                                  qty: qty + 1,
                                }),
                              )
                            }
                            className="w-9 h-9 border rounded-lg hover:bg-gray-50 transition font-bold"
                            aria-label="Tăng số lượng"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-gray-600 text-sm">
                          Thành tiền
                        </div>
                        <div className="font-bold">{formatMoney(lineTotal)}</div>
                      </div>

                      <div className="mt-3">
                        <button
                          onClick={() => dispatch(removeFromCart(item.productId))}
                          className="text-red-600 hover:text-red-700 font-semibold transition"
                        >
                          Xóa khỏi giỏ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="border rounded-2xl bg-white p-5 sticky top-6">
              <h2 className="text-xl font-bold mb-4">Tóm tắt</h2>

              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Tạm tính</span>
                <span className="font-bold">{formatMoney(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Phí ship</span>
                <span className="font-bold">0đ</span>
              </div>

              <div className="flex items-center justify-between mb-5 pt-4 border-t">
                <span className="text-gray-600">Tổng</span>
                <span className="text-lg font-bold">
                  {formatMoney(subtotal)}
                </span>
              </div>

              <Link
                to="/checkout"
                className="block text-center px-4 py-3 bg-black text-white rounded-xl hover:bg-red-600 transition font-semibold"
              >
                Đi tới thanh toán
              </Link>

              <p className="text-xs text-gray-500 mt-3">
                Lưu ý: tồn kho theo size được kiểm tra tại trang chi tiết sản
                phẩm.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingCartPage;
