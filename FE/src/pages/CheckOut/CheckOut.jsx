import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearCart, selectCartSubtotal } from "../../redux/cart/cartSlice";
import {
  createOrder,
  createVnpayUrl,
} from "../../api";

const CheckOut = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const items = useSelector((state) => state.cart.items);
  const subtotal = useSelector(selectCartSubtotal);
  const user = useSelector((state) => state.user);

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [discount] = useState(0);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    note: "",
  });

  useEffect(() => {
    if (user?.name) setForm((f) => ({ ...f, fullName: user.name }));
    if (user?.email) setForm((f) => ({ ...f, email: user.email }));
    if (user?.phone) setForm((f) => ({ ...f, phone: user.phone || "" }));
    if (user?.address) setForm((f) => ({ ...f, address: Array.isArray(user.address) ? user.address[0] : user.address || "" }));
  }, [user]);

  const shipping = useMemo(
    () => (shippingMethod === "fast" ? 30000 : subtotal > 0 ? 0 : 0),
    [shippingMethod, subtotal],
  );
  const total = Math.max(0, subtotal + shipping - discount);

  const onPlaceOrder = async (e) => {
    e.preventDefault();

    const userId = user?.id || user?._id;
    if (!userId) {
      alert("Bạn cần đăng nhập trước khi đặt hàng");
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      alert("Giỏ hàng trống");
      return;
    }

    if (!form.email?.trim()) {
      alert("Vui lòng nhập email");
      return;
    }

    try {
      setLoading(true);

      const products = items.map((item) => ({
        productId: item.productId || item._id,
        quantity: item.qty || 1,
        sku: item.sku || null,
      }));

      const orderPayload = {
        userId,
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

      if (order?.paymentMethod === "vnpay" && order?._id) {
        const baseUrl = window.location.origin;
        const { url } = await createVnpayUrl(order._id, `${baseUrl}/payment/return`, `${baseUrl}/checkout`);
        if (url) {
          dispatch(clearCart());
          window.location.href = url;
          return;
        }
      }

      dispatch(clearCart());
      alert("Đặt hàng thành công!");
      navigate("/orders");
    } catch (error) {
      console.error("ORDER ERROR:", error);
      const msg = error?.response?.data?.message || "Có lỗi xảy ra khi đặt hàng";
      alert(msg);
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
              <h2>Thông tin giao hàng</h2>

              <form onSubmit={onPlaceOrder}>
                <div className="form-group">
                  <label>Họ và tên</label>
                  <input
                    className="form-control"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Địa chỉ</label>
                  <input
                    className="form-control"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phương thức giao hàng</label>
                  <div>
                    <label>
                      <input
                        type="radio"
                        checked={shippingMethod === "standard"}
                        onChange={() => setShippingMethod("standard")}
                      />
                      Thường (miễn phí)
                    </label>
                  </div>
                  <div>
                    <label>
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
                  <label>Phương thức thanh toán</label>
                  <div>
                    <label>
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
                    <label>
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
                  <label>Mã giảm giá</label>
                  <input
                    className="form-control"
                    placeholder="Nhập mã (nếu có)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={items.length === 0 || loading}
                >
                  {loading ? "Đang xử lý..." : "Đặt hàng"}
                </button>

                <Link className="btn btn-default" to="/cart">
                  Quay lại giỏ hàng
                </Link>
              </form>
            </div>
          </div>

          <div className="col-md-4">
            <div className="checkout-summary">
              <h2>Đơn hàng</h2>

              <table className="table">
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.productId || index}>
                      <td>
                        {item.name} x{item.qty}
                      </td>
                      <td className="text-right">
                        {((item.price || 0) * (item.qty || 0)).toLocaleString()} đ
                      </td>
                    </tr>
                  ))}

                  <tr>
                    <td>Tạm tính</td>
                    <td className="text-right">
                      {subtotal.toLocaleString()} đ
                    </td>
                  </tr>

                  <tr>
                    <td>Phí ship</td>
                    <td className="text-right">
                      {shipping.toLocaleString()} đ
                    </td>
                  </tr>

                  {discount > 0 && (
                    <tr>
                      <td>Giảm giá</td>
                      <td className="text-right">
                        -{discount.toLocaleString()} đ
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td>
                      <strong>Tổng</strong>
                    </td>
                    <td className="text-right">
                      <strong>{total.toLocaleString()} đ</strong>
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
