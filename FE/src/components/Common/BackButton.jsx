import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const BackButton = ({ label = "Quay lại", className = "" }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors ${className}`}
    >
      <FaArrowLeft size={13} />
      {label}
    </button>
  );
};

export default BackButton;
