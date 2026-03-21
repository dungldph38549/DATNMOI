import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";
import {
  addToCartAPI,
  createReview,
  getOrdersByUser,
  getProductById,
  getProductReviews,
  getStocks,
  relationProduct,
  uploadImages,
} from "../../api";

const ProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeTab, setActiveTab] = useState("desc");
  const [mainImage, setMainImage] = useState("");

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsReload, setReviewsReload] = useState(0);

  // Customer review form
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState("");

  const [checkingStock, setCheckingStock] = useState(false);
  const [stockInfo, setStockInfo] = useState(null); // { countInStock, available, sku, size, color }

  const PLACEHOLDER_IMG =
    "https://via.placeholder.com/400x400/f0f0f0/999?text=No+Image";

  const reviewFilePreviews = useMemo(
    () => reviewFiles.map((f) => URL.createObjectURL(f)),
    [reviewFiles],
  );
  useEffect(() => {
    return () => {
      reviewFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [reviewFilePreviews]);

  const getImage = (img) => {
    if (!img) return PLACEHOLDER_IMG;
    if (typeof img !== "string") return PLACEHOLDER_IMG;
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    if (img.startsWith("/uploads/")) return `http://localhost:3002${img}`;
    if (img.startsWith("uploads/")) return `http://localhost:3002/${img}`;
    return `http://localhost:3002/uploads/${img}`;
  };

  // Lấy value thuộc tính variant (variant.attributes có thể là Map hoặc object khi lean/serialize khác nhau)
  const getVariantAttr = (attrs, key) => {
    if (!attrs) return null;
    if (typeof attrs.get === "function") return attrs.get(key);
    if (typeof attrs === "object") return attrs[key] ?? null;
    return null;
  };

  const getVariantSizeValue = (variant) => {
    const attrs = variant?.attributes;
    if (!attrs) return null;

    // Map
    if (typeof attrs.get === "function") {
      return (
        attrs.get("Size") ??
        attrs.get("size") ??
        attrs.get("SIZE") ??
        null
      );
    }

    // Plain object: tìm theo key case-insensitive
    if (typeof attrs === "object") {
      if (attrs.Size != null) return attrs.Size;
      if (attrs.size != null) return attrs.size;
      if (attrs.SIZE != null) return attrs.SIZE;

      const foundKey = Object.keys(attrs).find((k) => String(k).toLowerCase() === "size");
      if (foundKey) return attrs[foundKey];
    }

    return null;
  };

  const getVariantSizeLabel = (variant) => {
    const val = getVariantSizeValue(variant);
    return val != null ? String(val) : variant?.sku ?? "";
  };

  // Chỉ coi là "có biến thể" khi thật sự có danh sách variants và length > 0.
  // Tránh trường hợp backend set `hasVariants` không khớp dữ liệu variants.
  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        const p = data?.data ?? data;
        setProduct(p);
        const firstImg = p?.image || p?.srcImages?.[0] || "";
        setMainImage(firstImg);
      } catch (err) {
        console.error(err);
        setProduct(null);
      }
    };

    fetchProduct();
  }, [id]);

  const availableSizes = useMemo(() => {
    if (!product) return [];
    if (!hasVariants) return [];

    const labels = product.variants
      .map((v) => getVariantSizeLabel(v))
      .filter((s) => s != null && String(s).trim() !== "");

    // Dedupe label để render nút
    return Array.from(new Set(labels.map((s) => String(s))));
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedVariant = useMemo(() => {
    if (!hasVariants || !selectedSize || !Array.isArray(product?.variants))
      return null;

    return (
      product.variants.find((v) => {
        const label = getVariantSizeLabel(v);
        return label != null && String(label) === String(selectedSize);
      }) ?? null
    );
  }, [product, selectedSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSku = selectedVariant?.sku ?? null;
  const selectedSizeValue = getVariantSizeValue(selectedVariant) ?? null;

  const displayPrice = useMemo(() => {
    if (!product) return 0;
    if (hasVariants) {
      return selectedVariant?.price ?? product?.variants?.[0]?.price ?? 0;
    }
    return product.price ?? 0;
  }, [product, selectedVariant]);

  const ratingAverage = reviewStats?.average ?? product?.rating ?? 4.5;
  const ratingTotal = reviewStats?.total ?? product?.reviewCount ?? 120;

  const thumbnails = useMemo(() => {
    if (!product) return [];
    const imgs = [
      product.image,
      ...(Array.isArray(product.srcImages) ? product.srcImages : []),
    ].filter(Boolean);
    return Array.from(new Set(imgs));
  }, [product]);

  // Nếu có variants, tự chọn size còn hàng (tránh UX trống)
  useEffect(() => {
    if (!hasVariants || !availableSizes.length) return;
    if (selectedSize) return;

    const firstInStock = product?.variants?.find((v) => {
      return (getVariantSizeLabel(v) ?? "").trim() !== "" && v?.stock > 0;
    });

    const fallback = availableSizes[0];
    const nextSize = firstInStock
      ? String(getVariantSizeLabel(firstInStock))
      : fallback;
    setSelectedSize(nextSize);
  }, [product, availableSizes, selectedSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check tồn kho theo size (SKU variant)
  useEffect(() => {
    const run = async () => {
      if (!product) return;

      if (!hasVariants) {
        const countInStock =
          product.stock ?? product.countInStock ?? product?.totalStock ?? 0;
        setStockInfo({
          countInStock,
          available: countInStock > 0,
        });
        return;
      }

      if (!selectedSku) {
        setStockInfo(null);
        return;
      }

      setCheckingStock(true);
      try {
        const res = await getStocks([{ productId: product._id, sku: selectedSku }]);
        const first = Array.isArray(res) ? res[0] : res;
        setStockInfo(first ?? { countInStock: 0, available: false });
      } catch (err) {
        console.error("Check stock error:", err);
        setStockInfo({ countInStock: 0, available: false });
      } finally {
        setCheckingStock(false);
      }
    };

    run();
  }, [product, selectedSku]);

  // Clamp quantity theo tồn kho khi đã check xong
  useEffect(() => {
    if (!stockInfo || stockInfo.available === false) return;
    const max = Number(stockInfo?.countInStock ?? 0);
    if (!Number.isFinite(max) || max <= 0) return;
    setQuantity((q) => Math.min(q, max));
  }, [stockInfo]);

  // Related products + Reviews
  useEffect(() => {
    const run = async () => {
      if (!product) return;

      // Related
      setRelatedLoading(true);
      try {
        const brandId = product.brandId?._id ?? product.brandId;
        const categoryId = product.categoryId?._id ?? product.categoryId;
        const rel = await relationProduct(brandId, categoryId, product._id);
        setRelatedProducts(Array.isArray(rel) ? rel : rel?.data ?? []);
      } catch (err) {
        console.error("Load related products error:", err);
        setRelatedProducts([]);
      } finally {
        setRelatedLoading(false);
      }

      // Reviews
      setReviewsLoading(true);
      try {
        const res = await getProductReviews({
          productId: product._id,
          page: 1,
          limit: 10,
          sort: "newest",
        });
        setReviews(res?.reviews ?? []);
        setReviewStats(res?.stats ?? null);
      } catch (err) {
        console.error("Load reviews error:", err);
        setReviews([]);
        setReviewStats(null);
      } finally {
        setReviewsLoading(false);
      }
    };

    run();
  }, [product, reviewsReload]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = async () => {
    if (!product) return;

    const isVariant = hasVariants;
    // sizeToSave: cố lấy "value" thật (không fallback bằng sku)
    const sizeToSave = isVariant ? selectedSizeValue : null;
    const skuToSave = isVariant ? selectedSku : null;

    if (isVariant && !skuToSave) {
      alert("Vui lòng chọn size!");
      return;
    }

    if (stockInfo?.available === false) {
      alert("Sản phẩm hiện đã hết hàng theo size đã chọn.");
      return;
    }

    const qtySafe = (() => {
      if (!stockInfo?.available) return quantity;
      const max = Number(stockInfo?.countInStock ?? 0);
      if (!Number.isFinite(max) || max <= 0) return quantity;
      return Math.min(quantity, max);
    })();

    // 1) Lưu cart local để checkout hoạt động ngay
    dispatch(
      addToCart({
        productId: product._id,
        name: product.name,
        image: product.image,
        price: displayPrice,
        qty: qtySafe,
        sku: skuToSave,
        size: sizeToSave,
      }),
    );

    // 2) Lưu cart vào DB (chỉ khi user đã login)
    try {
      if (user?.login && user?.id) {
        await addToCartAPI({
          userId: user.id,
          productId: product._id,
          qty: qtySafe,
          sku: skuToSave ?? null,
          size: sizeToSave ?? null,
        });
      }
    } catch (err) {
      // Không chặn flow checkout nếu BE cart đang lỗi
      console.error("Save cart to DB error:", err);
    }
  };

  const renderStarsText = (rating) => {
    const r = Number(rating ?? 0);
    const full = Math.max(0, Math.min(5, Math.round(r)));
    return `${"★".repeat(full)}${"☆".repeat(5 - full)}`;
  };

  const handleSelectReviewFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = Math.max(0, 5 - reviewFiles.length);
    if (remaining <= 0) return;

    const next = files.slice(0, remaining);
    setReviewFiles((prev) => [...prev, ...next]);
    e.target.value = null; // allow re-select same file
  };

  const handleSubmitReview = async () => {
    if (!product) return;
    if (!user?.login || !user?.id) {
      setReviewSubmitError("Vui lòng đăng nhập để viết đánh giá.");
      return;
    }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewSubmitError("Vui lòng chọn số sao (1 đến 5).");
      return;
    }

    setReviewSubmitting(true);
    setReviewSubmitError("");
    try {
      let orderId = null;

      // verifiedPurchase => set orderId from delivered order containing this product
      const ordersResp = await getOrdersByUser(user.id, 1, 20);
      const orders = ordersResp?.data ?? ordersResp;
      const targetProductId = String(product._id);
      const deliveredOrder = Array.isArray(orders)
        ? orders.find(
            (o) =>
              o?.status === "delivered" &&
              Array.isArray(o?.products) &&
              o.products.some(
                (p) =>
                  String(p?.productId?._id ?? p?.productId) ===
                  targetProductId,
              ),
          )
        : null;

      orderId = deliveredOrder?._id ?? null;

      let images = [];
      if (reviewFiles.length > 0) {
        const formData = new FormData();
        reviewFiles.forEach((f) => formData.append("files", f));
        const uploadRes = await uploadImages(formData);
        const paths =
          uploadRes?.paths ?? uploadRes?.data?.paths ?? uploadRes?.data ?? [];
        if (Array.isArray(paths)) {
          images = paths.map((p) => ({ url: p }));
        }
      }

      await createReview({
        productId: product._id,
        rating: reviewRating,
        title: reviewTitle.trim() || null,
        content: reviewContent.trim() || null,
        images,
        orderId,
      });

      setReviewRating(0);
      setReviewTitle("");
      setReviewContent("");
      setReviewFiles([]);
      setReviewsReload((x) => x + 1);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Không thể gửi review";
      setReviewSubmitError(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!product) return <p className="text-center mt-10">Loading...</p>;

  const isVariant = hasVariants;
  const stockCountDisplay =
    stockInfo?.countInStock ?? product?.countInStock ?? product?.stock ?? 0;

  return (
    <div className="container py-5">
      {/* ===== TOP ===== */}
      <div className="row g-5">
        {/* IMAGE */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 bg-light">
            <div className="p-4 p-md-5">
            <img
              src={getImage(mainImage)}
              onError={(e) => {
                e.target.src = PLACEHOLDER_IMG;
              }}
                className="w-100"
                style={{ height: 420, objectFit: "contain" }}
              alt={product.name}
            />
            </div>
          </div>

          {/* THUMBNAIL */}
          <div className="d-flex gap-2 gap-md-3 mt-3 flex-wrap">
            {thumbnails.map((img, i) => (
              <img
                key={i}
                src={getImage(img)}
                onClick={() => setMainImage(img)}
                className={`rounded border ${
                  mainImage === img ? "border-dark border-2" : "border-secondary-subtle"
                }`}
                style={{ width: 76, height: 76, objectFit: "cover", cursor: "pointer" }}
                alt=""
              />
            ))}
          </div>
        </div>

        {/* INFO */}
        <div className="col-12 col-lg-6">
          <h1 className="fw-bold mb-2" style={{ fontSize: "2.4rem", lineHeight: 1.2 }}>
            {product.name}
          </h1>

          <p className="mb-2" style={{ color: "#f59e0b", fontSize: "1.05rem" }}>
            {renderStarsText(ratingAverage)} ({Number(ratingAverage).toFixed(1)} / 5)
          </p>

          <p className="fw-bold mb-4" style={{ color: "#ef4444", fontSize: "2.2rem" }}>
            {Number(displayPrice).toLocaleString()}₫
          </p>

          {/* SIZE */}
          {isVariant ? (
            <div className="mb-4 mb-md-5">
              <p className="fw-semibold mb-2" style={{ fontSize: "1.15rem" }}>
                Chọn size:
              </p>
              <div className="d-flex gap-2 gap-md-3 flex-wrap">
                {availableSizes.map((size) => {
                  const v = product.variants?.find(
                    (vv) => String(getVariantSizeLabel(vv)) === String(size),
                  );
                  const sizeStock = v?.stock ?? 0;
                  const isSelected = String(selectedSize) === String(size);
                  const isDisabled = sizeStock <= 0;

                  return (
                    <button
                      key={size}
                      onClick={() => !isDisabled && setSelectedSize(String(size))}
                      disabled={isDisabled}
                      className={`btn rounded-pill px-4 py-2 fw-semibold ${
                        isSelected
                          ? "btn-dark"
                          : isDisabled
                            ? "btn-light text-secondary border"
                            : "btn-outline-secondary"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* QUANTITY */}
          <div className="mb-4 mb-md-5">
            <p className="fw-semibold mb-2" style={{ fontSize: "1.15rem" }}>
              Số lượng:
            </p>
            <div className="d-flex align-items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="btn btn-outline-secondary px-3 py-1"
                style={{ fontSize: "1.1rem", lineHeight: 1 }}
              >
                -
              </button>
              <span className="fw-bold" style={{ minWidth: 24, fontSize: "1.2rem" }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="btn btn-outline-secondary px-3 py-1"
                style={{ fontSize: "1.1rem", lineHeight: 1 }}
              >
                +
              </button>
            </div>
          </div>

          {/* STOCK */}
          <p className="text-success fw-semibold mb-4" style={{ fontSize: "1.1rem" }}>
            {checkingStock ? (
              "Đang kiểm tra tồn kho..."
            ) : isVariant ? (
              `Còn ${stockCountDisplay} sản phẩm (size ${selectedSize ?? "-"})`
            ) : (
              `Còn ${stockCountDisplay} sản phẩm`
            )}
          </p>

          <button
            onClick={handleAddToCart}
            disabled={checkingStock || (isVariant && stockInfo?.available === false)}
            className="btn btn-dark w-100 py-3 rounded-pill fw-semibold"
            style={{ fontSize: "1.2rem" }}
          >
            🛒 Thêm vào giỏ hàng
          </button>

          <div className="mt-4 text-secondary" style={{ fontSize: "1rem" }}>
            🚚 Giao hàng toàn quốc <br />
            🔄 Đổi trả 7 ngày <br />
            💳 COD
          </div>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="mt-16">
        <div className="flex gap-6 border-b">
          {[
            { key: "desc", label: "Mô tả" },
            { key: "review", label: "Đánh giá" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 ${
                activeTab === tab.key
                  ? "border-b-2 border-black font-bold"
                  : "text-gray-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "desc" && (
            <p className="text-gray-600 leading-relaxed">
              {product.description || "Chưa có mô tả sản phẩm."}
            </p>
          )}

          {activeTab === "review" && (
            <div>
              <div className="border rounded-xl p-4 mb-6 bg-white">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="font-semibold">Viết đánh giá</h3>
                  {reviewFiles.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {reviewFiles.length}/5 ảnh
                    </span>
                  )}
                </div>

                {!user?.login ? (
                  <p className="text-gray-500 text-sm">
                    Vui lòng đăng nhập để viết đánh giá.
                  </p>
                ) : (
                  <>
                    {reviewSubmitError && (
                      <p className="text-red-500 text-sm mb-3">
                        {reviewSubmitError}
                      </p>
                    )}

                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Số sao</p>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const active = reviewRating === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setReviewRating(n)}
                              className={`px-3 py-1 border rounded ${
                                active
                                  ? "bg-black text-white border-black"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                            >
                              {n}★
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mb-3">
                      <input
                        className="w-full border rounded-lg px-3 py-2"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="Tiêu đề (tuỳ chọn)"
                        maxLength={150}
                      />
                    </div>

                    <div className="mb-3">
                      <textarea
                        className="w-full border rounded-lg px-3 py-2"
                        rows={4}
                        value={reviewContent}
                        onChange={(e) => setReviewContent(e.target.value)}
                        placeholder="Nội dung (tuỳ chọn)"
                        maxLength={500}
                      />
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">
                        Ảnh (tối đa 5)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={reviewSubmitting}
                        onChange={handleSelectReviewFiles}
                      />

                      {reviewFilePreviews.length > 0 && (
                        <div className="flex gap-3 mt-3 flex-wrap">
                          {reviewFilePreviews.slice(0, 5).map((url, i) => (
                            <div key={i} className="relative">
                              <img
                                src={url}
                                alt="review"
                                className="w-16 h-16 object-cover rounded border bg-gray-50"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewFiles((prev) =>
                                    prev.filter((_, idx) => idx !== i),
                                  )
                                }
                                className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 text-sm"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitReview}
                      disabled={reviewSubmitting}
                      className="w-full bg-black text-white py-3 rounded-xl hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {reviewSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
                    </button>
                  </>
                )}
              </div>

              <div className="mb-6">
                <p className="font-medium">
                  {renderStarsText(ratingAverage)}{" "}
                  {Number(ratingAverage).toFixed(1)}/5
                </p>
                <p className="text-gray-500">
                  {Number(ratingTotal)} đánh giá
                </p>
              </div>

              {reviewsLoading ? (
                <p>Đang tải đánh giá...</p>
              ) : reviews.length === 0 ? (
                <p className="text-gray-500">Chưa có đánh giá nào.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div
                      key={r._id}
                      className="border rounded-xl p-4 bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {r.title || "Đánh giá"}
                          </p>
                          <p className="text-yellow-500 mt-1">
                            {renderStarsText(r.rating)} ({r.rating}/5)
                          </p>
                          {r.verifiedPurchase && (
                            <p className="text-green-600 text-sm mt-1">
                              Đã mua hàng
                            </p>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm">
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleDateString()
                            : ""}
                        </p>
                      </div>

                      {r.content && (
                        <p className="text-gray-700 mt-3 leading-relaxed">
                          {r.content}
                        </p>
                      )}

                      {Array.isArray(r.images) && r.images.length > 0 && (
                        <div className="flex gap-3 mt-3 flex-wrap">
                          {r.images.slice(0, 5).map((img, idx) => (
                            <img
                              key={idx}
                              src={getImage(img?.url ?? img)}
                              alt=""
                              className="w-16 h-16 object-cover rounded border"
                              onError={(e) => {
                                e.target.src = PLACEHOLDER_IMG;
                              }}
                            />
                          ))}
                        </div>
                      )}

                      <p className="text-gray-500 text-sm mt-3">
                        — {r.userId?.name || "Người dùng"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== RELATED ===== */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Sản phẩm liên quan</h2>

        {relatedLoading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts?.slice(0, 8)?.map((p) => {
              const img = p?.image || p?.srcImages?.[0] || "";
              const price = p?.price ?? p?.variants?.[0]?.price ?? 0;

              return (
                <div key={p._id} className="border rounded-xl p-3 hover:shadow">
                  <Link to={`/product/${p._id}`} className="block">
                    <img
                      src={getImage(img)}
                      alt={p.name}
                      className="h-40 w-full object-contain mb-3 bg-gray-50"
                      onError={(e) => {
                        e.target.src = PLACEHOLDER_IMG;
                      }}
                    />
                    <p className="font-medium line-clamp-2">{p.name}</p>
                    <p className="text-red-500 font-bold mt-2">
                      {Number(price).toLocaleString()}₫
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;