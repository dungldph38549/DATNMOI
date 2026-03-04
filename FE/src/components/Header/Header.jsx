import "./Header.css";

function Header() {
  return (
    <>
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="container top-inner">
          <div className="left-top">
            USD ▾ &nbsp;&nbsp; English ▾
          </div>

          <div className="right-top">
            <a href="#">My Account</a>
            <a href="#">Wishlist</a>
            <a href="#">My Cart</a>
            <a href="#">Checkout</a>
            <a href="#">Login</a>
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
            <div className="category">Categories ▾</div>
            <input type="text" placeholder="Search here..." />
            <button>🔍</button>
          </div>

          <div className="cart">
            <span className="cart-count">2</span>
            <span>CART - $600.00</span>
          </div>

        </div>
      </div>

      {/* NAVBAR */}
      <div className="navbar">
        <div className="container nav-inner">
          <ul>
            <li className="active">HOME</li>
            <li>CLOTHING</li>
            <li className="hot">ELECTRONICS</li>
            <li className="new">HEALTH & BEAUTY</li>
            <li>WATCHES</li>
            <li>JEWELLERY</li>
            <li>SHOES</li>
            <li>KIDS & GIRLS</li>
            <li>PAGES</li>
            <li className="offer">TODAYS OFFER</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default Header;