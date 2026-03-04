"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string[];
}

interface CheckoutPageProps {
  cartItems: CartItem[];
  onOrderSuccess: () => void;
}

export default function CheckoutPage({ cartItems, onOrderSuccess }: CheckoutPageProps) {
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (!form.address.trim()) e.address = "Please enter your delivery address";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("orders").insert([{
        customer_name: form.name,
        phone: form.phone,
        address: form.address,
        items: cartItems,
        total_amount: total,
      }]);
      if (error) throw error;
      onOrderSuccess();   // clears localStorage cart
      setSuccess(true);   // show success screen
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  // ── SUCCESS SCREEN ──
  if (success) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg,#fff5f5 0%,#fff 100%)",
        padding: 32, textAlign: "center", fontFamily: "system-ui,sans-serif",
      }}>
        <div style={{
          width: 90, height: 90, borderRadius: "50%",
          background: "linear-gradient(135deg,#ef4444,#b91c1c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 44, marginBottom: 24,
          boxShadow: "0 8px 32px rgba(220,38,38,0.3)",
          animation: "none",
        }}>✓</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>
          Order Confirmed! 🎉
        </div>
        <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
          Thank you, <strong>{form.name}</strong>!<br />
          Your order will be delivered today.
        </div>
        <div style={{
          marginTop: 24, background: "#fff1f1", border: "2px solid #fca5a5",
          borderRadius: 14, padding: "12px 24px", fontSize: 14,
          fontWeight: 600, color: "#dc2626",
        }}>
          🚚 Delivery within 10 km &nbsp;·&nbsp; Total: ₹{total}
        </div>
        <a href="/" style={{
          marginTop: 20, background: "linear-gradient(135deg,#ef4444,#b91c1c)",
          color: "#fff", borderRadius: 14, padding: "12px 28px",
          fontWeight: 700, fontSize: 15, textDecoration: "none",
          boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
        }}>← Continue Shopping</a>
      </div>
    );
  }

  // ── CHECKOUT FORM ──
  return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: "#fff5f5", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#ef4444,#b91c1c)",
        padding: "20px 20px 36px", color: "#fff", position: "relative",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
          Janaki Guru Enterprises
        </div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>🛒 Checkout</div>
        <div style={{
          position: "absolute", bottom: -20, left: 0, right: 0, height: 40,
          background: "#fff5f5", borderRadius: "50% 50% 0 0 / 40px 40px 0 0",
        }} />
      </div>

      {/* Order Summary */}
      <div style={{ margin: "32px 16px 0", background: "#fff", borderRadius: 18, padding: 18, boxShadow: "0 2px 16px rgba(220,38,38,0.07)", border: "1.5px solid #fee2e2" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", marginBottom: 14 }}>📦 Your Order</div>

        {cartItems.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px dashed #fee2e2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {item.image_url?.[0] && (
                <img
                  src={item.image_url[0]}
                  alt={item.name}
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid #fee2e2" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", maxWidth: 180 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Qty: {item.quantity}</div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>₹{item.price * item.quantity}</div>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "2px solid #fee2e2" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>₹{total}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff1f1", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#dc2626", marginTop: 14, border: "1.5px solid #fca5a5" }}>
          🚚 Free delivery · Within 10 km
        </div>
      </div>

      {/* Customer Details */}
      <div style={{ margin: "16px 16px 0", background: "#fff", borderRadius: 18, padding: 18, boxShadow: "0 2px 16px rgba(220,38,38,0.07)", border: "1.5px solid #fee2e2" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", marginBottom: 16 }}>👤 Your Details</div>

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>Full Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={form.name}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: "" }); }}
            style={{
              width: "100%", border: `2px solid ${errors.name ? "#f87171" : "#fee2e2"}`,
              borderRadius: 12, padding: "10px 14px", fontSize: 14,
              fontFamily: "system-ui,sans-serif", color: "#1a1a1a",
              background: "#fffafa", outline: "none",
            }}
          />
          {errors.name && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>⚠ {errors.name}</div>}
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>Phone Number</label>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: "" }); }}
            style={{
              width: "100%", border: `2px solid ${errors.phone ? "#f87171" : "#fee2e2"}`,
              borderRadius: 12, padding: "10px 14px", fontSize: 14,
              fontFamily: "system-ui,sans-serif", color: "#1a1a1a",
              background: "#fffafa", outline: "none",
            }}
          />
          {errors.phone && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>⚠ {errors.phone}</div>}
        </div>

        {/* Address */}
        <div style={{ marginBottom: 4 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>Delivery Address</label>
          <textarea
            rows={3}
            placeholder="House no, street, area, landmark..."
            value={form.address}
            onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: "" }); }}
            style={{
              width: "100%", border: `2px solid ${errors.address ? "#f87171" : "#fee2e2"}`,
              borderRadius: 12, padding: "10px 14px", fontSize: 14,
              fontFamily: "system-ui,sans-serif", color: "#1a1a1a",
              background: "#fffafa", outline: "none", resize: "none",
            }}
          />
          {errors.address && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>⚠ {errors.address}</div>}
        </div>
      </div>

      {/* Place Order Button */}
      <div style={{ position: "fixed", bottom: 16, left: 16, right: 16 }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", background: loading ? "#f87171" : "linear-gradient(135deg,#ef4444,#b91c1c)",
            color: "#fff", border: "none", borderRadius: 16, padding: 16,
            fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "system-ui,sans-serif",
            boxShadow: "0 4px 20px rgba(220,38,38,0.35)",
          }}
        >
          {loading ? "Placing Order..." : `🎉 Place Order · ₹${total}`}
        </button>
      </div>
    </div>
  );
}
