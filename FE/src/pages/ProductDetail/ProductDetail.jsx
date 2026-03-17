import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";
import { getProductById } from "../../api";

const ProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        setProduct(data?.data ?? data);
      } catch (err) {
        console.error(err);
        setProduct(null);
      }
    };
    fetchProduct();
  }, [id]);

  if (!product) return <p className="text-center mt-10">Loading...</p>;

  const PLACEHOLDER_IMG =
    "https://via.placeholder.com/400x400/f0f0f0/999?text=No+Image";
  const imageUrl =
    (product.image &&
      (product.image.startsWith("http")
        ? product.image
        : `http://localhost:3001/uploads/${product.image}`)) ||
    PLACEHOLDER_IMG;
  const onImgError = (e) => {
    e.target.onerror = null;
    e.target.src = PLACEHOLDER_IMG;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 gap-10">
      <div className="bg-gray-100 p-10 rounded">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full object-contain"
          onError={onImgError}
        />
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

        <p className="text-red-500 text-2xl font-bold mb-4">${product.price}</p>

        <p className="text-gray-600 mb-6">{product.description}</p>

        <button
          onClick={() =>
            dispatch(
              addToCart({
                productId: product._id,
                name: product.name,
                image: product.image,
                price: product.price,
                qty: 1,
              }),
            )
          }
          className="bg-black text-white px-10 py-3 rounded hover:bg-red-500"
        >
          Thêm vào giỏ hàng
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
