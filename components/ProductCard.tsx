"use client";

import { useState, useEffect, useRef } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  mrp: number;
  category: string;
  image_url: string[];
  video_url?: string;
  keywords: string[];
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  cartQuantity: number;
  onIncrement: (product: Product) => void;
  onDecrement: (product: Product) => void;
}

function isVideo(url: string) {
  return url?.match(/\.(mp4|webm|ogg|mov)$/i) || url?.includes("video");
}

export default function ProductCard({ product, onAddToCart, cartQuantity, onIncrement, onDecrement }: ProductCardProps) {
  // Combine images + video into one media array
  const media: string[] = [
    ...(product.image_url?.filter(Boolean) || []),
    ...(product.video_url ? [product.video_url] : []),
  ];

  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  // Auto slide every 3 seconds (skip if current is video)
  useEffect(() => {
    if (media.length <= 1) return;
    if (isVideo(media[index])) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % media.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [media.length, index]);

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex(i => (i - 1 + media.length) % media.length);
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex(i => (i + 1) % media.length);
  };

  const current = media[index] || "";

  return (
    <div style={{
      background: "#fff", borderRadius: 14, overflow: "hidden",
      boxShadow: "0 2px 10px rgba(220,38,38,0.08)", border: "1.5px solid #fee2e2",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── MEDIA AREA (square) ── */}
      <div style={{
        width: "100%", aspectRatio: "1 / 1",
        background: "#fff5f5", position: "relative", overflow: "hidden",
      }}>

        {/* Media */}
        {media.length === 0 ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📦</div>
        ) : isVideo(current) ? (
          <video
            ref={videoRef}
            src={current}
            controls
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <img
            src={current}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}

        {/* Discount badge */}
        {discount > 0 && (
          <span style={{
            position: "absolute", top: 6, left: 6,
            background: "linear-gradient(135deg,#ef4444,#b91c1c)",
            color: "#fff", fontSize: 9, fontWeight: 700,
            padding: "2px 6px", borderRadius: 20, fontFamily: "system-ui,sans-serif",
            zIndex: 2,
          }}>{discount}% OFF</span>
        )}

        {/* Left / Right arrows — only show if multiple media */}
        {media.length > 1 && (
          <>
            <button onClick={prev} style={{
              position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.92)", border: "1.5px solid #fca5a5",
              borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#dc2626", fontWeight: 800, zIndex: 3,
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            }}>‹</button>

            <button onClick={next} style={{
              position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.92)", border: "1.5px solid #fca5a5",
              borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#dc2626", fontWeight: 800, zIndex: 3,
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            }}>›</button>

            {/* Counter badge e.g. 1/3 */}
            <div style={{
              position: "absolute", bottom: 6, right: 6,
              background: "rgba(0,0,0,0.45)", color: "#fff",
              fontSize: 10, fontWeight: 700, borderRadius: 10,
              padding: "2px 7px", fontFamily: "system-ui,sans-serif", zIndex: 3,
            }}>{index + 1}/{media.length}</div>

            {/* Video indicator */}
            {isVideo(current) && (
              <div style={{
                position: "absolute", bottom: 6, left: 6,
                background: "rgba(220,38,38,0.85)", color: "#fff",
                fontSize: 9, fontWeight: 700, borderRadius: 10,
                padding: "2px 6px", fontFamily: "system-ui,sans-serif", zIndex: 3,
              }}>▶ VIDEO</div>
            )}
          </>
        )}
      </div>

      {/* ── CARD BODY ── */}
      <div style={{ padding: "8px 8px 10px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3,
          marginBottom: 5, fontFamily: "system-ui,sans-serif",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{product.name}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#dc2626", fontFamily: "system-ui,sans-serif" }}>₹{product.price}</span>
          {product.mrp > product.price && (
            <span style={{ fontSize: 10, color: "#9ca3af", textDecoration: "line-through" }}>₹{product.mrp}</span>
          )}
        </div>

        {cartQuantity === 0 ? (
          <button onClick={() => onAddToCart(product)} style={{
            width: "100%", background: "linear-gradient(135deg,#ef4444,#b91c1c)",
            color: "#fff", border: "none", borderRadius: 8, padding: "7px 0",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui,sans-serif",
          }}>ADD +</button>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#fff1f1", borderRadius: 8, border: "1.5px solid #fca5a5",
          }}>
            <button onClick={() => onDecrement(product)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 18, fontWeight: 800, width: 32, height: 30, cursor: "pointer" }}>−</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{cartQuantity}</span>
            <button onClick={() => onIncrement(product)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 18, fontWeight: 800, width: 32, height: 30, cursor: "pointer" }}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}
