import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  addToCart,
  removeManyFromCart,
  removeFromCart,
} from "../../redux/cart/cartSlice";
import {
  createOrder,
  createVnpayUrl,
  getVoucherByCode,
  getProductById,
  updateCustomerById,
} from "../../api";

const CheckOut = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const items = useSelector((state) => state.cart.items);
  const user = useSelector((state) => state.user);
  const selectedItemKeys = useMemo(() => {
    const selectedKeys = location?.state?.selectedItemKeys;
    if (Array.isArray(selectedKeys)) return selectedKeys;
    const selectedIds = location?.state?.selectedItemIds;
    return Array.isArray(selectedIds)
      ? selectedIds
      : [];
  }, [location?.state?.selectedItemKeys, location?.state?.selectedItemIds]);
  const selectedIdSet = useMemo(
    () => new Set(selectedItemKeys.map((id) => String(id))),
    [selectedItemKeys],
  );
  const checkoutItems = useMemo(() => {
    if (selectedIdSet.size === 0) return items;
    return items.filter((item) => {
      const lineKey = item.cartKey || item.productId;
      return selectedIdSet.has(String(lineKey));
    });
  }, [items, selectedIdSet]);
  const subtotal = useMemo(
    () =>
      checkoutItems.reduce(
        (sum, i) => sum + Number(i.qty || 0) * Number(i.price || 0),
        0,
      ),
    [checkoutItems],
  );

  const LAST_CHECKOUT_KEY = "last_checkout_v1";

  const safeJsonParse = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const isProbablyObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

  const lastCheckout = safeJsonParse(
    localStorage.getItem(LAST_CHECKOUT_KEY),
  );

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  const [form, setForm] = useState({
    fullName: lastCheckout?.fullName ?? "",
    email: lastCheckout?.email ?? "",
    phone: lastCheckout?.phone ?? "",
    address: lastCheckout?.address ?? "",
    note: lastCheckout?.note ?? "",
  });

  useEffect(() => {
    if (user?.name) setForm((f) => ({ ...f, fullName: user.name }));
    if (user?.email) setForm((f) => ({ ...f, email: user.email }));
    if (user?.phone) setForm((f) => ({ ...f, phone: user.phone || "" }));
    if (user?.address) setForm((f) => ({ ...f, address: Array.isArray(user.address) ? user.address[0] : user.address || "" }));
  }, [user]);

  // Preview voucher discount on the client (BE is still source of truth).
  useEffect(() => {
    const code = voucherCode.trim();
    if (!code) {
      setDiscount(0);
      setVoucherError("");
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setVoucherChecking(true);
        const voucher = await getVoucherByCode(code);
        if (cancelled) return;

        if (!voucher) {
          setDiscount(0);
          setVoucherError("Mã giảm giá không hợp lệ");
          return;
        }

        const now = new Date();
        const start = voucher.startDate ? new Date(voucher.startDate) : null;
        const end = voucher.endDate ? new Date(voucher.endDate) : null;

        const statusOk = voucher.status === "active";
        const timeOk =
          (!start || now >= start) && (!end || now <= end);
        const minOk = subtotal >= (voucher.minOrderValue ?? 0);
        const usageLimit = voucher.usageLimit ?? 0; // 0 = unlimited
        const usedCount = voucher.usedCount ?? 0;
        const usageOk = usageLimit === 0 || usedCount < usageLimit;

        if (!statusOk) {
          setDiscount(0);
          setVoucherError("Mã giảm giá không hoạt động");
          return;
        }
        if (!timeOk) {
          setDiscount(0);
          setVoucherError("Mã giảm giá đã hết hạn");
          return;
        }
        if (!minOk) {
          setDiscount(0);
          setVoucherError(
            `Đơn hàng tối thiểu ${Number(voucher.minOrderValue ?? 0).toLocaleString()} đ`,
          );
          return;
        }
        if (!usageOk) {
          setDiscount(0);
          setVoucherError("Mã giảm giá đã hết lượt");
          return;
        }

        const rawDiscount =
          voucher.discountType === "fixed"
            ? Number(voucher.discountValue ?? 0)
            : (subtotal * Number(voucher.discountValue ?? 0)) / 100;

        const discountAmount = Math.max(
          0,
          Math.min(subtotal, rawDiscount),
        );

        setDiscount(discountAmount);
        setVoucherError("");
      } catch (e) {
        if (cancelled) return;
        setDiscount(0);
        setVoucherError("Không thể kiểm tra mã giảm giá");
      } finally {
        if (!cancelled) setVoucherChecking(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [voucherCode, subtotal]);

  const shipping = useMemo(
    () => (shippingMethod === "fast" ? 30000 : subtotal > 0 ? 0 : 0),
    [shippingMethod, subtotal],
  );
  const total = Math.max(0, subtotal + shipping - discount);

  const onPlaceOrder = async (e) => {
    e.preventDefault();

    const userIdCandidate = user?._id || user?.id;
    const isLoggedIn = !!user?.login;

    const userId = isLoggedIn && isProbablyObjectId(userIdCandidate)
      ? userIdCandidate
      : null;

    const guestId = !isLoggedIn ? String(user?.id || "") : null;

    // BE yêu cầu phải có userId hoặc guestId
    if (!userId && (!guestId || guestId.length < 6)) {
      alert("Không xác định được tài khoản để đặt hàng. Vui lòng đăng nhập lại.");
      return;
    }

    if (checkoutItems.length === 0) {
      alert("Giỏ hàng trống");
      return;
    }

    if (!form.email?.trim()) {
      alert("Vui lòng nhập email");
      return;
    }

    try {
      setLoading(true);

      const products = checkoutItems.map((item) => ({
        productId: item.productId || item._id,
        quantity: item.qty || 1,
        sku: item.sku == null ? null : String(item.sku).trim().toUpperCase(),
      }));

      const orderPayload = {
        ...(userId ? { userId } : {}),
        ...(guestId ? { guestId } : {}),
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        paymentMethod: paymentMethod === "VNPay" ? "vnpay" : "cod",
        shippingMethod: shippingMethod === "fast" ? "fast" : "standard",
        products,
        discount,
        voucherCode: voucherCode.trim() || null,
        shippingFee: shipping,
        totalAmount: total,
      };

      const order = await createOrder(orderPayload);

      // Persist thông tin giao hàng lần gần nhất (dùng cho lần sau)
      const persistCheckoutInfo = () => {
        try {
          localStorage.setItem(
            LAST_CHECKOUT_KEY,
            JSON.stringify({
              fullName: form.fullName,
              email: form.email,
              phone: form.phone,
              address: form.address,
              note: form.note,
              shippingMethod,
              paymentMethod,
              voucherCode: voucherCode.trim() || null,
            }),
          );
        } catch {
          // ignore
        }
      };

      const updateProfileIfLoggedIn = async () => {
        if (!isLoggedIn) return;
        if (!user?.id) return;

        try {
          await updateCustomerById({
            id: user.id,
            name: form.fullName,
            email: form.email,
            phone: form.phone,
            address: form.address,
          });
        } catch (err) {
          // Không chặn đặt hàng nếu update profile thất bại
          console.error("Update customer profile failed:", err);
        }
      };

      if (order?.paymentMethod === "vnpay" && order?._id) {
        const baseUrl = window.location.origin;
        const { url } = await createVnpayUrl(order._id, `${baseUrl}/payment/return`, `${baseUrl}/checkout`);
        if (url) {
          persistCheckoutInfo();
          await updateProfileIfLoggedIn();
          dispatch(removeManyFromCart(checkoutItems.map((i) => i.cartKey || i.productId)));
          window.location.href = url;
          return;
        }
      }

      dispatch(removeManyFromCart(checkoutItems.map((i) => i.cartKey || i.productId)));
      persistCheckoutInfo();
      await updateProfileIfLoggedIn();

      alert("Đặt hàng thành công!");
      navigate("/orders");
    } catch (error) {
      console.error("ORDER ERROR:", error);
      const data = error?.response?.data;
      console.error("ORDER ERROR DATA:", data);
      const msg = data?.message || "Có lỗi xảy ra khi đặt hàng";
      if (
        Array.isArray(data?.availableSkus) &&
        data?.availableSkus.length > 0
      ) {
        const productId = data?.productId;
        const availableSkus = data?.availableSkus || [];

        const normalizeSku = (s) =>
          s == null ? null : String(s).trim().toUpperCase();

        const cartItem = productId
          ? checkoutItems.find(
              (i) =>
                String(i?.productId || i?._id || "") === String(productId),
            )
          : null;

        const wantedSize = cartItem?.size ?? null;
        const skuSet = new Set(availableSkus.map(normalizeSku).filter(Boolean));

        // Nếu cartItem có `size` thì ưu tiên map theo size,
        // còn không thì fallback chọn một SKU hợp lệ bất kỳ để checkout không bị kẹt.
        const attemptAutoFix = async () => {
          if (!productId || !cartItem) return false;

          const sizeKey = wantedSize
            ? String(wantedSize).trim().toUpperCase()
            : null;
          try {
            const res = await getProductById(productId);
            const p = res?.data ?? res;
            const variants = Array.isArray(p?.variants) ? p.variants : [];

            const getVariantSizeValue = (variant) => {
              const attrs = variant?.attributes;
              if (!attrs) return null;
              if (typeof attrs.get === "function") {
                return attrs.get("Size") ?? attrs.get("size") ?? null;
              }
              if (typeof attrs === "object") {
                const foundKey = Object.keys(attrs).find(
                  (k) => String(k).toLowerCase() === "size",
                );
                return foundKey ? attrs[foundKey] : null;
              }
              return null;
            };

            let target = null;

            if (sizeKey) {
              target =
                variants.find(
                  (v) =>
                    skuSet.has(normalizeSku(v?.sku)) &&
                    String(getVariantSizeValue(v) ?? "")
                      .trim()
                      .toUpperCase() === sizeKey,
                ) ?? null;
            }

            if (!target) {
              target = variants.find((v) =>
                skuSet.has(normalizeSku(v?.sku)),
              );
            }

            if (!target) return false;

            const finalSize = cartItem?.size
              ? cartItem.size
              : getVariantSizeValue(target);

            dispatch(removeFromCart(productId));
            dispatch(
              addToCart({
                productId: productId,
                name: cartItem.name,
                image: cartItem.image,
                price: target.price,
                qty: cartItem.qty || 1,
                sku: target.sku,
                size: finalSize ?? null,
              }),
            );
            return true;
          } catch {
            return false;
          }
        };

        try {
          const fixed = await attemptAutoFix();
          if (fixed) {
            alert(
              `${msg}\nMình đã tự cập nhật SKU theo size (${cartItem?.size}). Bấm OK để thử checkout lại.`,
            );
            return;
          }
        } catch {
          // ignore auto-fix errors
        }

        alert(
          `${msg}\n${
            data?.invalidSku ? `SKU đang gửi: ${data.invalidSku}\n` : ""
          }Các SKU hợp lệ: ${availableSkus.join(", ")}`,
        );
        // Nếu không tự fix được, xóa item sai khỏi cart.
        if (productId) dispatch(removeFromCart(productId));
        return;
      }
      if (data?.stack && String(msg).includes("next")) {
        alert(`${msg}\n\n${data.stack}`);
      } else {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="body-content outer-top-xs">
      <div className="container">
        <div className="breadcrumb">
          <div className="breadcrumb-inner">
            <ul className="list-inline list-unstyled">
              <li>
                <Link to="/">Trang chủ</Link>
              </li>
              <li className="active">Thanh toán</li>
            </ul>
          </div>
        </div>

        <div className="row">
          <div className="col-md-8">
            <div className="checkout-box">
              <h2 className="text-3xl font-bold mb-3">Thông tin giao hàng</h2>
              {lastCheckout && (
                <p className="text-gray-500 text-base mb-5">
                  Thông tin đã được lưu từ lần đặt hàng gần nhất.
                </p>
              )}

              <form onSubmit={onPlaceOrder}>
                <div className="form-group">
                  <label className="text-base font-semibold mb-2">Họ và tên</label>
                  <input
                    className="form-control text-base py-2 h-[44px]"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="text-base font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    className="form-control text-base py-2 h-[44px]"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="text-base font-semibold mb-2">Số điện thoại</label>
                  <input
                    className="form-control text-base py-2 h-[44px]"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="text-base font-semibold mb-2">Địa chỉ</label>
                  <input
                    className="form-control text-base py-2 h-[44px]"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="text-base font-semibold mb-2">Ghi chú</label>
                  <textarea
                    className="form-control text-base py-2"
                    rows={4}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="text-lg font-bold mb-2">Phương thức giao hàng</label>
                  <div>
                    <label className="text-base font-medium">
                      <input
                        type="radio"
                        checked={shippingMethod === "standard"}
                        onChange={() => setShippingMethod("standard")}
                      />
                      Thường (miễn phí)
                    </label>
                  </div>
                  <div>
                    <label className="text-base font-medium">
                      <input
                        type="radio"
                        checked={shippingMethod === "fast"}
                        onChange={() => setShippingMethod("fast")}
                      />
                      Nhanh (+30.000đ)
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="text-lg font-bold mb-2">Phương thức thanh toán</label>
                  <div>
                    <label className="text-base font-medium">
                      <input
                        type="radio"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      Thanh toán khi nhận hàng (COD)
                    </label>
                  </div>
                  <div>
                    <label className="text-base font-medium">
                      <input
                        type="radio"
                        value="VNPay"
                        checked={paymentMethod === "VNPay"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      Thanh toán VNPay
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="text-base font-semibold mb-2">Mã giảm giá</label>
                  <input
                    className="form-control text-base py-2 h-[44px]"
                    placeholder="Nhập mã (nếu có)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                  />
                  {voucherChecking && (
                    <div className="text-muted mt-1">Đang kiểm tra...</div>
                  )}
                  {voucherError && (
                    <div className="text-danger mt-1">{voucherError}</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary text-base px-5 py-2.5"
                  disabled={checkoutItems.length === 0 || loading}
                >
                  {loading ? "Đang xử lý..." : "Đặt hàng"}
                </button>

                <Link className="btn btn-default text-base px-5 py-2.5" to="/cart">
                  Quay lại giỏ hàng
                </Link>
              </form>
            </div>
          </div>

          <div className="col-md-4">
            <div className="checkout-summary">
              <h2 className="text-5xl font-black mb-7">Đơn hàng</h2>

              <table className="table text-2xl">
                <tbody>
                  {checkoutItems.map((item, index) => (
                    <tr key={item.productId || index} className="h-[74px]">
                      <td>
                        {item.name} x{item.qty}
                      </td>
                      <td className="text-right font-bold">
                        {((item.price || 0) * (item.qty || 0)).toLocaleString()} đ
                      </td>
                    </tr>
                  ))}

                  <tr className="h-[74px]">
                    <td className="font-semibold">Tạm tính</td>
                    <td className="text-right font-bold">
                      {subtotal.toLocaleString()} đ
                    </td>
                  </tr>

                  <tr className="h-[74px]">
                    <td className="font-semibold">Phí ship</td>
                    <td className="text-right font-bold">
                      {shipping.toLocaleString()} đ
                    </td>
                  </tr>

                  {discount > 0 && (
                    <tr className="h-[74px]">
                      <td className="font-semibold">Giảm giá</td>
                      <td className="text-right font-bold">
                        -{discount.toLocaleString()} đ
                      </td>
                    </tr>
                  )}

                  <tr className="h-[86px]">
                    <td>
                      <strong className="text-4xl">Tổng</strong>
                    </td>
                    <td className="text-right">
                      <strong className="text-4xl text-red-600">{total.toLocaleString()} đ</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckOut;
