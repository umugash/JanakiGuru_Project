"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ProductCard from "./ProductCard";
import StaffLogin from "./StaffLogin";
import { encodePrice, encodeWholesalePrices, parseWholesalePrices, setCachedKey, getCachedKey } from "@/lib/cipher";

function isVideo(url: string) {
  return !!(url?.match(/\.(mp4|webm|ogg|mov)$/i) || url?.includes("video"));
}

function parseCategories(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.flatMap((v: any) => parseCategories(v)).filter(Boolean);
  }
  if (typeof val === "string") {
    let str = val.trim().replace(/\\/g, "");
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.flatMap((v: any) => parseCategories(v)).filter(Boolean);
      if (typeof parsed === "string") return [parsed.trim()].filter(Boolean);
    } catch {}
    str = str.replace(/^[\["']+|[\]"']+$/g, "").trim();
    return str.split(",").map((s: string) => s.replace(/^["'\s\[\]\\]+|["'\s\[\]\\]+$/g, "").trim()).filter(Boolean);
  }
  return [];
}

// IndexedDB helpers
const DB_NAME = "jg_wholesale_cache";
const DB_VERSION = 1;
const STORE_NAME = "products";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

async function saveProductsToDB(products: any[]) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  products.forEach(p => store.put(p));
}

async function getProductsFromDB(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function pricePill(bg: string): React.CSSProperties {
  return {
    display: "inline-block", background: bg, color: "#fff",
    borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700,
    whiteSpace: "nowrap" as const,
  };
}

interface Props {
  staff: any;
  showLogin: boolean;
  onShowLogin: () => void;
  onHideLogin: () => void;
  onStaffChange: (s: any) => void;
  onLogout: () => void;
}

export default function ProductGrid({ staff, showLogin, onShowLogin, onHideLogin, onStaffChange, onLogout }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [debugMsg, setDebugMsg] = useState("");
  const [cipherKey, setCipherKey] = useState("ROYALTIMES");

  // Fullscreen
  const [fsProduct, setFsProduct] = useState<any>(null);
  const [fsIndex, setFsIndex] = useState(0);
  const [fsClosing, setFsClosing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Barcode scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerLoading, setScannerLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      loadProducts(supabase);
      loadCipherKey(supabase);
    });

    // Only trust browser's navigator.onLine for the banner
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Check actual connectivity
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function loadCipherKey(supabase: any) {
    try {
      const { data } = await supabase.from("cipher_settings").select("cipher_key").eq("id", 1).single();
      if (data?.cipher_key) {
        setCipherKey(data.cipher_key.toUpperCase());
        setCachedKey(data.cipher_key.toUpperCase());
      }
    } catch {}
  }

  async function loadProducts(supabase: any) {
    setLoading(true);

    // Always try Supabase FIRST
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,mrp,price,wholesale_price,purchase_price,category,image_url,video_url,keywords,created_at,short_description,long_description,vendors,barcode")
        .order("created_at", { ascending: false });

      if (error) {
        // Show exact Supabase error so we can debug
        setIsOffline(true);
        setDebugMsg("Supabase error: " + error.message + " | code: " + error.code);
        const cached = await getProductsFromDB().catch(() => []);
        if (cached.length > 0) setProducts(cached);
        setLoading(false);
        return;
      }

      if (data && data.length >= 0) {
        setProducts(data);
        setIsOffline(false);
        setDebugMsg("");
        await saveProductsToDB(data);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setDebugMsg("Fetch exception: " + (err?.message || String(err)));
    }

    // Fall back to cache
    try {
      const cached = await getProductsFromDB();
      if (cached.length > 0) { setProducts(cached); setIsOffline(true); }
      else setProducts([]);
    } catch { setProducts([]); }
    setLoading(false);
  }

  // Barcode scanner - uses canvas + BarcodeDetector (most reliable on Android)
  async function openScanner() {
    setScannerOpen(true);
    setScannerError("");
    setScannerLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScannerLoading(false);
      startCanvasDetector();
    } catch {
      setScannerError("Camera access denied. Please allow camera permission and try again.");
      setScannerLoading(false);
    }
  }

  function startCanvasDetector() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let scanning = true;
    let frameCount = 0;

    const hasBarcodeDetector = "BarcodeDetector" in window;
    let detector: any = null;
    if (hasBarcodeDetector) {
      detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "qr_code", "code_128", "code_39", "upc_a", "upc_e", "itf", "codabar", "aztec", "data_matrix"]
      });
    }

    const scan = async () => {
      if (!scanning || !videoRef.current || !ctx) return;
      if (videoRef.current.readyState < 2) {
        // Video not ready yet
        setTimeout(scan, 200);
        return;
      }

      frameCount++;
      // Process every 3rd frame to save CPU
      if (frameCount % 3 !== 0) {
        requestAnimationFrame(scan);
        return;
      }

      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      try {
        if (hasBarcodeDetector && detector) {
          // Use native BarcodeDetector on canvas
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) {
            scanning = false;
            handleBarcodeResult(barcodes[0].rawValue);
            return;
          }
        }
      } catch {}

      if (scanning) requestAnimationFrame(scan);
    };

    // Start scanning after short delay to let camera warm up
    setTimeout(() => requestAnimationFrame(scan), 500);
    scannerRef.current = { stop: () => { scanning = false; } };
  }

  function handleBarcodeResult(barcode: string) {
    closeScanner();
    // Search by barcode field exactly
    const found = products.find(p => p.barcode && p.barcode.trim() === barcode.trim());
    if (found) {
      // Direct match — show only this product
      setSearch(found.name);
      setActiveCategory("All");
    } else {
      // Not found — show barcode in search so user sees "no results" with barcode
      setSearch(barcode);
      setActiveCategory("All");
    }
  }

  function closeScanner() {
    if (scannerRef.current?.stop) scannerRef.current.stop();
    if (scannerRef.current?.reset) scannerRef.current.reset();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
    setScannerError("");
  }

  // Fullscreen
  const openFullscreen = (product: any, index: number) => {
    setFsProduct(product);
    setFsIndex(index);
    setFsClosing(false);
    document.body.style.overflow = "hidden";
    window.history.pushState({ fullscreen: true }, "");
  };

  const closeFullscreen = useCallback(() => {
    setFsClosing(true);
    setTimeout(() => {
      setFsProduct(null);
      setFsClosing(false);
      document.body.style.overflow = "";
    }, 280);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (fsProduct) closeFullscreen();
      if (showLogin) onHideLogin();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [fsProduct, showLogin, closeFullscreen, onHideLogin]);

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (!fsProduct) return;
    const media = [...(fsProduct.image_url || []), ...(fsProduct.video_url ? [fsProduct.video_url] : [])];
    const url = media[fsIndex];
    if (!url) return;
    if (!navigator.onLine) { alert("Internet required to download."); return; }
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = isVideo(url) ? "mp4" : "jpg";
      const filename = fsProduct.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_" + (fsIndex + 1) + "." + ext;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
    } catch { window.open(url, "_blank"); }
    setDownloading(false);
  }

  const getFsMedia = () => {
    if (!fsProduct) return [];
    return [...(fsProduct.image_url || []), ...(fsProduct.video_url ? [fsProduct.video_url] : [])];
  };
  const fsMedia = getFsMedia();
  const fsSrc = fsMedia[fsIndex] || "";

  const allCategories = ["All", ...Array.from(new Set(products.flatMap(p => parseCategories(p.category)))).sort()];

  const filtered = products.filter(p => {
    const cats = parseCategories(p.category);
    const matchCat = activeCategory === "All" || cats.includes(activeCategory);
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      p.name?.toLowerCase().includes(q) ||
      (p.keywords || []).some((k: string) => k?.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase() === q);
    return matchCat && matchSearch;
  });

  const wsLabels = ["Single", "Bundle", "Pack", "Bulk", "Special"];

  return (
    <div style={{ minHeight: "100dvh", background: "#fff9f9", fontFamily: "system-ui,sans-serif" }}>
      {isOffline && (
        <div style={{ background: "#fef3c7", borderBottom: "1px solid #f59e0b", padding: "6px 16px", textAlign: "center", fontSize: 12, color: "#92400e" }}>
          📴 Offline — showing cached data
        </div>
      )}
      {debugMsg && (
        <div style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5", padding: "6px 16px", fontSize: 11, color: "#dc2626", wordBreak: "break-all" }}>
          🔴 {debugMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "linear-gradient(135deg,#ef4444,#b91c1c)", padding: "12px 16px 10px", boxShadow: "0 2px 12px rgba(185,28,28,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>🏬 JG Wholesale</div>
            {staff && <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>👤 {staff.name}</div>}
          </div>
          {staff ? (
            <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Logout</button>
          ) : (
            <button onClick={onShowLogin} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔐 Staff Login</button>
          )}
        </div>

        {/* Search + Barcode */}
        <div style={{ position: "relative", display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 32px", borderRadius: 12, border: "none", fontSize: 13, outline: "none", background: "rgba(255,255,255,0.95)" }}
            />
          </div>
          {/* Barcode button */}
          <button
            onClick={openScanner}
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 12, padding: "9px 14px", fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Scan barcode"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="3" height="16"/><rect x="6" y="4" width="1" height="16"/>
              <rect x="9" y="4" width="2" height="16"/><rect x="13" y="4" width="1" height="16"/>
              <rect x="16" y="4" width="3" height="16"/><rect x="21" y="4" width="2" height="16"/>
              <line x1="1" y1="20" x2="4" y2="20"/><line x1="1" y1="4" x2="4" y2="4"/>
              <line x1="20" y1="20" x2="23" y2="20"/><line x1="20" y1="4" x2="23" y2="4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Category chips */}
      {allCategories.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 16px", scrollbarWidth: "none", background: "#fff", borderBottom: "1px solid #fee2e2" }}>
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              flexShrink: 0, padding: "5px 14px", borderRadius: 20,
              border: activeCategory === cat ? "none" : "1.5px solid #fca5a5",
              background: activeCategory === cat ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "#fff",
              color: activeCategory === cat ? "#fff" : "#dc2626",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>{cat}</button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div style={{ padding: "12px 10px", paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div>Loading products...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No products found</div>
            {search && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>Searched: "{search}"</div>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} staff={staff} cipherKey={cipherKey} onImageClick={(idx) => openFullscreen(p, idx)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #fee2e2", padding: "8px 16px", textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* ── BARCODE SCANNER MODAL ── */}
      {scannerOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", flexDirection: "column" }}>
          {/* Scanner header */}
          <div style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>📷 Scan Barcode</div>
            <button onClick={closeScanner} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Camera view */}
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted />

            {/* Scan overlay */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 260, height: 160, position: "relative" }}>
                {/* Corner markers */}
                {[["0,0","0,0"],["auto,0","0,0"],["0,auto","0,0"],["auto,auto","0,0"]].map((_, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    top: i < 2 ? 0 : "auto", bottom: i >= 2 ? 0 : "auto",
                    left: i % 2 === 0 ? 0 : "auto", right: i % 2 === 1 ? 0 : "auto",
                    width: 24, height: 24,
                    borderTop: i < 2 ? "3px solid #ef4444" : "none",
                    borderBottom: i >= 2 ? "3px solid #ef4444" : "none",
                    borderLeft: i % 2 === 0 ? "3px solid #ef4444" : "none",
                    borderRight: i % 2 === 1 ? "3px solid #ef4444" : "none",
                  }} />
                ))}
                {/* Scan line animation */}
                <div style={{
                  position: "absolute", left: 0, right: 0, height: 2,
                  background: "rgba(239,68,68,0.8)",
                  animation: "scanLine 1.5s ease-in-out infinite",
                  top: "50%",
                }} />
              </div>
            </div>

            {scannerLoading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: 14, marginBottom: 8 }}>⏳ Starting camera...</div>
              </div>
            )}

            {scannerError && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ color: "#f87171", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{scannerError}</div>
                <button onClick={closeScanner} style={{ background: "#ef4444", border: "none", color: "#fff", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Close</button>
              </div>
            )}
          </div>

          <div style={{ background: "#111", padding: "12px 16px", textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              📷 Point camera at barcode
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
              Hold steady — scanning automatically
            </div>
          </div>

          <style>{`
            @keyframes scanLine {
              0% { top: 10%; }
              50% { top: 90%; }
              100% { top: 10%; }
            }
          `}</style>
        </div>
      )}

      {/* ── FULLSCREEN VIEWER ── */}
      {fsProduct && (
        <div className={fsClosing ? "fs-bg-out" : "fs-bg"}
          style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg,#1a0000,#2d0000,#1a0000)", zIndex: 9998, display: "flex", flexDirection: "column", overflowY: "auto" }}
          onClick={closeFullscreen}
        >
          <style>{`
            @keyframes fsBgIn { from{opacity:0} to{opacity:1} }
            @keyframes fsBgOut { from{opacity:1} to{opacity:0} }
            .fs-bg { animation: fsBgIn 0.25s ease both; }
            .fs-bg-out { animation: fsBgOut 0.25s ease both; }
          `}</style>

          {/* Top bar */}
          <div onClick={e => e.stopPropagation()} style={{ position: "sticky", top: 0, zIndex: 10, background: "linear-gradient(135deg,#ef4444,#b91c1c)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <button onClick={closeFullscreen} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fsProduct.name}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
              {fsMedia.length > 1 && <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>{fsIndex + 1}/{fsMedia.length}</span>}
              <button onClick={handleDownload} disabled={downloading} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                {downloading ? "⏳" : "⬇️"} {downloading ? "..." : "Save"}
              </button>
              <button onClick={closeFullscreen} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>

          {/* Media */}
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#000" }}>
            {isVideo(fsSrc) ? (
              <video src={fsSrc} controls autoPlay style={{ width: "100%", maxHeight: "55vh", objectFit: "contain", display: "block" }} />
            ) : (
              <img src={fsSrc} alt={fsProduct.name} style={{ width: "100%", maxHeight: "55vh", objectFit: "contain", display: "block", padding: 8, boxSizing: "border-box" }} />
            )}
          </div>

          {/* Nav */}
          {fsMedia.length > 1 && (
            <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "10px 0" }}>
              <button onClick={e => { e.stopPropagation(); setFsIndex(i => (i - 1 + fsMedia.length) % fsMedia.length); }} style={{ background: "rgba(239,68,68,0.85)", border: "none", color: "#fff", borderRadius: "50%", width: 38, height: 38, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <div style={{ display: "flex", gap: 6 }}>
                {fsMedia.map((_, i) => (
                  <div key={i} onClick={() => setFsIndex(i)} style={{ width: i === fsIndex ? 18 : 7, height: 7, borderRadius: 4, background: i === fsIndex ? "#ef4444" : "rgba(255,255,255,0.4)", transition: "all 0.3s ease", cursor: "pointer" }} />
                ))}
              </div>
              <button onClick={e => { e.stopPropagation(); setFsIndex(i => (i + 1) % fsMedia.length); }} style={{ background: "rgba(239,68,68,0.85)", border: "none", color: "#fff", borderRadius: "50%", width: 38, height: 38, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
            </div>
          )}

          {/* Description */}
          {(fsProduct.short_description || fsProduct.long_description) && (
            <div onClick={e => e.stopPropagation()} style={{ margin: "0 12px 12px", background: "rgba(255,255,255,0.08)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>📋 DESCRIPTION</div>
              {fsProduct.short_description && <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: fsProduct.long_description ? 8 : 0, lineHeight: 1.5 }}>{fsProduct.short_description}</div>}
              {fsProduct.long_description && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{fsProduct.long_description}</div>}
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      )}

      {showLogin && <StaffLogin onSuccess={onStaffChange} onClose={onHideLogin} />}
    </div>
  );
}