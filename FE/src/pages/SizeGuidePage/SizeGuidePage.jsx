import React from "react";
import { Link } from "react-router-dom";
import SizeGuideInner from "../../components/SizeGuide/SizeGuideInner";

const SizeGuidePage = () => {
  return (
    <div className="min-h-screen bg-convot-cream pb-16 pt-8 font-body md:pt-12">
      <div className="container mx-auto max-w-3xl px-4">
        <nav className="mb-8 text-sm text-stone-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-convot-sage transition-colors">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden className="text-stone-300">
              /
            </li>
            <li className="font-medium text-stone-700">Hướng dẫn chọn size</li>
          </ol>
        </nav>

        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm md:p-10">
          <SizeGuideInner headingLevel="h1" variant="page" />
        </div>
      </div>
    </div>
  );
};

export default SizeGuidePage;
