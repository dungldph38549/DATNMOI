import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getOrderById } from "../../api";
import ScSneakerLogo from "../../components/FooterComponent/ScSneakerLogo";

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const successParam = searchParams.get("success");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkOrderStatus = async () => {
      if (!orderId) return;
      setIsChecking(true);
      try {
        const res = await getOrderById(orderId);
        const order = res?.order || res;
        if (mounted) setPaymentStatus(order?.paymentStatus || "");
      } catch {
        if (mounted) setPaymentStatus("");
      } finally {
        if (mounted) setIsChecking(false);
      }
    };
    checkOrderStatus();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const success = successParam === "1" || paymentStatus === "paid";

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      {success ? (
        <>
          <div className="flex w-full justify-center mb-8">
            <ScSneakerLogo variant="hero" />
          </div>
          <h1 className="text-2xl font-bold text-green-700 mb-2">
            Thanh toán thành công
          </h1>
          <p className="text-gray-600 mb-6">
            Đơn hàng của bạn đã được thanh toán qua VNPay.
          </p>
          {isChecking && (
            <p className="text-sm text-gray-500 mb-4">
              Đang đồng bộ trạng thái thanh toán...
            </p>
          )}
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
          {paymentStatus === "unpaid" && (
            <p className="text-sm text-gray-500 mb-4">
              Đơn hàng hiện vẫn chưa được thanh toán.
            </p>
          )}
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
