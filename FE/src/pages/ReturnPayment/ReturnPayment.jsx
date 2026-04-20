// src/pages/PaymentResult.js
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { checkPayment } from "../../api/index";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle } from "lucide-react"; // icon đẹp hơn

const PaymentResult = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const queryObject = {};
  for (const [key, value] of params.entries()) {
    queryObject[key] = value;
  }
  const payload = new URLSearchParams(queryObject).toString();
  const { data, isLoading } = useQuery({
    queryKey: ["payment"],
    queryFn: () => checkPayment(payload),
  });

  const isSuccess = data?.message?.toLowerCase().includes("thành công");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {isLoading ? (
          <p className="text-lg font-medium text-gray-500">
            Đang tải kết quả...
          </p>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              {isSuccess ? (
                <CheckCircle className="w-16 h-16 text-green-500" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500" />
              )}
            </div>

            <h2 className="text-2xl font-bold mb-6">
              {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
            </h2>

            <div className="mb-6 text-left space-y-3">
              {queryObject.vnp_TxnRef && (
                <p>
                  <span className="font-semibold">Mã đơn hàng:</span>{" "}
                  {queryObject.vnp_TxnRef}
                </p>
              )}
              {queryObject.vnp_Amount && (
                <p>
                  <span className="font-semibold">Số tiền:</span>{" "}
                  {(Number(queryObject.vnp_Amount) / 100).toLocaleString(
                    "vi-VN",
                  )}{" "}
                  VND
                </p>
              )}
              {data?.message && (
                <p
                  className={`font-medium ${
                    isSuccess ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {data.message}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-4 mt-4">
              <Link
                to="/"
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Mua sắm
              </Link>
              <Link
                to="/orders"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Đơn hàng
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
