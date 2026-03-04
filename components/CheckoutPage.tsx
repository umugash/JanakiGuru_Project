"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckoutPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Save these BEFORE clearing cart so success screen can show them
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderName, setOrderName] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter valid 10-digit mobile number";
    if (!form.address.trim()) e.address = "Please enter your delivery address";
    return e;
  };

  const handlePlaceOrder = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("orders").insert([{
        customer_name: form.name,
        phone: form.phone,
        address: form.address,
        items: cart,
        total_amount: total,
      }]);
      if (error) throw error;

      // Save total and name BEFORE clearing cart
      setOrderTotal(total);
      setOrderName(form.name);

      localStorage.removeItem("cart");
      setCart([]);
      setSuccess(true);
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (!isMounted) return null;

  // ── SUCCESS SCREEN ──
  if (success) {
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(160deg,#fff5f5,#fff)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "32px 24px", textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}>
        <style>{`
          @keyframes truckMove {
            0%   { transform: translateX(-60px); opacity: 0; }
            20%  { opacity: 1; }
            80%  { opacity: 1; }
            100% { transform: translateX(60px); opacity: 0; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50%       { transform: scale(1.06); }
          }
          .truck-anim { animation: truckMove 2s ease-in-out infinite; display: inline-block; font-size: 52px; }
          .fade-up-1  { animation: fadeUp 0.5s ease 0.1s both; }
          .fade-up-2  { animation: fadeUp 0.5s ease 0.3s both; }
          .fade-up-3  { animation: fadeUp 0.5s ease 0.5s both; }
          .fade-up-4  { animation: fadeUp 0.5s ease 0.7s both; }
          .pulse-btn  { animation: pulse 2s ease-in-out infinite; }
        `}</style>

        <div style={{ marginBottom: 8, overflow: "hidden", width: 160, height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="truck-anim">🚚</span>
        </div>

        <div style={{ width: 200, height: 3, background: "linear-gradient(90deg,transparent,#fca5a5,transparent)", borderRadius: 2, marginBottom: 28 }} />

        <div className="fade-up-1" style={{ fontSize: 26, fontWeight: 800, color: "#dc2626", marginBottom: 6 }}>
          Order Placed! 🎉
        </div>

        <div className="fade-up-2" style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, marginBottom: 20 }}>
          Thank you, <strong>{orderName}</strong>!<br />
          Your order will be delivered today.
        </div>

        <div className="fade-up-3" style={{
          background: "#fff", border: "2px solid #fee2e2", borderRadius: 18,
          padding: "18px 28px", marginBottom: 24, width: "100%", maxWidth: 340,
          boxShadow: "0 4px 20px rgba(220,38,38,0.1)",
        }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10, fontWeight: 600 }}>ORDER DETAILS</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#6b7280", fontSize: 13 }}>Total Amount</span>
            <span style={{ fontWeight: 800, color: "#dc2626", fontSize: 16 }}>₹{orderTotal}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#6b7280", fontSize: 13 }}>Delivery</span>
            <span style={{ fontWeight: 600, color: "#16a34a", fontSize: 13 }}>Free 🎁</span>
          </div>
          <div style={{ height: 1, background: "#fee2e2", margin: "10px 0" }} />
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
            📞 For queries, contact:<br />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", letterSpacing: 0.5 }}>
              9500259930
            </span>
          </div>
        </div>

        <a href="/" style={{ textDecoration: "none", width: "100%", maxWidth: 340 }}>
          <div className="fade-up-4 pulse-btn" style={{
            background: "linear-gradient(135deg,#ef4444,#b91c1c)",
            color: "#fff", borderRadius: 16, padding: "14px 28px",
            fontWeight: 700, fontSize: 15, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(220,38,38,0.35)",
          }}>
            ← Continue Shopping
          </div>
        </a>
      </div>
    );
  }

  // ── EMPTY CART ──
  if (cart.length === 0) {
    return (
      <div style={{
        minHeight: "100vh", background: "#fff5f5",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🛒</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>Your cart is empty!</div>
        <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 500, marginBottom: 24 }}>Add some products before checking out.</div>
        <a href="/" style={{
          background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff",
          borderRadius: 14, padding: "12px 28px", fontWeight: 700, fontSize: 15,
          textDecoration: "none", boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
        }}>← Browse Products</a>
      </div>
    );
  }

  // ── CHECKOUT FORM ──
  return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: "#fff5f5", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#ef4444,#b91c1c)",
        padding: "16px 16px 36px", color: "#fff", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <div style={{
              background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)",
              color: "#fff", borderRadius: 10, padding: "6px 12px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>← Back</div>
          </a>
          <div>
            <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: "1px", textTransform: "uppercase" }}>Janaki Guru Enterprises</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>🛒 Checkout</div>
          </div>
        </div>
        <div style={{
          position: "absolute", bottom: -20, left: 0, right: 0, height: 40,
          background: "#fff5f5", borderRadius: "50% 50% 0 0 / 40px 40px 0 0",
        }} />
      </div>

      {/* Order Summary */}
      <div style={{ margin: "32px 14px 0", background: "#fff", borderRadius: 18, padding: 16, boxShadow: "0 2px 16px rgba(220,38,38,0.07)", border: "1.5px solid #fee2e2" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 12 }}>📦 Your Order</div>
        {cart.map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px dashed #fee2e2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {item.image_url?.[0] && (
                <img src={item.image_url[0]} alt={item.name}
                  style={{ width: 38, height: 38, borderRadius: 8, objectFit: "contain", border: "1px solid #fee2e2", background: "#fff5f5" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", maxWidth: 170 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Qty: {item.quantity}</div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>₹{item.price * item.quantity}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "2px solid #fee2e2" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>₹{total}</span>
        </div>
        <div style={{ background: "#fff1f1", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#dc2626", marginTop: 12, border: "1.5px solid #fca5a5" }}>
          🚚 Free delivery · Within 10 km
        </div>
      </div>

      {/* Customer Details */}
      <div style={{ margin: "14px 14px 0", background: "#fff", borderRadius: 18, padding: 16, boxShadow: "0 2px 16px rgba(220,38,38,0.07)", border: "1.5px solid #fee2e2" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 14 }}>👤 Your Details</div>

        {[
          { key: "name", label: "Full Name", type: "text", placeholder: "Enter your name" },
          { key: "phone", label: "Phone Number", type: "tel", placeholder: "10-digit mobile number" },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>{field.label}</label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={(form as any)[field.key]}
              onChange={e => { setForm({ ...form, [field.key]: e.target.value }); setErrors({ ...errors, [field.key]: "" }); }}
              style={{
                width: "100%", border: `2px solid ${(errors as any)[field.key] ? "#f87171" : "#fee2e2"}`,
                borderRadius: 12, padding: "10px 14px", fontSize: 14,
                fontFamily: "system-ui,sans-serif", color: "#1a1a1a", background: "#fffafa", outline: "none",
              }}
            />
            {(errors as any)[field.key] && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 3, fontWeight: 600 }}>⚠ {(errors as any)[field.key]}</div>}
          </div>
        ))}

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>Delivery Address</label>
          <textarea
            rows={3}
            placeholder="House no, street, area, landmark..."
            value={form.address}
            onChange={e => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: "" }); }}
            style={{
              width: "100%", border: `2px solid ${errors.address ? "#f87171" : "#fee2e2"}`,
              borderRadius: 12, padding: "10px 14px", fontSize: 14,
              fontFamily: "system-ui,sans-serif", color: "#1a1a1a", background: "#fffafa", outline: "none", resize: "none",
            }}
          />
          {errors.address && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 3, fontWeight: 600 }}>⚠ {errors.address}</div>}
        </div>
      </div>

      {/* Place Order Button */}
      <div style={{ position: "fixed", bottom: 16, left: 14, right: 14 }}>
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          style={{
            width: "100%", background: loading ? "#f87171" : "linear-gradient(135deg,#ef4444,#b91c1c)",
            color: "#fff", border: "none", borderRadius: 16, padding: 15,
            fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "system-ui,sans-serif", boxShadow: "0 4px 20px rgba(220,38,38,0.35)",
          }}
        >
          {loading ? "Placing Order..." : `🎉 Place Order · ₹${total}`}
        </button>
      </div>
    </div>
  );
}
