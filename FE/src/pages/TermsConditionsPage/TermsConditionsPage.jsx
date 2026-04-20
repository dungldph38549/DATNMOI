import React from "react";
import { Link } from "react-router-dom";

const TermsConditionsPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      
      {/* BREADCRUMB */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-sm text-gray-500">
        <Link to="/" className="hover:text-black transition">
          Trang chủ
        </Link>{" "}
        /{" "}
        <span className="text-black font-medium">
          Điều khoản & điều kiện
        </span>
      </div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 md:p-10">

          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">
            Điều khoản & Điều kiện
          </h1>

          <div className="space-y-6 text-gray-700 leading-7 text-justify">

            {/* SECTION */}
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Giới thiệu</h2>
              <p>
                Chào mừng bạn đến với SNEAKERCONVERSE. Khi truy cập và sử dụng
                website, bạn đồng ý tuân thủ các điều khoản và điều kiện dưới đây.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. Sở hữu trí tuệ</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Tất cả nội dung (hình ảnh, logo, thiết kế, nội dung) thuộc quyền
                  sở hữu của SNEAKERCONVERSE.
                </li>
                <li>
                  Nghiêm cấm sao chép, sử dụng khi chưa có sự cho phép.
                </li>
                <li>
                  Vi phạm có thể bị xử lý theo quy định pháp luật.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. Tài khoản</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Cung cấp thông tin chính xác khi đăng ký.</li>
                <li>Bảo mật tài khoản và mật khẩu.</li>
                <li>Chúng tôi có quyền khóa tài khoản nếu vi phạm.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Đặt hàng</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Đơn hàng được xác nhận sau khi hệ thống xử lý.</li>
                <li>Hỗ trợ COD, chuyển khoản, ví điện tử.</li>
                <li>Có quyền từ chối đơn nếu nghi ngờ gian lận.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. Vận chuyển</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Thời gian giao hàng phụ thuộc khu vực.</li>
                <li>Không chịu trách nhiệm chậm trễ ngoài ý muốn.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Đổi trả</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Đổi trả 3–7 ngày nếu lỗi hoặc giao sai.</li>
                <li>Sản phẩm còn nguyên tem, chưa sử dụng.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Chấm dứt</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Có quyền khóa tài khoản vi phạm.</li>
                <li>Có thể từ chối phục vụ trong tương lai.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                8. Thay đổi thỏa thuận
              </h2>
              <p>
                Chúng tôi có quyền thay đổi nội dung bất kỳ lúc nào. Việc tiếp tục
                sử dụng website đồng nghĩa bạn chấp nhận các thay đổi.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Liên hệ</h2>
              <p>
                Nếu có thắc mắc, vui lòng truy cập{" "}
                <Link to="/contact" className="text-blue-600 hover:underline">
                  trang liên hệ
                </Link>{" "}
                hoặc hotline của chúng tôi.
              </p>
            </section>

          </div>
        </div>
      </div>

      

    </div>
  );
};

export default TermsConditionsPage;