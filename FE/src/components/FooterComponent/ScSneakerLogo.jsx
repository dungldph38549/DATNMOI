import React from "react";

const base = `${process.env.PUBLIC_URL || ""}/images/sc-sneaker-logo.png`;

/**
 * Logo SC — crop ngang mạnh hơn; khung cùng độ rộng tối đa, căn giữa dưới wordmark (footer items-center).
 * variant="hero": hiển thị đủ ảnh, căn giữa quang học (dùng trang success / hero, không dùng -ml crop).
 */
export default function ScSneakerLogo({ className = "", variant = "default" }) {
  const isHero = variant === "hero";
  const shell = isHero
    ? `mx-auto w-[min(100%,28rem)] shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-neutral-200/70 ${className}`.trim()
    : `w-[min(100%,11.5rem)] shrink-0 overflow-hidden self-center rounded-2xl shadow-sm ring-1 ring-neutral-200/70 ${className}`.trim();
  const imgClass = isHero
    ? "block h-auto w-full object-contain object-center bg-transparent select-none"
    : "-ml-[15%] block h-auto w-[130%] max-w-none bg-transparent select-none";

  return (
    <div className={shell}>
      {/* default: 130% ngang + -ml 15% để crop hai bên; hero: object-contain căn giữa */}
      <img
        src={base}
        alt="Sneaker Converse — logo SC"
        decoding="async"
        loading={isHero ? "eager" : "lazy"}
        className={imgClass}
      />
    </div>
  );
}
