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
  return !!(url?.match(/\.(mp4|webm|ogg|mov)$/i) || url?.includes("video"));
}

const DURATION = 400; // ms

export default function ProductCard({ product, onAddToCart, cartQuantity, onIncrement, onDecrement }: ProductCardProps) {
  const media: string[] = [
    ...(product.image_url?.filter(Boolean) || []),
    ...(product.video_url ? [product.video_url] : []),
  ];

  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [dir, setDir] = useState<"left" | "right">("left");
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);

  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const slideTo = (nextIdx: number, direction: "left" | "right") => {
    if (lockRef.current || nextIdx === current) return;
    lockRef.current = true;
    setDir(direction);
    setNext(nextIdx);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(nextIdx);
      setNext(null);
      setAnimating(false);
      lockRef.current = false;
    }, DURATION);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    slideTo((current - 1 + media.length) % media.length, "right");
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    slideTo((current + 1) % media.length, "left");
  };

  // Auto slide
  useEffect(() => {
    if (media.length <= 1) return;
    if (isVideo(media[current])) return;
    timerRef.current = setTimeout(() => {
      slideTo((current + 1) % media.length, "left");
    }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, media.length]);

  const currentSrc = media[current] || "";
  const nextSrc = next !== null ? media[next] : "";

  // Wipe animation:
  // current slides OUT to left (or right)
  // next slides IN from right (or left)
  const currentAnim = animating
    ? dir === "left"
      ? `wipeOutLeft ${DURATION}ms ease forwards`
      : `wipeOutRight ${DURATION}ms ease forwards`
    : "none";

  const nextAnim = animating
    ? dir === "left"
      ? `wipeInRight ${DURATION}ms ease forwards`
      : `wipeInLeft ${DURATION}ms ease forwards`
    : "none";

  return (
    <div style={{
      background: "#fff", borderRadius: 14, overflow: "hidden",
      boxShadow: "0 2px 10px rgba(220,38,38,0.08)", border: "1.5px solid #fee2e2",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes wipeOutLeft {
          from { transform: translateX(0%); }
          to   { transform: translateX(-100%); }
        }
        @keyframes wipeOutRight {
          from { transform: translateX(0%); }
          to   { transform: translateX(100%); }
        }
        @keyframes wipeInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0%); }
        }
        @keyframes wipeInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0%); }
        }
      `}</style>

      {/* ── MEDIA AREA ── */}
      <div style={{
        width: "100%", aspectRatio: "1 / 1",
        background: "#fff5f5", position: "relative", overflow: "hidden",
      }}>

        {media.length === 0 ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📦</div>
        ) : (
          <>
            {/* CURRENT image */}
            <div style={{
              position: "absolute", inset: 0,
              animation: currentAnim,
              zIndex: 1,
            }}>
              {isVideo(currentSrc) ? (
                <video src={currentSrc} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <img src={currentSrc} alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>

            {/* NEXT image (only during animation) */}
            {animating && next !== null && (
              <div style={{
                position: "absolute", inset: 0,
                animation: nextAnim,
                zIndex: 2,
              }}>
                {isVideo(nextSrc) ? (
                  <video src={nextSrc} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <img src={nextSrc} alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Discount badge */}
        {discount > 0 && (
          <span style={{
            position: "absolute", top: 6, left: 6,
            background: "linear-gradient(135deg,#ef4444,#b91c1c)",
            color: "#fff", fontSize: 9, fontWeight: 700,
            padding: "2px 6px", borderRadius: 20, fontFamily: "system-ui,sans-serif", zIndex: 10,
          }}>{discount}% OFF</span>
        )}

        {/* Arrows */}
        {media.length > 1 && (
          <>
            <button onClick={goPrev} style={{
              position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.92)", border: "1.5px solid #fca5a5",
              borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#dc2626", fontWeight: 800, zIndex: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)", lineHeight: 1,
            }}>‹</button>

            <button onClick={goNext} style={{
              position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.92)", border: "1.5px solid #fca5a5",
              borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#dc2626", fontWeight: 800, zIndex: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)", lineHeight: 1,
            }}>›</button>

            {/* Counter */}
            <div style={{
              position: "absolute", bottom: 6, right: 6,
              background: "rgba(0,0,0,0.45)", color: "#fff",
              fontSize: 10, fontWeight: 700, borderRadius: 10,
              padding: "2px 7px", fontFamily: "system-ui,sans-serif", zIndex: 10,
            }}>{current + 1}/{media.length}</div>

            {/* Dot indicators */}
            <div style={{
              position: "absolute", bottom: 7, left: "50%", transform: "translateX(-50%)",
              display: "flex", gap: 4, zIndex: 10,
            }}>
              {media.map((_, i) => (
                <div key={i}
                  onClick={e => { e.stopPropagation(); slideTo(i, i > current ? "left" : "right"); }}
                  style={{
                    width: i === current ? 14 : 5, height: 5, borderRadius: 3,
                    background: i === current ? "#ef4444" : "rgba(255,255,255,0.85)",
                    transition: "width 0.3s ease", cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </>
        )}

        {isVideo(currentSrc) && (
          <div style={{
            position: "absolute", bottom: 6, left: 6,
            background: "rgba(220,38,38,0.85)", color: "#fff",
            fontSize: 9, fontWeight: 700, borderRadius: 10,
            padding: "2px 6px", fontFamily: "system-ui,sans-serif", zIndex: 10,
          }}>▶ VIDEO</div>
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
          <span style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>₹{product.price}</span>
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
