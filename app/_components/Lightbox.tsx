"use client";

import { useEffect } from "react";
import type { ProductDTO } from "@/lib/catalog";

/* Xem ảnh sản phẩm nguyên bản. Thẻ sản phẩm ép ảnh vào khung 4:3 / 1:1 nên ảnh dài
   hoặc ngang bị thu nhỏ, thiếu chi tiết — bấm vào ảnh để xem đủ, vừa màn hình. */
export default function Lightbox({ product, onClose }: { product: ProductDTO; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="ovl lightbox" role="dialog" aria-modal="true" aria-label={`Ảnh ${product.name}`} onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="Đóng">
        ×
      </button>
      <figure onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.imageAlt || product.name} />
        <figcaption>
          <b>{product.name}</b>
          {(product.brand || product.summary) && <span>{[product.brand, product.summary].filter(Boolean).join(" · ")}</span>}
        </figcaption>
      </figure>
    </div>
  );
}
