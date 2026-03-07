import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductFilterSidebar from "../../components/ProductFilterSidebar/ProductFilterSidebar";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/cartSlice";

const API_URL = "http://localhost:3001";

const ProductPage = () => {
  const [selectedSize, setSelectedSize] = useState(9);
  const [products, setProducts] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch(`${API_URL}/api/product`);
      const data = await res.json();
      setProducts(data.data || []);
    };

    fetchProducts();
  }, []);

  return (
    <main className="flex-grow w-full px-10 lg:px-20 py-8">

      <div className="flex flex-col lg:flex-row gap-8">

        <ProductFilterSidebar
          selectedSize={selectedSize}
          onChangeSize={setSelectedSize}
        />

        <div className="flex-1">

          <h1 className="text-3xl font-bold mb-6">Sản phẩm</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {products.map((product) => (

              <div
                key={product._id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition"
              >

                <Link to={`/product/${product._id}`}>

                  <div className="aspect-square overflow-hidden">

                    <img
                      className="w-full h-full object-cover"
                      src={`${API_URL}/uploads/${product.image}`}
                      alt={product.name}
                    />

                  </div>

                  <div className="p-4">

                    <h3 className="font-bold text-lg">{product.name}</h3>

                    <p className="text-primary font-bold mt-2">
                      ${product.price}
                    </p>

                    <button
                      onClick={(e) => {
                        e.preventDefault();

                        dispatch(
                          addToCart({
                            productId: product._id,
                            name: product.name,
                            image: `${API_URL}/uploads/${product.image}`,
                            price: product.price,
                            qty: 1,
                          })
                        );
                      }}
                      className="mt-3 bg-primary text-white px-3 py-2 rounded"
                    >
                      Thêm giỏ
                    </button>

                  </div>

                </Link>

              </div>

            ))}

          </div>

        </div>

      </div>

    </main>
  );
};

export default ProductPage;