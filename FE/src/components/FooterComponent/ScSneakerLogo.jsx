import React from "react";

const base = `${process.env.PUBLIC_URL || ""}/images/sc-sneaker-logo.png`;

/**
 * Logo SC — crop ngang mạnh hơn; khung cùng độ rộng tối đa, căn giữa dưới wordmark (footer items-center).
 */
export default function ScSneakerLogo({ className = "" }) {
  return (
    <div
      className={`w-[min(100%,11.5rem)] shrink-0 overflow-hidden self-center rounded-2xl shadow-sm ring-1 ring-neutral-200/70 ${className}`.trim()}
    >
      {/* 130% chiều ngang, -ml 15% khung → cắt ~11.5% mỗi phía ảnh gốc */}
      <img
        src={base}
        alt="Sneaker Converse — logo SC"
        decoding="async"
        loading="lazy"
        className="-ml-[15%] block h-auto w-[130%] max-w-none bg-transparent select-none"
      />
    </div>
  );
}
