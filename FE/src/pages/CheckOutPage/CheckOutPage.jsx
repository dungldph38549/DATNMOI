import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createOrder, createVnpayUrl, updateCustomerById } from "../../api";
import { clearCart } from "../../redux/cart/cartSlice";

function CheckOutPage() {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cartItems = useSelector((state) => state.cart.items || []);
  const user = useSelector((state) => state.user);

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [shippingMethod] = useState("fast"); // map về backend: fast/standard

  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const shippingFee = 30000;

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 0);
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const totalPrice = subtotal + shippingFee;

  const handleOrder = async () => {
    try {
      if (!cartItems.length) {
        alert("Giỏ hàng trống");
        return;
      }

      if (!name.trim()) {
        alert("Vui lòng nhập họ tên");
        return;
      }
      if (!email.trim()) {
        alert("Vui lòng nhập email");
        return;
      }
      if (!phone.trim()) {
        alert("Vui lòng nhập số điện thoại");
        return;
      }
      if (!address.trim()) {
        alert("Vui lòng nhập địa chỉ");
        return;
      }

      const isLoggedIn = !!user?.login;
      const userIdCandidate = user?._id || user?.id;
      const userId = isLoggedIn && userIdCandidate ? userIdCandidate : null;
      const guestId = !isLoggedIn ? String(user?.id || "") : null;

      const products = cartItems.map((item) => ({
        productId: item.productId || item._id,
        quantity: item.qty || 1,
        sku: item.sku == null ? null : String(item.sku).trim().toUpperCase(),
      }));

      const baseUrl = window.location.origin;
      const orderPayload = {
        ...(userId ? { userId } : {}),
        ...(guestId ? { guestId } : {}),
        fullName: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note || undefined,
        paymentMethod: paymentMethod === "ONLINE" ? "vnpay" : "cod",
        shippingMethod: shippingMethod === "fast" ? "fast" : "standard",
        products,
        voucherCode: null,
        discount: 0,
        shippingFee,
        totalAmount: totalPrice,
        ...(paymentMethod === "ONLINE"
          ? {
              vnpReturnUrl: `${baseUrl}/payment/return`,
              vnpCancelUrl: `${baseUrl}/checkoutpage`,
            }
          : {}),
      };

      const order = await createOrder(orderPayload);

      if (order?.paymentMethod === "vnpay" && order?._id) {
        let payUrl = order.vnpayPaymentUrl;
        if (!payUrl) {
          const { url } = await createVnpayUrl(
            order._id,
            `${baseUrl}/payment/return`,
            `${baseUrl}/checkoutpage`,
          );
          payUrl = url;
        }
        if (payUrl) {
          dispatch(clearCart());
          window.location.href = payUrl;
          return;
        }
        if (order.vnpayBuildError) {
          alert(order.vnpayBuildError);
          return;
        }
        alert(
          "Không nhận được link thanh toán VNPay. Kiểm tra backend và .env (BE_URL, VNP_TMN_CODE).",
        );
        return;
      }

      // Best-effort update profile
      if (isLoggedIn && user?.id) {
        try {
          await updateCustomerById({
            id: user.id,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
          });
        } catch {
          // ignore
        }
      }

      dispatch(clearCart());
      alert("Đặt hàng thành công!");
      navigate("/orders");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra khi đặt hàng";
      alert(msg);
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>

      <h2>Thông tin giao hàng</h2>

      <input
        placeholder="Họ tên"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Địa chỉ"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Số điện thoại"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <br /><br />

      <textarea
        placeholder="Ghi chú (tuỳ chọn)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        style={{ width: "100%", maxWidth: 520 }}
      />

      <br /><br />

      <h3>Phương thức thanh toán</h3>

      <label>
        <input
          type="radio"
          value="COD"
          checked={paymentMethod === "COD"}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />
        Thanh toán khi nhận hàng (COD)
      </label>

      <br />

      <label>
        <input
          type="radio"
          value="ONLINE"
          checked={paymentMethod === "ONLINE"}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />
        Thanh toán Online (VNPay)
      </label>

      <br /><br />

      <h3>Tổng tiền: {totalPrice} VNĐ</h3>

      <button onClick={handleOrder}>
        Đặt hàng
      </button>

    </div>
  );
}

export default CheckOutPage;