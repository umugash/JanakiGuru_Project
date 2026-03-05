"use client";

import { useState, useEffect, useRef } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  mrp: number;
  category: string | string[];
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

const DURATION = 400;

export default function ProductCard({ product, onAddToCart, cartQuantity, onIncrement, onDecrement }: ProductCardProps) {
  const media: string[] = [
    ...(product.image_url?.filter(Boolean) || []),
    ...(product.video_url ? [product.video_url] : []),
  ];

  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [dir, setDir] = useState<"left" | "right">("left");
  const [animating, setAnimating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fsIndex, setFsIndex] = useState(0);
  const [fsClosing, setFsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);

  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const categories = Array.isArray(product.category)
    ? product.category
    : product.category
      ? product.category.split(",").map((c: string) => c.trim()).filter(Boolean)
      : [];

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

  useEffect(() => {
    if (media.length <= 1) return;
    if (isVideo(media[current])) return;
    timerRef.current = setTimeout(() => {
      slideTo((current + 1) % media.length, "left");
    }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, media.length]);

  const fsPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFsIndex(i => (i - 1 + media.length) % media.length);
  };
  const fsNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFsIndex(i => (i + 1) % media.length);
  };

  const openFullscreen = () => {
    setFsIndex(current);
    setFsClosing(false);
    setFullscreen(true);
    document.body.style.overflow = "hidden";
  };

  const closeFullscreen = () => {
    setFsClosing(true);
    setTimeout(() => {
      setFullscreen(false);
      setFsClosing(false);
      document.body.style.overflow = "";
    }, 280);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeFullscreen(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const currentSrc = media[current] || "";
  const nextSrc = next !== null ? media[next] : "";
  const fsSrc = media[fsIndex] || "";

  const currentAnim = animating
    ? dir === "left" ? `wipeOutLeft ${DURATION}ms ease forwards` : `wipeOutRight ${DURATION}ms ease forwards`
    : "none";
  const nextAnim = animating
    ? dir === "left" ? `wipeInRight ${DURATION}ms ease forwards` : `wipeInLeft ${DURATION}ms ease forwards`
    : "none";

  return (
    <>
      <style>{`
        @keyframes wipeOutLeft { from{transform:translateX(0%)} to{transform:translateX(-100%)} }
        @keyframes wipeOutRight { from{transform:translateX(0%)} to{transform:translateX(100%)} }
        @keyframes wipeInRight { from{transform:translateX(100%)} to{transform:translateX(0%)} }
        @keyframes wipeInLeft { from{transform:translateX(-100%)} to{transform:translateX(0%)} }
        @keyframes fsZoomIn {
          from { opacity:0; transform:scale(0.88); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes fsZoomOut {
          from { opacity:1; transform:scale(1); }
          to   { opacity:0; transform:scale(0.88); }
        }
        @keyframes fsBgIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes fsBgOut {
          from { opacity:1; }
          to   { opacity:0; }
        }
        .fs-content {
          animation: fsZoomIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .fs-content-out {
          animation: fsZoomOut 0.28s ease both;
        }
        .fs-bg {
          animation: fsBgIn 0.28s ease both;
        }
        .fs-bg-out {
          animation: fsBgOut 0.28s ease both;
        }
        .card-img-area:hover .desktop-arrow { opacity: 1 !important; }
        @media (max-width: 640px) {
          .desktop-arrow { display: none !important; }
        }
      `}</style>

      {/* ── FULLSCREEN MODAL ── */}
      {fullscreen && (
        <div
          className={fsClosing ? "fs-bg-out" : "fs-bg"}
          onClick={closeFullscreen}
          style={{
            position: "fixed", inset: 0,
            background: "linear-gradient(160deg, #1a0000 0%, #2d0000 40%, #1a0000 100%)",
            zIndex: 9999,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Top bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            background: "linear-gradient(135deg,#ef4444,#b91c1c)",
            padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            zIndex: 10,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {product.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {media.length > 1 && (
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>
                  {fsIndex + 1} / {media.length}
                </span>
              )}
              <button onClick={closeFullscreen} style={{
                background: "rgba(255,255,255,0.2)", border: "none",
                color: "#fff", borderRadius: "50%", width: 34, height: 34,
                fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
            </div>
          </div>

          {/* Image/Video */}
          <div
            className={fsClosing ? "fs-content-out" : "fs-content"}
            onClick={e => e.stopPropagation()}
            style={{
              width: "90vw", maxWidth: 480,
              background: "#fff",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(239,68,68,0.3), 0 4px 20px rgba(0,0,0,0.5)",
              border: "2px solid rgba(239,68,68,0.4)",
              marginTop: 56,
              marginBottom: 60,
            }}
          >
            {isVideo(fsSrc) ? (
              <video src={fsSrc} controls autoPlay
                style={{ width: "100%", display: "block", maxHeight: "65vh", objectFit: "contain", background: "#000" }}
              />
            ) : (
              <img src={fsSrc} alt={product.name}
                style={{ width: "100%", display: "block", maxHeight: "65vh", objectFit: "contain", padding: 12 }}
              />
            )}
          </div>

          {/* Bottom nav arrows + dots */}
          {media.length > 1 && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: "absolute", bottom: 16, left: 0, right: 0,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
              }}
            >
              <button onClick={fsPrev} style={{
                background: "rgba(239,68,68,0.85)", border: "none", color: "#fff",
                borderRadius: "50%", width: 40, height: 40, fontSize: 20,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>‹</button>

              <div style={{ display: "flex", gap: 6 }}>
                {media.map((_, i) => (
                  <div key={i} onClick={() => setFsIndex(i)} style={{
                    width: i === fsIndex ? 18 : 7, height: 7, borderRadius: 4,
                    background: i === fsIndex ? "#ef4444" : "rgba(255,255,255,0.4)",
                    transition: "all 0.3s ease", cursor: "pointer",
                  }} />
                ))}
              </div>

              <button onClick={fsNext} style={{
                background: "rgba(239,68,68,0.85)", border: "none", color: "#fff",
                borderRadius: "50%", width: 40, height: 40, fontSize: 20,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCT CARD ── */}
      <div style={{
        background: "#fff", borderRadius: 14, overflow: "hidden",
        boxShadow: "0 2px 10px rgba(220,38,38,0.08)", border: "1.5px solid #fee2e2",
        display: "flex", flexDirection: "column",
      }}>

        {/* IMAGE AREA */}
        <div
          className="card-img-area"
          onClick={openFullscreen}
          style={{
            width: "100%", aspectRatio: "1 / 1",
            background: "#fff5f5", position: "relative", overflow: "hidden",
            cursor: "pointer",
          }}
        >
          {media.length === 0 ? (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📦</div>
          ) : (
            <>
              <div style={{ position: "absolute", inset: 0, animation: currentAnim, zIndex: 1 }}>
                {isVideo(currentSrc) ? (
                  <video src={currentSrc} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <img src={currentSrc} alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>
              {animating && next !== null && (
                <div style={{ position: "absolute", inset: 0, animation: nextAnim, zIndex: 2 }}>
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
              padding: "2px 6px", borderRadius: 20, zIndex: 10,
            }}>{discount}% OFF</span>
          )}

          {/* Desktop arrows — hidden on mobile, visible on hover */}
          {media.length > 1 && (
            <>
              <button className="desktop-arrow" onClick={goPrev} style={{
                position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.92)", border: "1.5px solid #fca5a5",
                borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: "#dc2626", fontWeight: 800, zIndex: 10,
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)", opacity: 0,
                transition: "opacity 0.2s ease",
              }}>‹</button>
              <button className="desktop-arrow" onClick={goNext} style={{
                position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.92)", border: "1.5px solid #fca5a5",
                borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: "#dc2626", fontWeight: 800, zIndex: 10,
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)", opacity: 0,
                transition: "opacity 0.2s ease",
              }}>›</button>

              {/* Counter */}
              <div style={{
                position: "absolute", bottom: 6, right: 6,
                background: "rgba(0,0,0,0.45)", color: "#fff",
                fontSize: 10, fontWeight: 700, borderRadius: 10,
                padding: "2px 7px", zIndex: 10,
              }}>{current + 1}/{media.length}</div>

              {/* Dots */}
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
              padding: "2px 6px", zIndex: 10,
            }}>▶ VIDEO</div>
          )}
        </div>

        {/* CARD BODY */}
        <div style={{ padding: "8px 8px 10px", display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3,
            marginBottom: 4, fontFamily: "system-ui,sans-serif",
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
              fontSize: 12, fontWeight: 700, cursor: "pointer",
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
    </>
  );
}
