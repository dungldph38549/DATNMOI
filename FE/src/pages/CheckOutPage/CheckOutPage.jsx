import { useState } from "react";
import { useSelector } from "react-redux";
import { createOrder } from "../../services/OrderService";

function CheckOutPage() {

  const cartItems = useSelector((state) => state.cart.cartItems);
  const user = useSelector((state) => state.user?.user);

  const [paymentMethod, setPaymentMethod] = useState("COD");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.amount,
    0
  );

  const handleOrder = async () => {
    try {
      const order = {
        orderItems: cartItems,

        shippingAddress: {
          fullName: name,
          address: address,
          city: city,
          country: "Viet Nam",
          phone: phone,
        },

        paymentMethod: paymentMethod,

        itemsPrice: totalPrice,
        shippingPrice: 30000,
        taxPrice: 0,
        totalPrice: totalPrice + 30000,

        user: user?._id,
      };

      console.log(order);

      const res = await createOrder(order);

      if (res?.status === "OK") {
        alert("Đặt hàng thành công");
      }

    } catch (error) {
      console.log(error);
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
        placeholder="Địa chỉ"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Thành phố"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Số điện thoại"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
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
        Thanh toán Online
      </label>

      <br /><br />

      <h3>Tổng tiền: {totalPrice + 30000} VNĐ</h3>

      <button onClick={handleOrder}>
        Đặt hàng
      </button>

    </div>
  );
}

export default CheckOutPage;