"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "janaki@admin2025";
type Tab = "products" | "orders" | "staff" | "addproduct" | "settings";

interface Vendor { name: string; price: string; }

interface Product {
  id: string; name: string; price: number; mrp: number;
  wholesale_price?: number; purchase_price?: number;
  category: string | string[]; image_url: string[];
  video_url?: string; keywords: string | string[];
  short_description?: string; long_description?: string;
  vendors?: { name: string; price: number }[];
}
interface Order {
  id: string; customer_name: string; phone: string; address: string;
  items: any[]; total_amount: number; created_at: string;
}
interface StaffUser {
  id: string; name: string; password: string; status: string; created_at: string;
}

const emptyForm = {
  name: "", price: "", mrp: "", wholesale_price: "", purchase_price: "",
  category: "", image_url: "", video_url: "", keywords: "",
  short_description: "", long_description: "",
};
const emptyStaffForm = { name: "", password: "" };

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandOrder, setExpandOrder] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [staffEditId, setStaffEditId] = useState<string | null>(null);
  const [staffMsg, setStaffMsg] = useState({ text: "", type: "" });
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState<string | null>(null);
  // Cipher settings
  const [cipherKey, setCipherKey] = useState("ROYALTIMES");
  const [cipherInput, setCipherInput] = useState("");
  const [cipherMsg, setCipherMsg] = useState({ text: "", type: "" });
  const [cipherLoading, setCipherLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem("jg_admin") === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (authed) { fetchProducts(); fetchOrders(); fetchStaff(); fetchCipherKey(); }
  }, [authed]);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data);
  }
  async function fetchOrders() {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (data) setOrders(data);
  }
  async function fetchStaff() {
    const { data } = await supabase.from("staff_users").select("*").order("created_at", { ascending: false });
    if (data) setStaffUsers(data);
  }

  async function fetchCipherKey() {
    const { data } = await supabase.from("cipher_settings").select("cipher_key").eq("id", 1).single();
    if (data?.cipher_key) { setCipherKey(data.cipher_key.toUpperCase()); setCipherInput(data.cipher_key.toUpperCase()); }
  }

  async function saveCipherKey() {
    const key = cipherInput.trim().toUpperCase();
    if (key.length !== 10) { setCipherMsg({ text: "❌ Key must be exactly 10 characters (one per digit 0-9)", type: "error" }); return; }
    if (new Set(key).size !== 10) { setCipherMsg({ text: "❌ All 10 characters must be unique", type: "error" }); return; }
    setCipherLoading(true);
    const { error } = await supabase.from("cipher_settings").update({ cipher_key: key }).eq("id", 1);
    if (error) setCipherMsg({ text: "❌ Failed to save: " + error.message, type: "error" });
    else { setCipherKey(key); setCipherMsg({ text: "✅ Cipher key updated! Staff will see new codes on next app open.", type: "success" }); }
    setCipherLoading(false);
  }

  async function handleSaveStaff() {
    if (!staffForm.name.trim() || !staffForm.password.trim()) {
      setStaffMsg({ text: "⚠ Please enter both name and password", type: "error" }); return;
    }
    setSaving(true);
    setStaffMsg({ text: "", type: "" });
    const payload = { name: staffForm.name.trim(), password: staffForm.password.trim(), status: "active" };
    let error;
    if (staffEditId) {
      ({ error } = await supabase.from("staff_users").update(payload).eq("id", staffEditId));
    } else {
      ({ error } = await supabase.from("staff_users").insert([payload]));
    }
    if (error) setStaffMsg({ text: "❌ " + error.message, type: "error" });
    else {
      setStaffMsg({ text: staffEditId ? "✅ Updated!" : "✅ Staff added!", type: "success" });
      setStaffForm(emptyStaffForm); setStaffEditId(null); setShowStaffForm(false);
      fetchStaff();
    }
    setSaving(false);
  }

  async function revokeStaff(id: string) {
    await supabase.from("staff_users").update({ status: "revoked" }).eq("id", id);
    fetchStaff();
  }
  async function reactivateStaff(id: string) {
    await supabase.from("staff_users").update({ status: "active" }).eq("id", id);
    fetchStaff();
  }
  async function deleteStaffUser(id: string) {
    await supabase.from("staff_users").delete().eq("id", id);
    fetchStaff();
  }

  function handleLogin() {
    if (pw === ADMIN_PASSWORD) { sessionStorage.setItem("jg_admin", "1"); setAuthed(true); }
    else { setPwError("❌ Wrong password!"); setTimeout(() => setPwError(""), 2000); }
  }

  function getCatStr(cat: any): string {
    if (!cat) return "";
    // Already array
    if (Array.isArray(cat)) {
      return cat.map(String).map(s => s.replace(/^["\[\]\\]+|["\[\]\\]+$/g, "").trim()).filter(Boolean).join(", ");
    }
    if (typeof cat === "string") {
      let str = cat.trim().replace(/\\/g, "");
      // Try JSON parse
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          return parsed.map(String).map(s => s.replace(/^["\[\]\\]+|["\[\]\\]+$/g, "").trim()).filter(Boolean).join(", ");
        }
        if (typeof parsed === "string") return parsed.trim();
      } catch {}
      // Strip brackets and quotes
      str = str.replace(/^[\["']+|[\]"']+$/g, "").trim();
      return str.split(",").map(s => s.replace(/^["'\s]+|["'\s]+$/g, "").trim()).filter(Boolean).join(", ");
    }
    return "";
  }

  function addVendor() {
    if (vendors.length >= 5) return;
    setVendors(v => [...v, { name: "", price: "" }]);
  }

  function removeVendor(index: number) {
    setVendors(v => v.filter((_, i) => i !== index));
  }

  function updateVendor(index: number, field: "name" | "price", value: string) {
    setVendors(v => v.map((vendor, i) => i === index ? { ...vendor, [field]: value } : vendor));
  }

  function startEdit(p: Product) {
    setForm({
      name: p.name, price: String(p.price), mrp: String(p.mrp),
      wholesale_price: p.wholesale_price ? String(p.wholesale_price) : "",
      purchase_price: p.purchase_price ? String(p.purchase_price) : "",
      category: getCatStr(p.category),
      image_url: Array.isArray(p.image_url) ? p.image_url.join("\n") : "",
      video_url: p.video_url || "",
      keywords: Array.isArray(p.keywords) ? (p.keywords as string[]).join(", ") : (p.keywords || ""),
      short_description: (p as any).short_description || "",
      long_description: (p as any).long_description || "",
    });
    // Load vendors
    const existingVendors = Array.isArray((p as any).vendors) ? (p as any).vendors : [];
    setVendors(existingVendors.map((v: any) => ({ name: v.name, price: String(v.price) })));
    setEditId(p.id); setTab("addproduct"); setMsg({ text: "", type: "" });
    window.scrollTo(0, 0);
  }

  function resetForm() {
    setForm(emptyForm);
    setVendors([]);
    setEditId(null);
    setMsg({ text: "", type: "" });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.mrp || !form.category.trim()) {
      setMsg({ text: "⚠ Please fill Name, Price, MRP and Category", type: "error" }); return;
    }
    setSaving(true);

    // Build vendors array (filter out incomplete entries)
    const vendorArr = vendors
      .filter(v => v.name.trim() && v.price)
      .map(v => ({ name: v.name.trim(), price: Number(v.price) }));

    // Always clean the category before saving
    const categoryArr = form.category
      .replace(/^[\["']+|[\]"']+$/g, "")  // strip outer brackets/quotes
      .split(",")
      .map(s => s.replace(/^["'\s\[\]\\]+|["'\s\[\]\\]+$/g, "").trim())
      .filter(Boolean);
    const payload: any = {
      name: form.name.trim(), price: Number(form.price), mrp: Number(form.mrp),
      wholesale_price: form.wholesale_price ? form.wholesale_price.trim() : null,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      category: categoryArr,
      image_url: form.image_url.split("\n").map(s => s.trim()).filter(Boolean),
      video_url: form.video_url.trim() || null,
      keywords: form.keywords.split(",").map(s => s.trim()).filter(Boolean),
      short_description: form.short_description.trim() || null,
      long_description: form.long_description.trim() || null,
      vendors: vendorArr.length > 0 ? vendorArr : [],
    };

    let error;
    if (editId) ({ error } = await supabase.from("products").update(payload).eq("id", editId));
    else ({ error } = await supabase.from("products").insert([payload]));

    if (error) {
      setMsg({ text: "❌ Error: " + error.message, type: "error" });
      setSaving(false);
    } else {
      setMsg({ text: editId ? "✅ Updated!" : "✅ Product added!", type: "success" });
      fetchProducts();
      setSaving(false);
      setTimeout(() => {
        resetForm();
        setTab("products");
        setMsg({ text: "", type: "" });
      }, 1500);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("products").delete().eq("id", id);
    fetchProducts(); setDeleteId(null);
  }

  const activeStaff = staffUsers.filter(s => s.status === "active");
  const revokedStaff = staffUsers.filter(s => s.status === "revoked");

  if (!isMounted) return null;

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif", padding: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 40, width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Admin Panel</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>Janaki Guru Enterprises</div>
          <input type="password" placeholder="Enter admin password" value={pw}
            onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "system-ui,sans-serif", marginBottom: 12, boxSizing: "border-box" }} />
          {pwError && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 10, fontWeight: 600 }}>{pwError}</div>}
          <button onClick={handleLogin} style={{ width: "100%", background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Login →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#0f3460)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>⚙ Admin Panel</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Janaki Guru Enterprises</div>
        </div>
        <button onClick={() => { sessionStorage.removeItem("jg_admin"); setAuthed(false); }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "2px solid #e2e8f0", display: "flex", position: "sticky", top: 52, zIndex: 99 }}>
        {([
          { key: "products", label: `📦 Products (${products.length})` },
          { key: "orders", label: `🛒 Orders (${orders.length})` },
          { key: "staff", label: `👥 Staff (${activeStaff.length})` },
          { key: "addproduct", label: editId ? "✏️ Edit" : "➕ Add" },
          { key: "settings", label: "⚙️ Settings" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== "addproduct") resetForm(); }} style={{
            flex: 1, padding: "11px 4px", border: "none", background: "none",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
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
              <button onClick={() => { resetForm(); setTab("addproduct"); }} style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add New</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {products.map(p => (
                <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: "#fff5f5", flexShrink: 0, border: "1px solid #fee2e2" }}>
                    {p.image_url?.[0] ? <img src={p.image_url[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📦</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{getCatStr(p.category)}</div>
                    <div style={{ fontSize: 11, marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "#dc2626" }}>₹{p.price}</span>
                      <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>₹{p.mrp}</span>
                      {p.wholesale_price && <span style={{ fontWeight: 700, color: "#0ea5e9" }}>W:₹{p.wholesale_price}</span>}
                      {p.purchase_price && <span style={{ fontWeight: 700, color: "#16a34a" }}>P:₹{p.purchase_price}</span>}
                      {Array.isArray((p as any).vendors) && (p as any).vendors.length > 0 && (
                        <span style={{ fontWeight: 600, color: "#8b5cf6" }}>🏪 {(p as any).vendors.length} vendor{(p as any).vendors.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => startEdit(p)} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => setDeleteId(p.id)} style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 14 }}>All Orders</div>
            {orders.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No orders yet.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map(o => (
                  <div key={o.id} style={{ background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>👤 {o.customer_name}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>📞 {o.phone}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>📍 {o.address}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>🕐 {new Date(o.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>₹{o.total_amount}</div>
                        <button onClick={() => setExpandOrder(expandOrder === o.id ? null : o.id)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", marginTop: 4, color: "#475569" }}>{expandOrder === o.id ? "Hide" : "View items"}</button>
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

        {/* ── STAFF ── */}
        {tab === "staff" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>👥 Wholesale Staff</div>
              <button onClick={() => { setStaffForm(emptyStaffForm); setStaffEditId(null); setShowStaffForm(true); setStaffMsg({ text: "", type: "" }); }} style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Staff</button>
            </div>

            {showStaffForm && (
              <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "2px solid #fca5a5", marginBottom: 16, boxShadow: "0 2px 12px rgba(220,38,38,0.1)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>{staffEditId ? "✏️ Edit Staff" : "➕ New Staff Account"}</div>
                {staffMsg.text && (
                  <div style={{ background: staffMsg.type === "success" ? "#f0fdf4" : "#fff5f5", border: `1.5px solid ${staffMsg.type === "success" ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: staffMsg.type === "success" ? "#16a34a" : "#dc2626", marginBottom: 10 }}>{staffMsg.text}</div>
                )}
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Staff Name</label>
                  <input value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="e.g. Surendhar" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Password</label>
                  <input value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="Set a password for this staff" style={inputStyle} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSaveStaff} disabled={saving} style={{ flex: 1, background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving..." : staffEditId ? "Update" : "Add Staff"}</button>
                  <button onClick={() => { setShowStaffForm(false); setStaffForm(emptyStaffForm); setStaffEditId(null); }} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {activeStaff.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 8 }}>✅ ACTIVE ({activeStaff.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeStaff.map(s => (
                    <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>👤 {s.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                          Password:
                          {showStaffPassword === s.id ? <span style={{ color: "#475569", fontWeight: 600 }}>{s.password}</span> : <span>••••••</span>}
                          <button onClick={() => setShowStaffPassword(showStaffPassword === s.id ? null : s.id)} style={{ background: "none", border: "none", fontSize: 11, color: "#94a3b8", cursor: "pointer", padding: 0 }}>{showStaffPassword === s.id ? "hide" : "show"}</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setStaffForm({ name: s.name, password: s.password }); setStaffEditId(s.id); setShowStaffForm(true); }} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️</button>
                        <button onClick={() => revokeStaff(s.id)} style={{ background: "#fff5f5", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Revoke</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {revokedStaff.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>🚫 REVOKED ({revokedStaff.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {revokedStaff.map(s => (
                    <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>👤 {s.name}</div>
                        <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, marginTop: 2 }}>Access revoked</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => reactivateStaff(s.id)} style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Re-activate</button>
                        <button onClick={() => deleteStaffUser(s.id)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8", borderRadius: 8, padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {staffUsers.length === 0 && !showStaffForm && (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No staff added yet.</div>
            )}
          </div>
        )}

        {/* ── ADD / EDIT PRODUCT ── */}
        {tab === "addproduct" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>{editId ? "✏️ Edit Product" : "➕ Add New Product"}</div>
            {msg.text && (
              <div style={{ background: msg.type === "success" ? "#f0fdf4" : "#fff5f5", border: `1.5px solid ${msg.type === "success" ? "#86efac" : "#fca5a5"}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: msg.type === "success" ? "#16a34a" : "#dc2626", marginBottom: 14 }}>{msg.text}</div>
            )}
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0" }}>

              {/* Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Product Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Apsara Pencil" style={inputStyle} />
              </div>

              {/* Prices */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Selling Price (₹) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="85" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>MRP (₹) *</label>
                  <input type="number" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} placeholder="100" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Wholesale Price (₹)</label>
                  <input type="text" value={form.wholesale_price} onChange={e => setForm({ ...form, wholesale_price: e.target.value })} placeholder="70 or 70/700 for multiple" style={inputStyle} />
                  <div style={{ fontSize: 10, color: "#7c3aed", marginTop: 3 }}>Use slash for multiple: 220/2000 = Single/Bundle</div>
                </div>
                <div>
                  <label style={labelStyle}>Purchase Price (₹)</label>
                  <input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} placeholder="60" style={inputStyle} />
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>Staff-only</div>
                </div>
              </div>

              {/* ── VENDOR PRICES ── */}
              <div style={{ marginBottom: 14, background: "#f8f4ff", borderRadius: 12, padding: 14, border: "1.5px solid #e9d5ff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <label style={{ ...labelStyle, color: "#7c3aed", marginBottom: 0 }}>🏪 Vendor Prices ({vendors.length}/5)</label>
                  {vendors.length < 5 && (
                    <button onClick={addVendor} style={{
                      background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff",
                      border: "none", borderRadius: 8, padding: "5px 12px",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>+ Add Vendor</button>
                  )}
                </div>

                {vendors.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "8px 0" }}>
                    No vendors added. Click "+ Add Vendor" to add up to 5 vendor prices.
                  </div>
                )}

                {vendors.map((v, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                      {i === 0 && <label style={{ ...labelStyle, fontSize: 10 }}>Vendor Name</label>}
                      <input
                        value={v.name}
                        onChange={e => updateVendor(i, "name", e.target.value)}
                        placeholder={`Vendor ${i + 1} name`}
                        style={{ ...inputStyle, background: "#fff" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      {i === 0 && <label style={{ ...labelStyle, fontSize: 10 }}>Price (₹)</label>}
                      <input
                        type="number"
                        value={v.price}
                        onChange={e => updateVendor(i, "price", e.target.value)}
                        placeholder="0"
                        style={{ ...inputStyle, background: "#fff" }}
                      />
                    </div>
                    <button onClick={() => removeVendor(i)} style={{
                      background: "#fff5f5", border: "1px solid #fca5a5",
                      color: "#dc2626", borderRadius: 8, padding: "10px 10px",
                      fontSize: 14, cursor: "pointer", flexShrink: 0,
                      marginBottom: 0,
                    }}>✕</button>
                  </div>
                ))}
              </div>

              {/* Category */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Categories * (comma separated)</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Stationery, School Supplies" style={inputStyle} />
              </div>

              {/* Images */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Image URLs (one per line)</label>
                <textarea value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder={"https://example.com/img1.jpg\nhttps://example.com/img2.jpg"} rows={4} style={{ ...inputStyle, resize: "vertical" as const }} />
              </div>

              {/* Video */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Video URL (optional)</label>
                <input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://example.com/video.mp4" style={inputStyle} />
              </div>

              {/* Keywords */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Keywords (comma separated)</label>
                <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} placeholder="pencil, apsara, writing, school" style={inputStyle} />
              </div>

              {/* ── DESCRIPTIONS ── */}
              <div style={{ marginBottom: 14, background: "#f0fdf4", borderRadius: 12, padding: 14, border: "1.5px solid #86efac" }}>
                <label style={{ ...labelStyle, color: "#16a34a", marginBottom: 10, display: "block" }}>📋 Product Description</label>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ ...labelStyle, fontSize: 10 }}>Short Description (1-2 lines)</label>
                  <input
                    value={form.short_description}
                    onChange={e => setForm({ ...form, short_description: e.target.value })}
                    placeholder="e.g. Premium quality pencil, HB grade, smooth writing"
                    style={{ ...inputStyle, background: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 10 }}>Long Description (full details)</label>
                  <textarea
                    value={form.long_description}
                    onChange={e => setForm({ ...form, long_description: e.target.value })}
                    placeholder="Enter full product details, specifications, usage, etc."
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" as const, background: "#fff" }}
                  />
                </div>
              </div>

              {/* Save buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: saving ? "#f87171" : "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving..." : editId ? "💾 Update" : "✅ Add Product"}
                </button>
                <button onClick={() => { resetForm(); setTab("products"); }} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 12, padding: "13px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>⚙️ Settings</div>

            {/* Cipher Key Section */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>🔐 ROYALTIMES Cipher Key</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
                This 10-character key encodes W/S and Purchase prices in the app. Each character represents a digit (0-9). Default: <strong>ROYALTIMES</strong>
                <br/>1=R, 2=O, 3=Y, 4=A, 5=L, 6=T, 7=I, 8=M, 9=E, 0=S
              </div>

              <div style={{ background: "#f8f4ff", borderRadius: 10, padding: 12, marginBottom: 14, border: "1px solid #e9d5ff" }}>
                <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, marginBottom: 6 }}>CURRENT KEY</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {cipherKey.split("").map((ch, i) => (
                    <div key={i} style={{ background: "#7c3aed", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 800, textAlign: "center", minWidth: 32 }}>
                      <div style={{ fontSize: 9, opacity: 0.8 }}>{(i + 1) % 10}</div>
                      <div>{ch}</div>
                    </div>
                  ))}
                </div>
              </div>

              {cipherMsg.text && (
                <div style={{ background: cipherMsg.type === "success" ? "#f0fdf4" : "#fff5f5", border: `1.5px solid ${cipherMsg.type === "success" ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: cipherMsg.type === "success" ? "#16a34a" : "#dc2626", marginBottom: 12 }}>{cipherMsg.text}</div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>New Cipher Key (exactly 10 unique characters)</label>
                <input
                  value={cipherInput}
                  onChange={e => { setCipherInput(e.target.value.toUpperCase()); setCipherMsg({ text: "", type: "" }); }}
                  placeholder="ROYALTIMES"
                  maxLength={10}
                  style={{ ...inputStyle, fontFamily: "monospace", fontSize: 18, letterSpacing: 4, textTransform: "uppercase" }}
                />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  {cipherInput.length}/10 characters
                  {cipherInput.length === 10 && new Set(cipherInput).size === 10 && <span style={{ color: "#16a34a", marginLeft: 8 }}>✅ Valid key</span>}
                  {cipherInput.length === 10 && new Set(cipherInput).size !== 10 && <span style={{ color: "#dc2626", marginLeft: 8 }}>❌ Duplicate characters</span>}
                </div>
              </div>

              <button onClick={saveCipherKey} disabled={cipherLoading} style={{ width: "100%", background: cipherLoading ? "#a78bfa" : "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {cipherLoading ? "Saving..." : "🔐 Update Cipher Key"}
              </button>

              <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                ⚠️ After changing, staff will see new codes when they reopen the app
              </div>
            </div>
          </div>
        )}

      {/* Delete modal */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Delete Product?</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>This cannot be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Yes, Delete</button>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" };
const inputStyle: React.CSSProperties = { width: "100%", border: "2px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "system-ui,sans-serif", color: "#1e293b", background: "#f8fafc", outline: "none", boxSizing: "border-box" as const };