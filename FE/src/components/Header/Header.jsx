import "./Header.css";

function Header() {
  return (
    <>
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="container top-inner">
          <div className="left-top">
            VND ▾ &nbsp;&nbsp; Tiếng Việt ▾
          </div>

          <div className="right-top">
            <a href="#">Tài khoản</a>
            <a href="#">Yêu thích</a>
            <a href="#">Giỏ hàng</a>
            <a href="#">Thanh toán</a>
            <a href="#">Đăng nhập</a>
          </div>
        </div>
      </div>

      {/* MAIN HEADER */}
      <div className="main-header">
        <div className="container main-inner">

          <div className="logo">
            <h1>Flip<span>mart</span></h1>
          </div>

          <div className="search-box">
            <div className="category">Danh mục ▾</div>
            <input type="text" placeholder="Tìm kiếm sản phẩm..." />
            <button>🔍</button>
          </div>

          <div className="cart">
            <span className="cart-count">2</span>
            <span>GIỎ HÀNG - 600.000₫</span>
          </div>

        </div>
      </div>

      {/* NAVBAR */}
      <div className="navbar">
        <div className="container nav-inner">
          <ul>
            <li className="active">TRANG CHỦ</li>
            <li>QUẦN ÁO</li>
            <li className="hot">ĐIỆN TỬ</li>
            <li className="new">SỨC KHỎE & LÀM ĐẸP</li>
            <li>ĐỒNG HỒ</li>
            <li>TRANG SỨC</li>
            <li>GIÀY DÉP</li>
            <li>TRẺ EM</li>
            <li>TRANG KHÁC</li>
            <li className="offer">KHUYẾN MÃI HÔM NAY</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default Header;