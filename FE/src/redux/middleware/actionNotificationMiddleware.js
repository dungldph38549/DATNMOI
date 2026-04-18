import notify from "../../utils/notify";

const shouldNotify = (action) => action?.meta?.notify !== false;

export const actionNotificationMiddleware = (store) => (next) => (action) => {
  const prevState = store.getState();
  const result = next(action);
  const nextState = store.getState();

  if (!shouldNotify(action)) return result;

  switch (action.type) {
    case "cart/addToCart":
      notify.success("Đã thêm sản phẩm vào giỏ hàng.");
      break;
    case "cart/removeFromCart":
      notify.info("Đã xóa sản phẩm khỏi giỏ hàng.");
      break;
    case "cart/removeManyFromCart":
      notify.info("Đã xóa các sản phẩm đã chọn khỏi giỏ hàng.");
      break;
    case "cart/setQty":
      notify.info("Đã cập nhật số lượng sản phẩm.");
      break;
    case "cart/updateCartVariant":
      notify.success("Đã cập nhật phân loại sản phẩm.");
      break;
    case "cart/clearCart":
      notify.info("Đã xóa toàn bộ giỏ hàng.");
      break;
    case "wishlist/toggleWishlist": {
      const prevLen = prevState?.wishlist?.items?.length || 0;
      const nextLen = nextState?.wishlist?.items?.length || 0;
      if (nextLen > prevLen) {
        notify.success("Đã thêm vào danh sách yêu thích.");
      } else if (nextLen < prevLen) {
        notify.info("Đã xóa khỏi danh sách yêu thích.");
      }
      break;
    }
    case "wishlist/addToWishlist":
      notify.success("Đã thêm vào danh sách yêu thích.");
      break;
    case "wishlist/removeFromWishlist":
      notify.info("Đã xóa khỏi danh sách yêu thích.");
      break;
    case "wishlist/clearWishlist":
      notify.info("Đã xóa toàn bộ danh sách yêu thích.");
      break;
    case "user/setUser":
      notify.success("Đăng nhập thành công.");
      break;
    case "user/clearUser":
      notify.info("Bạn đã đăng xuất.");
      break;
    default:
      break;
  }

  return result;
};

export default actionNotificationMiddleware;
