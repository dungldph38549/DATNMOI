import { shopeeToast } from "./shopeeNotify";

/** Thông báo kiểu Shopee (toast tối, icon tròn, chữ trắng). */
export const notify = {
  success: (content, duration) => shopeeToast.success(content, duration),
  error: (content, duration) => shopeeToast.error(content, duration),
  info: (content, duration) => shopeeToast.info(content, duration),
  warning: (content, duration) => shopeeToast.warning(content, duration),
};

export default notify;
