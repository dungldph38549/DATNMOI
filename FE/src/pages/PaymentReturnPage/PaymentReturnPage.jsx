import React from "react";
import { Link, useSearchParams } from "react-router-dom";

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const orderId = searchParams.get("orderId");

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      {success ? (
        <>
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-700 mb-2">
            Thanh toán thành công
          </h1>
          <p className="text-gray-600 mb-6">
            Đơn hàng của bạn đã được thanh toán qua VNPay.
          </p>
        </>
      ) : (
        <>
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">
            Thanh toán thất bại hoặc đã hủy
          </h1>
          <p className="text-gray-600 mb-6">
            Bạn có thể kiểm tra đơn hàng và thử thanh toán lại.
          </p>
        </>
      )}

      <div className="flex justify-center gap-4">
        {orderId && (
          <Link
            to={`/orders/${orderId}`}
            className="px-4 py-2 bg-primary text-white rounded hover:opacity-90"
          >
            Xem đơn hàng
          </Link>
        )}
        <Link
          to="/orders"
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Lịch sử đơn hàng
        </Link>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
};

export default PaymentReturnPage;
