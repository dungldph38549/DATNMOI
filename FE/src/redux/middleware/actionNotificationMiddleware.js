import notify from "../../utils/notify";

const shouldNotify = (action) => action?.meta?.notify !== false;

export const actionNotificationMiddleware = (store) => (next) => (action) => {
  const prevState = store.getState();
  const result = next(action);
  const nextState = store.getState();

  if (!shouldNotify(action)) return result;

  switch (action.type) {
    case "cart/addToCart":
      notify.success("Da them san pham vao gio hang.");
      break;
    case "cart/removeFromCart":
      notify.info("Da xoa san pham khoi gio hang.");
      break;
    case "cart/removeManyFromCart":
      notify.info("Da xoa cac san pham da chon khoi gio hang.");
      break;
    case "cart/setQty":
      notify.info("Da cap nhat so luong san pham.");
      break;
    case "cart/updateCartVariant":
      notify.success("Da cap nhat phan loai san pham.");
      break;
    case "cart/clearCart":
      notify.info("Da xoa toan bo gio hang.");
      break;
    case "wishlist/toggleWishlist": {
      const prevLen = prevState?.wishlist?.items?.length || 0;
      const nextLen = nextState?.wishlist?.items?.length || 0;
      if (nextLen > prevLen) {
        notify.success("Da them vao danh sach yeu thich.");
      } else if (nextLen < prevLen) {
        notify.info("Da xoa khoi danh sach yeu thich.");
      }
      break;
    }
    case "wishlist/addToWishlist":
      notify.success("Da them vao danh sach yeu thich.");
      break;
    case "wishlist/removeFromWishlist":
      notify.info("Da xoa khoi danh sach yeu thich.");
      break;
    case "wishlist/clearWishlist":
      notify.info("Da xoa toan bo danh sach yeu thich.");
      break;
    case "user/setUser":
      notify.success("Dang nhap thanh cong.");
      break;
    case "user/clearUser":
      notify.info("Ban da dang xuat.");
      break;
    default:
      break;
  }

  return result;
};

export default actionNotificationMiddleware;
