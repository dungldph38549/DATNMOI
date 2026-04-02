import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { getChatHistory } from "../../api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

const zaloUrl = String(import.meta.env.VITE_CONTACT_ZALO_URL || "").trim();
const messengerUrl = String(import.meta.env.VITE_CONTACT_MESSENGER_URL || "").trim();
const facebookUrl = String(import.meta.env.VITE_CONTACT_FACEBOOK_URL || "").trim();

const bubbleStyle = {
  user: {
    background: "#f49d25",
    color: "#fff",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  ai: {
    background: "#EEF2FF",
    color: "#1E1B4B",
    border: "1px solid #C7D2FE",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  admin: {
    background: "#F1F5F9",
    color: "#0F172A",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
};

const fmtTime = (ts) => {
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const normalizeMessage = (m, customerId) => {
  const message = m?.message ?? m?.text ?? "";
  const senderId = m?.senderId ?? m?.sender_id ?? m?.from ?? null;
  const timestamp = m?.timestamp ?? m?.createdAt ?? new Date().toISOString();

  const senderRole =
    m?.senderRole ??
    (senderId && String(senderId) === String(customerId) ? "user" : "admin");

  return {
    _id: m?._id ?? m?.id ?? `${timestamp}-${Math.random().toString(16).slice(2)}`,
    senderId,
    senderRole,
    message: String(message),
    timestamp,
  };
};

export default function ChatPanel({ onClose, compact = false }) {
  const user = useSelector((s) => s.user);
  const token = user?.token;
  const customerId = user?.id || user?._id || user?.userId;

  const roomID = useMemo(
    () => (customerId ? `customer:${customerId}` : null),
    [customerId],
  );

  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState("");
  const [text, setText] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    if (!customerId || !token) return;

    setLoadingHistory(true);
    setErrorHistory("");
    getChatHistory({ customerId })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.messages ?? [];
        setMessages(
          (list || []).map((m) => normalizeMessage(m, customerId)),
        );
      })
      .catch(() => {
        // Endpoint có thể chưa sẵn; vẫn cho chat UI chạy để test.
        setErrorHistory("");
      })
      .finally(() => setLoadingHistory(false));
  }, [customerId, token]);

  useEffect(() => {
    if (!customerId || !token || !roomID) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // Join đúng room của customer
    socket.emit("chat:joinCustomerRoom", { customerId, roomID });

    socket.on("chat:newMessage", (payload) => {
      // Backend chatSocket luôn emit payload dạng object (message/senderRole/...)
      // nhưng vẫn hỗ trợ trường hợp payload chỉ là string.
      const incoming = normalizeMessage(payload, customerId);
      setMessages((prev) => [...prev, incoming]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [customerId, token, roomID]);

  const send = () => {
    const v = String(text || "").trim();
    if (!v || !socketRef.current || !roomID) return;

    setText("");

    socketRef.current.emit("chat:sendMessage", {
      customerId,
      roomID,
      message: v,
    });
  };

  return (
    <div
      style={{
        width: compact ? 360 : "100%",
        height: compact ? 520 : "80vh",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #E2E8F0",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          background: "#1C1917",
          color: "#FCD34D",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>
          {compact ? "Hỗ trợ" : "Chat với SneakerHouse"}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FCD34D",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {(zaloUrl || messengerUrl || facebookUrl) && (
        <div
          style={{
            padding: "10px 14px",
            background: "#FFFBF5",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
            Liên hệ nhanh:
          </span>
          {facebookUrl && (
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#1877F2",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 900,
                fontSize: 13,
              }}
              aria-label="Liên hệ Facebook"
              title="Facebook"
            >
              f
            </a>
          )}
          {zaloUrl && (
            <a
              href={zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0068FF",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 900,
                fontSize: 13,
              }}
              aria-label="Liên hệ Zalo"
              title="Zalo"
            >
              Z
            </a>
          )}
          {messengerUrl && (
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0084FF",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 900,
                fontSize: 13,
              }}
              aria-label="Liên hệ Messenger"
              title="Messenger"
            >
              M
            </a>
          )}
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 14px",
          background: "#FAFAF8",
        }}
      >
        {loadingHistory && (
          <div style={{ color: "#6B7280", fontSize: 13 }}>Đang tải lịch sử...</div>
        )}
        {!loadingHistory && errorHistory && (
          <div style={{ color: "#EF4444", fontSize: 13 }}>{errorHistory}</div>
        )}

        {messages.length === 0 && !loadingHistory && (
          <div
            style={{
              color: "#64748B",
              fontSize: 13,
              textAlign: "center",
              marginTop: 20,
              lineHeight: 1.5,
              padding: "0 8px",
            }}
          >
            Gửi tin nhắn để được đội ngũ admin trả lời trực tiếp.
            {zaloUrl || messengerUrl ? (
              <>
                <br />
                Hoặc dùng Zalo / Messenger phía trên nếu bạn tiện hơn.
              </>
            ) : null}
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.senderRole === "user";
          const bubbleKey =
            m.senderRole === "ai" ? "ai" : isUser ? "user" : "admin";
          return (
            <div
              key={m._id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  padding: "10px 12px",
                  fontSize: 13,
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                  ...bubbleStyle[bubbleKey],
                }}
              >
                {m.senderRole === "ai" && (
                  <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.75, marginBottom: 4 }}>
                    Tin cũ (tự động)
                  </div>
                )}
                {m.message}
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                  {fmtTime(m.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: 12,
          borderTop: "1px solid #F1F5F9",
          display: "flex",
          gap: 10,
          alignItems: "center",
          background: "#fff",
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn cho admin…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          style={{
            flex: 1,
            border: "1.5px solid #E5E7EB",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={send}
          style={{
            background: "#1C1917",
            color: "#FCD34D",
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 13,
            opacity: text.trim() ? 1 : 0.6,
          }}
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

