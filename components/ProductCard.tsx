"use client";

import { useState, useEffect, useRef } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  mrp: number;
  website_price?: number | string;
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

// ── Parse slash-format price string into array of numbers ──
// "45/420" → [45, 420],  "48" → [48],  45 → [45]
function parseSlashPrices(val: any): number[] {
  if (!val && val !== 0) return [];
  const str = String(val).trim();
  return str.split("/").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
}

// ── Build variant list from various sources ──
// Priority for website display:
//   1. website_price (supports "48/450") → merge with variant labels if available
//   2. variants_text field (e.g. "1 pc:45, 10 pcs:420")
//   3. price_text / price (in-store slash price, e.g. "45/420")
//   4. plain price field
function getVariants(product: any): { label: string; price: number }[] {
  // Parse variants_text for labels
  const variantLabels: { label: string; price: number }[] = [];
  if (product.variants_text) {
    String(product.variants_text).split(",").forEach((v: string) => {
      const parts = v.trim().split(":");
      if (parts.length >= 2) {
        const price = Number(parts[parts.length - 1].trim());
        const label = parts.slice(0, -1).join(":").trim();
        if (label && !isNaN(price) && price > 0) variantLabels.push({ label, price });
      }
    });
  }

  // 1. website_price takes priority for display prices
  const wpPrices = parseSlashPrices(product.website_price);
  if (wpPrices.length > 0) {
    if (wpPrices.length === 1 && variantLabels.length === 0) {
      return [{ label: "", price: wpPrices[0] }];
    }
    // Map website prices onto variant labels if counts match
    if (variantLabels.length > 0) {
      return variantLabels.map((v, i) => ({
        label: v.label,
        price: wpPrices[i] !== undefined ? wpPrices[i] : v.price,
      }));
    }
    // No labels — just return website prices with generic labels
    if (wpPrices.length > 1) {
      return wpPrices.map((p, i) => ({ label: `Option ${i + 1}`, price: p }));
    }
    return [{ label: "", price: wpPrices[0] }];
  }

  // 2. variants_text has explicit labels+prices
  if (variantLabels.length > 0) return variantLabels;

  // 3. price_text slash format e.g. "45/420"
  const pricePrices = parseSlashPrices(product.price_text || product.price);
  if (pricePrices.length > 1) {
    return pricePrices.map((p, i) => ({ label: `Option ${i + 1}`, price: p }));
  }

  // 4. Single price fallback
  const single = Number(product.price);
  if (single > 0) return [{ label: "", price: single }];
  return [];
}

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
  const [downloading, setDownloading] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{ label: string; price: number; index: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const fsTouchStartX = useRef(0);

  const variants = getVariants(product);
  const hasVariants = variants.length > 1;

  // What to show on the card before variant is selected
  const cardDisplayPrice = (() => {
    if (variants.length === 0) return String(product.price);
    return `${variants[0].price}`;
  })();

  const activePrice = selectedVariant ? selectedVariant.price : (variants[0]?.price || product.price);
  const displayPriceNumeric = variants[0]?.price || product.price;

  const discount = !hasVariants && !selectedVariant && product.mrp > displayPriceNumeric
    ? Math.round(((product.mrp - displayPriceNumeric) / product.mrp) * 100)
    : 0;

  const slideTo = (nextIdx: number, direction: "left" | "right") => {
    if (lockRef.current || nextIdx === current) return;
    lockRef.current = true;
    setDir(direction);
    setNext(nextIdx);
    setAnimating(true);
    setTimeout(() => { setCurrent(nextIdx); setNext(null); setAnimating(false); lockRef.current = false; }, DURATION);
  };

  const goPrev = (e: React.MouseEvent) => { e.stopPropagation(); slideTo((current - 1 + media.length) % media.length, "right"); };
  const goNext = (e: React.MouseEvent) => { e.stopPropagation(); slideTo((current + 1) % media.length, "left"); };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 40 && dy < 60) {
      if (dx < 0) slideTo((current + 1) % media.length, "left");
      else slideTo((current - 1 + media.length) % media.length, "right");
    }
  };

  useEffect(() => {
    if (media.length <= 1 || isVideo(media[current])) return;
    timerRef.current = setTimeout(() => slideTo((current + 1) % media.length, "left"), 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, media.length]);

  const fsPrev = (e: React.MouseEvent) => { e.stopPropagation(); setFsIndex(i => (i - 1 + media.length) % media.length); };
  const fsNext = (e: React.MouseEvent) => { e.stopPropagation(); setFsIndex(i => (i + 1) % media.length); };
  const handleFsTouchStart = (e: React.TouchEvent) => { fsTouchStartX.current = e.touches[0].clientX; };
  const handleFsTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - fsTouchStartX.current;
    if (Math.abs(dx) > 50) { if (dx < 0) setFsIndex(i => (i + 1) % media.length); else setFsIndex(i => (i - 1 + media.length) % media.length); }
  };

  const openFullscreen = () => { setFsIndex(current); setFsClosing(false); setFullscreen(true); document.body.style.overflow = "hidden"; };
  const closeFullscreen = () => { setFsClosing(true); setTimeout(() => { setFullscreen(false); setFsClosing(false); document.body.style.overflow = ""; }, 280); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeFullscreen(); };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const url = media[fsIndex];
    if (!url) return;
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = isVideo(url) ? "mp4" : "jpg";
      const filename = product.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_" + (fsIndex + 1) + "." + ext;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
    } catch { window.open(media[fsIndex], "_blank"); }
    setDownloading(false);
  }

  const currentSrc = media[current] || "";
  const nextSrc = next !== null ? media[next] : "";
  const fsSrc = media[fsIndex] || "";

  const currentAnim = animating ? dir === "left" ? `wipeOutLeft ${DURATION}ms ease forwards` : `wipeOutRight ${DURATION}ms ease forwards` : "none";
  const nextAnim = animating ? dir === "left" ? `wipeInRight ${DURATION}ms ease forwards` : `wipeInLeft ${DURATION}ms ease forwards` : "none";

  return (
    <>
      <style>{`
        @keyframes wipeOutLeft { from{transform:translateX(0%)} to{transform:translateX(-100%)} }
        @keyframes wipeOutRight { from{transform:translateX(0%)} to{transform:translateX(100%)} }
        @keyframes wipeInRight { from{transform:translateX(100%)} to{transform:translateX(0%)} }
        @keyframes wipeInLeft { from{transform:translateX(-100%)} to{transform:translateX(0%)} }
        @keyframes fsZoomIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes fsZoomOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(0.88)} }
        @keyframes fsBgIn { from{opacity:0} to{opacity:1} }
        @keyframes fsBgOut { from{opacity:1} to{opacity:0} }
        .fs-content { animation: fsZoomIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
        .fs-content-out { animation: fsZoomOut 0.28s ease both; }
        .fs-bg { animation: fsBgIn 0.28s ease both; }
        .fs-bg-out { animation: fsBgOut 0.28s ease both; }
        .card-img-area:hover .desktop-arrow { opacity: 1 !important; }
        @media (max-width: 640px) { .desktop-arrow { display: none !important; } }
      `}</style>

      {/* FULLSCREEN MODAL */}
      {fullscreen && (
        <div className={fsClosing ? "fs-bg-out" : "fs-bg"} onClick={closeFullscreen} onTouchStart={handleFsTouchStart} onTouchEnd={handleFsTouchEnd}
          style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg,#1a0000,#2d0000,#1a0000)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "linear-gradient(135deg,#ef4444,#b91c1c)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }} onClick={e => e.stopPropagation()}>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {media.length > 1 && <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>{fsIndex + 1}/{media.length}</span>}
              <button onClick={handleDownload} disabled={downloading} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 10, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>{downloading ? "⏳" : "⬇️"} {downloading ? "..." : "Save"}</button>
              <button onClick={closeFullscreen} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 34, height: 34, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>
          <div className={fsClosing ? "fs-content-out" : "fs-content"} onClick={e => e.stopPropagation()}
            style={{ width: "90vw", maxWidth: 480, background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(239,68,68,0.3),0 4px 20px rgba(0,0,0,0.5)", border: "2px solid rgba(239,68,68,0.4)", marginTop: 56, marginBottom: 60 }}>
            {isVideo(fsSrc) ? (
              <video src={fsSrc} controls autoPlay style={{ width: "100%", display: "block", maxHeight: "65vh", objectFit: "contain", background: "#000" }} />
            ) : (
              <img src={fsSrc} alt={product.name} style={{ width: "100%", display: "block", maxHeight: "65vh", objectFit: "contain", padding: 12 }}
                onError={e => { const img = e.target as HTMLImageElement; if (!img.dataset.retried) { img.dataset.retried = "1"; img.src = fsSrc + (fsSrc.includes("?") ? "&" : "?") + "_t=" + Date.now(); } }} />
            )}
          </div>
          {media.length > 1 && (
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 16, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <button onClick={fsPrev} style={{ background: "rgba(239,68,68,0.85)", border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <div style={{ display: "flex", gap: 6 }}>
                {media.map((_, i) => <div key={i} onClick={() => setFsIndex(i)} style={{ width: i === fsIndex ? 18 : 7, height: 7, borderRadius: 4, background: i === fsIndex ? "#ef4444" : "rgba(255,255,255,0.4)", transition: "all 0.3s ease", cursor: "pointer" }} />)}
              </div>
              <button onClick={fsNext} style={{ background: "rgba(239,68,68,0.85)", border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
            </div>
          )}
        </div>
      )}

      {/* PRODUCT CARD */}
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(220,38,38,0.08)", border: "1.5px solid #fee2e2", display: "flex", flexDirection: "column" }}>
        {/* IMAGE AREA */}
        <div className="card-img-area" onClick={openFullscreen} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
          style={{ width: "100%", aspectRatio: "1 / 1", background: "#fff5f5", position: "relative", overflow: "hidden", cursor: "pointer" }}>
          {media.length === 0 ? (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📦</div>
          ) : (
            <>
              <div style={{ position: "absolute", inset: 0, animation: currentAnim, zIndex: 1 }}>
                {isVideo(currentSrc) ? (
                  <video src={currentSrc} style={{ width: "100%", height: "100%", objectFit: "contain" }} onEnded={() => slideTo((current + 1) % media.length, "left")} />
                ) : (
                  <img src={currentSrc} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
              {animating && next !== null && (
                <div style={{ position: "absolute", inset: 0, animation: nextAnim, zIndex: 2 }}>
                  {isVideo(nextSrc) ? <video src={nextSrc} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <img src={nextSrc} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />}
                </div>
              )}
            </>
          )}
          {discount > 0 && <span style={{ position: "absolute", top: 6, left: 6, background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 20, zIndex: 10 }}>{discount}% OFF</span>}
          {media.length > 1 && (
            <>
              <button className="desktop-arrow" onClick={goPrev} style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.92)", border: "1.5px solid #fca5a5", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#dc2626", fontWeight: 800, zIndex: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.12)", opacity: 0, transition: "opacity 0.2s ease" }}>‹</button>
              <button className="desktop-arrow" onClick={goNext} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.92)", border: "1.5px solid #fca5a5", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#dc2626", fontWeight: 800, zIndex: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.12)", opacity: 0, transition: "opacity 0.2s ease" }}>›</button>
              <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 7px", zIndex: 10 }}>{current + 1}/{media.length}</div>
              <div style={{ position: "absolute", bottom: 7, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, zIndex: 10 }}>
                {media.map((_, i) => <div key={i} onClick={e => { e.stopPropagation(); slideTo(i, i > current ? "left" : "right"); }} style={{ width: i === current ? 14 : 5, height: 5, borderRadius: 3, background: i === current ? "#ef4444" : "rgba(255,255,255,0.85)", transition: "width 0.3s ease", cursor: "pointer" }} />)}
              </div>
            </>
          )}
          {isVideo(currentSrc) && (
            <>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(255,255,255,0.92)", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.25)", pointerEvents: "none" }}>
                <div style={{ width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "16px solid #dc2626", marginLeft: 3 }} />
              </div>
              <div style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(220,38,38,0.85)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "2px 6px", zIndex: 10 }}>▶ VIDEO</div>
            </>
          )}
        </div>

        {/* CARD BODY */}
        <div style={{ padding: "8px 8px 10px", display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 4, fontFamily: "system-ui,sans-serif", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.name}</div>

          {/* ── PRICE DISPLAY — no badge, clean ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
            {selectedVariant ? (
              <>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>₹{selectedVariant.price}</span>
                {selectedVariant.label && <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>{selectedVariant.label}</span>}
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>₹{cardDisplayPrice}</span>
                {/* MRP strikethrough only if single price and there's a discount */}
                {!hasVariants && product.mrp > (variants[0]?.price || product.price) && (
                  <span style={{ fontSize: 10, color: "#9ca3af", textDecoration: "line-through" }}>₹{product.mrp}</span>
                )}
              </>
            )}
          </div>

          {cartQuantity === 0 ? (
            <div>
              <button onClick={() => hasVariants ? setShowVariants(true) : onAddToCart(product)} style={{ width: "100%", background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: hasVariants ? 3 : 0 }}>ADD +</button>
              {hasVariants && <button onClick={() => setShowVariants(true)} style={{ width: "100%", background: "none", border: "none", color: "#6b7280", fontSize: 10, fontWeight: 600, cursor: "pointer", padding: "2px 0" }}>{variants.length} options ▼</button>}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff1f1", borderRadius: 8, border: "1.5px solid #fca5a5" }}>
              <button onClick={() => onDecrement(product)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 18, fontWeight: 800, width: 32, height: 30, cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{cartQuantity}</span>
              <button onClick={() => onIncrement(product)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 18, fontWeight: 800, width: 32, height: 30, cursor: "pointer" }}>+</button>
            </div>
          )}

          {/* Variants bottom sheet */}
          {showVariants && hasVariants && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowVariants(false)}>
              <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 16px" }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{product.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Select variant</div>
                {variants.map((v, i) => {
                  const varImg = (product.image_url || [])[i] || (product.image_url || [])[0];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < variants.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      {varImg && <img src={varImg} style={{ width: 52, height: 52, objectFit: "contain", border: "1px solid #fee2e2", borderRadius: 8 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{v.label || `Option ${i + 1}`}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#dc2626" }}>₹{v.price}</div>
                      </div>
                      <button onClick={() => {
                        setSelectedVariant({ label: v.label, price: v.price, index: i });
                        onAddToCart({ ...product, price: v.price, website_price: v.price });
                        setShowVariants(false);
                      }} style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>ADD</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}