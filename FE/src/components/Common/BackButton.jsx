import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const BackButton = ({ label = "Quay lại", className = "" }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => navigate(-1)}
      className={`
        group inline-flex items-center gap-0 overflow-hidden rounded-full
        border border-slate-200/90 bg-white pl-1.5 pr-5 py-1.5
        shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]
        transition-all duration-200 ease-out
        hover:-translate-y-0.5 hover:border-amber-200/90 hover:shadow-[0_4px_14px_rgba(244,157,37,0.18)]
        active:translate-y-0 active:scale-[0.99]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2
        ${className}
      `}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors duration-200 group-hover:bg-[#f49d25] group-hover:text-white">
        <FaArrowLeft size={13} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      <span className="pl-2.5 text-sm font-semibold tracking-tight text-slate-700 transition-colors group-hover:text-slate-900">
        {label}
      </span>
    </button>
  );
};

export default BackButton;
