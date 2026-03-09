import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearCart, selectCartSubtotal } from "../../redux/cartSlice";
import { createOrder } from "../../services/OrderService";

const CheckOut = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const items = useSelector((state) => state.cart.items);
  const subtotal = useSelector(selectCartSubtotal);
  const user = useSelector((state) => state.user?.user);

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    note: "",
  });

  const shipping = useMemo(() => (subtotal > 0 ? 30000 : 0), [subtotal]);
  const total = subtotal + shipping;

  const onPlaceOrder = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Bạn cần đăng nhập trước khi đặt hàng");
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      alert("Giỏ hàng trống");
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        orderItems: items.map((item) => ({
          name: item.name,
          amount: item.qty,
          image: item.image,
          price: item.price,
          product: item.product || item._id,
        })),

        shippingAddress: {
          fullName: form.fullName,
          address: form.address,
          city: "Hà Nội",
          country: "Việt Nam",
          phone: form.phone,
        },

        paymentMethod: paymentMethod,

        itemsPrice: subtotal,
        shippingPrice: shipping,
        taxPrice: 0,
        totalPrice: total,

        user: user._id,
      };

      console.log("ORDER DATA:", orderData);

      const res = await createOrder(orderData);

      if (res?.status === "OK") {
        dispatch(clearCart());
        alert("Đặt hàng thành công!");
        navigate("/");
      } else {
        alert("Đặt hàng thất bại");
      }
    } catch (error) {
      console.error("ORDER ERROR:", error);
      alert("Có lỗi xảy ra khi đặt hàng");
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
                    onChange={(e) =>
                      setForm({ ...form, note: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Phương thức thanh toán</label>

                  <div>
                    <label>
                      <input
                        type="radio"
                        value="COD"
                        checked={paymentMethod === "COD"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      Thanh toán khi nhận hàng (COD)
                    </label>
                  </div>

                  <div>
                    <label>
                      <input
                        type="radio"
                        value="ONLINE"
                        checked={paymentMethod === "ONLINE"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      Thanh toán Online
                    </label>
                  </div>
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

                  {items.map((i, index) => (
                    <tr key={i._id || index}>
                      <td>
                        {i.name} x{i.qty}
                      </td>
                      <td className="text-right">
                        {(i.price * i.qty).toLocaleString()} đ
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

                  <tr>
                    <td><strong>Tổng</strong></td>
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