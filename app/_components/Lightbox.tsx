"use client";

import { useEffect, useState } from "react";
import type { ProductDTO } from "@/lib/catalog";

// Toàn bộ ảnh của sản phẩm theo thứ tự hiển thị: ảnh chính trước, rồi ảnh phụ.
export const productImages = (p: ProductDTO) => [p.imageUrl, ...p.images].filter(Boolean);

/* Xem ảnh sản phẩm nguyên bản. Thẻ sản phẩm ép ảnh vào khung 4:3 / 1:1 nên ảnh dài
   hoặc ngang bị thu nhỏ, thiếu chi tiết — bấm vào ảnh để xem đủ, vừa màn hình.
   Nhiều ảnh: ← → / nút hai bên / vuốt (scroll-snap) để chuyển. */
export default function Lightbox({ product, index = 0, onClose }: { product: ProductDTO; index?: number; onClose: () => void }) {
  const images = productImages(product);
  const [i, setI] = useState(Math.min(index, Math.max(0, images.length - 1)));
  const many = images.length > 1;
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (many && e.key === "ArrowRight") go(1);
      else if (many && e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, many]);

  return (
    <div className="ovl lightbox" role="dialog" aria-modal="true" aria-label={`Ảnh ${product.name}`} onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="Đóng">
        ×
      </button>
      {many && (
        <>
          <button className="lb-nav prev" aria-label="Ảnh trước" onClick={(e) => (e.stopPropagation(), go(-1))}>
            ‹
          </button>
          <button className="lb-nav next" aria-label="Ảnh sau" onClick={(e) => (e.stopPropagation(), go(1))}>
            ›
          </button>
        </>
      )}
      <figure onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={images[i]} src={images[i]} alt={product.imageAlt || product.name} />
        <figcaption>
          <b>{product.name}</b>
          {(product.brand || product.summary) && <span>{[product.brand, product.summary].filter(Boolean).join(" · ")}</span>}
          {many && (
            <span className="lb-count">
              {i + 1} / {images.length}
            </span>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
