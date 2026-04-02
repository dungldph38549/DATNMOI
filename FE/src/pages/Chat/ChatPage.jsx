import React from "react";
import ChatPanel from "../../components/Chat/ChatPanel";

export default function ChatPage() {
  return (
    <div
      style={{
        padding: 22,
        minHeight: "80vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "#FAFAF8",
      }}
    >
      <ChatPanel />
    </div>
  );
}

