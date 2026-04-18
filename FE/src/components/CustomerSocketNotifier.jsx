import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import notify from "../utils/notify";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

/**
 * Kết nối Socket.IO khi khách đã đăng nhập (không phải admin) để nhận
 * customer:notify — ví dụ đơn bị shop hủy — và hiện toast ngay cả khi không mở Chat.
 */
export default function CustomerSocketNotifier() {
  const user = useSelector((s) => s.user);
  const token = user?.token;
  const customerId = user?.id || user?._id;
  const isAdmin = !!user?.isAdmin;
  const isLoggedIn = !!(user?.login && token);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn || isAdmin || !customerId) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.emit("chat:joinCustomerRoom", { customerId });

    socket.on("customer:notify", (payload) => {
      const title = String(payload?.title || "Thông báo").trim();
      const body = String(payload?.body || "").trim();
      const text = body ? `${title}\n${body}` : title;
      notify.warning(text, 5200);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isLoggedIn, isAdmin, customerId, token]);

  return null;
}
