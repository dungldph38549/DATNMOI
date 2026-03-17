import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { removeFromCart } from "../../redux/cartSlice";

const ShoppingCartPage = () => {
  const cartItems = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();

  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const PLACEHOLDER_IMG =
    "https://via.placeholder.com/80/f0f0f0/999?text=No+Image";
  const getImageUrl = (img) => {
    if (!img || typeof img !== "string") return PLACEHOLDER_IMG;
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    return `http://localhost:3001/uploads/${img}`;
  };
  const onImgError = (e) => {
    e.target.onerror = null;
    e.target.src = PLACEHOLDER_IMG;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Giỏ hàng</h1>

      {cartItems.length === 0 && <p>Chưa có sản phẩm</p>}

      {cartItems.map((item) => (
        <div key={item.productId} className="flex items-center border-b py-4">
          <img
            src={getImageUrl(item.image)}
            alt={item.name}
            className="w-20 h-20 object-contain"
            onError={onImgError}
          />

          <div className="flex-1 ml-4">
            <h3>{item.name}</h3>
            <p className="text-red-500">${item.price}</p>
          </div>

          <button
            onClick={() => dispatch(removeFromCart(item.productId))}
            className="text-red-500"
          >
            Xóa
          </button>
        </div>
      ))}

      <h2 className="text-xl font-bold mt-6">Tổng: ${total}</h2>
    </div>
  );
};

export default ShoppingCartPage;
