import React, { useState } from "react";
import { useSelector } from "react-redux";
import ChatPanel from "./ChatPanel";

export default function ChatWidget({ disabled = false }) {
  const user = useSelector((s) => s.user);
  const [open, setOpen] = useState(false);

  const token = user?.token;

  if (disabled) return null;
  if (!user?.login || !token) return null;

  return (
    <>
      <div
        role="presentation"
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 150,
          display: open ? "block" : "none",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: 18,
            bottom: 86,
          }}
        >
          <ChatPanel
            compact
            onClose={() => setOpen(false)}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 160,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: "#1C1917",
          color: "#FCD34D",
          boxShadow: "0 14px 40px rgba(0,0,0,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 900,
        }}
        aria-label="Mở chat hỗ trợ"
        title="Chat với admin — SneakerConverse"
      >
        💬
      </button>
    </>
  );
}

