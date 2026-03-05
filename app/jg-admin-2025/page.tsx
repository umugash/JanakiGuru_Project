"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "janaki@admin2025";

type Tab = "products" | "orders" | "addproduct";

interface Product {
  id: string;
  name: string;
  price: number;
  mrp: number;
  wholesale_price?: number;
  category: string | string[];
  image_url: string[];
  video_url?: string;
  keywords: string | string[];
}

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  items: any[];
  total_amount: number;
  created_at: string;
}

const emptyForm = {
  name: "", price: "", mrp: "", wholesale_price: "",
  category: "", image_url: "", video_url: "", keywords: "",
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandOrder, setExpandOrder] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem("jg_admin") === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (authed) { fetchProducts(); fetchOrders(); }
  }, [authed]);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data);
  }

  async function fetchOrders() {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (data) setOrders(data);
  }

  function handleLogin() {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem("jg_admin", "1");
      setAuthed(true);
    } else {
      setPwError("❌ Wrong password!");
      setTimeout(() => setPwError(""), 2000);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("jg_admin");
    setAuthed(false);
  }

  function getCategoryStr(cat: string | string[]) {
    return Array.isArray(cat) ? cat.join(", ") : (cat || "");
  }

  function startEdit(p: Product) {
    setForm({
      name: p.name,
      price: String(p.price),
      mrp: String(p.mrp),
      wholesale_price: p.wholesale_price ? String(p.wholesale_price) : "",
      category: getCategoryStr(p.category),
      image_url: Array.isArray(p.image_url) ? p.image_url.join("\n") : "",
      video_url: p.video_url || "",
      keywords: Array.isArray(p.keywords) ? (p.keywords as string[]).join(", ") : (p.keywords || ""),
    });
    setEditId(p.id);
    setTab("addproduct");
    setMsg({ text: "", type: "" });
    window.scrollTo(0, 0);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditId(null);
    setMsg({ text: "", type: "" });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.mrp || !form.category.trim()) {
      setMsg({ text: "⚠ Please fill Name, Price, MRP and Category", type: "error" });
      return;
    }
    setSaving(true);

    const imageArr = form.image_url.split("\n").map(s => s.trim()).filter(Boolean);
    const keywordsArr = form.keywords.split(",").map(s => s.trim()).filter(Boolean);
    // Multiple categories — split by comma
    const categoryArr = form.category.split(",").map(s => s.trim()).filter(Boolean);

    const payload: any = {
      name: form.name.trim(),
      price: Number(form.price),
      mrp: Number(form.mrp),
      wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
      category: categoryArr.length === 1 ? categoryArr[0] : categoryArr,
      image_url: imageArr,
      video_url: form.video_url.trim() || null,
      keywords: keywordsArr,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("products").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("products").insert([payload]));
    }

    if (error) {
      setMsg({ text: "❌ Error: " + error.message, type: "error" });
    } else {
      setMsg({ text: editId ? "✅ Product updated!" : "✅ Product added!", type: "success" });
      resetForm();
      fetchProducts();
      setTimeout(() => { setTab("products"); setMsg({ text: "", type: "" }); }, 1500);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) { fetchProducts(); setDeleteId(null); }
  }

  if (!isMounted) return null;

  // ── LOGIN ──
  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui,sans-serif", padding: 24,
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24,
          padding: 40, width: "100%", maxWidth: 380, textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Admin Panel</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>Janaki Guru Enterprises</div>
          <input type="password" placeholder="Enter admin password" value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)",
              borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff",
              outline: "none", fontFamily: "system-ui,sans-serif", marginBottom: 12,
            }} />
          {pwError && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 10, fontWeight: 600 }}>{pwError}</div>}
          <button onClick={handleLogin} style={{
            width: "100%", background: "linear-gradient(135deg,#ef4444,#b91c1c)",
            color: "#fff", border: "none", borderRadius: 12, padding: "12px 0",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Login →</button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" }}>

      {/* Top bar */}
      <div style={{
        background: "linear-gradient(135deg,#1a1a2e,#0f3460)", padding: "14px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>⚙ Admin Panel</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Janaki Guru Enterprises</div>
        </div>
        <button onClick={handleLogout} style={{
          background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Logout</button>
      </div>

      {/* Tab bar */}
      <div style={{
        background: "#fff", borderBottom: "2px solid #e2e8f0",
        display: "flex", position: "sticky", top: 52, zIndex: 99,
      }}>
        {([
          { key: "products", label: `📦 Products (${products.length})` },
          { key: "orders", label: `🛒 Orders (${orders.length})` },
          { key: "addproduct", label: editId ? "✏️ Edit" : "➕ Add" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== "addproduct") resetForm(); }} style={{
            flex: 1, padding: "13px 8px", border: "none", background: "none",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            color: tab === t.key ? "#dc2626" : "#64748b",
            borderBottom: tab === t.key ? "3px solid #dc2626" : "3px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "16px 14px 80px" }}>

        {/* ── PRODUCTS ── */}
        {tab === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>All Products</div>
              <button onClick={() => { resetForm(); setTab("addproduct"); }} style={{
                background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff",
                border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>+ Add New</button>
            </div>
            {products.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No products yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {products.map(p => (
                  <div key={p.id} style={{
                    background: "#fff", borderRadius: 14, padding: 14,
                    boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: "#fff5f5", flexShrink: 0, border: "1px solid #fee2e2" }}>
                      {p.image_url?.[0] ? (
                        <img src={p.image_url[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📦</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{getCategoryStr(p.category)}</div>
                      <div style={{ fontSize: 12, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: "#dc2626" }}>₹{p.price}</span>
                        <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>₹{p.mrp}</span>
                        {p.wholesale_price && <span style={{ fontWeight: 700, color: "#0ea5e9" }}>W: ₹{p.wholesale_price}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEdit(p)} style={{
                        background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb",
                        borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>✏️</button>
                      <button onClick={() => setDeleteId(p.id)} style={{
                        background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626",
                        borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 14 }}>All Orders</div>
            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No orders yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map(o => (
                  <div key={o.id} style={{
                    background: "#fff", borderRadius: 14, padding: 14,
                    boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>👤 {o.customer_name}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>📞 {o.phone}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>📍 {o.address}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                          🕐 {new Date(o.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>₹{o.total_amount}</div>
                        <button onClick={() => setExpandOrder(expandOrder === o.id ? null : o.id)} style={{
                          background: "#f1f5f9", border: "none", borderRadius: 8,
                          padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", marginTop: 4, color: "#475569",
                        }}>{expandOrder === o.id ? "Hide" : "View items"}</button>
                      </div>
                    </div>
                    {expandOrder === o.id && (
                      <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 10 }}>
                        {(o.items || []).map((item: any, i: number) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#475569" }}>
                            <span>• {item.name} × {item.quantity}</span>
                            <span style={{ fontWeight: 700, color: "#dc2626" }}>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADD / EDIT PRODUCT ── */}
        {tab === "addproduct" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
              {editId ? "✏️ Edit Product" : "➕ Add New Product"}
            </div>

            {msg.text && (
              <div style={{
                background: msg.type === "success" ? "#f0fdf4" : "#fff5f5",
                border: `1.5px solid ${msg.type === "success" ? "#86efac" : "#fca5a5"}`,
                borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 600,
                color: msg.type === "success" ? "#16a34a" : "#dc2626", marginBottom: 14,
              }}>{msg.text}</div>
            )}

            <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0" }}>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Product Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Apsara Pencil" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Selling Price (₹) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="85" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>MRP (₹) *</label>
                  <input type="number" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })}
                    placeholder="100" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Wholesale Price (₹)</label>
                <input type="number" value={form.wholesale_price} onChange={e => setForm({ ...form, wholesale_price: e.target.value })}
                  placeholder="e.g. 70 (optional)" style={inputStyle} />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Only visible to wholesale customers & store staff.</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Categories * (comma separated for multiple)</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Stationery, School Supplies" style={inputStyle} />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Add multiple categories separated by commas.</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Image URLs (one per line)</label>
                <textarea value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
                  placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
                  rows={4} style={{ ...inputStyle, resize: "vertical" as const }} />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>One direct image URL per line.</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Video URL (optional)</label>
                <input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://example.com/video.mp4" style={inputStyle} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Keywords (comma separated)</label>
                <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })}
                  placeholder="pencil, apsara, writing, school" style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 1, background: saving ? "#f87171" : "linear-gradient(135deg,#ef4444,#b91c1c)",
                  color: "#fff", border: "none", borderRadius: 12, padding: "13px 0",
                  fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                }}>
                  {saving ? "Saving..." : editId ? "💾 Update Product" : "✅ Add Product"}
                </button>
                <button onClick={() => { resetForm(); setTab("products"); }} style={{
                  background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569",
                  borderRadius: 12, padding: "13px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24,
        }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Delete Product?</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>This cannot be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleDelete(deleteId)} style={{
                flex: 1, background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff",
                border: "none", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Yes, Delete</button>
              <button onClick={() => setDeleteId(null)} style={{
                flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569",
                borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", border: "2px solid #e2e8f0", borderRadius: 10,
  padding: "10px 12px", fontSize: 14, fontFamily: "system-ui,sans-serif",
  color: "#1e293b", background: "#f8fafc", outline: "none",
};
