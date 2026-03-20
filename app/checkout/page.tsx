"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const TELEGRAM_BOT_TOKEN = "8731245345:AAGvCzABasw18_LGeLyOozD3hlqfib_QZWw";
const TELEGRAM_CHAT_ID = "2134069205";

export default function CheckoutPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderName, setOrderName] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart, isMounted]);

  // Use website_price if available, else in-store price
  const getItemPrice = (item: any) => item.website_price || item.price;
  const total = cart.reduce((sum, item) => sum + getItemPrice(item) * (item.quantity || 1), 0);

  function increaseQty(id: string) {
    setCart(prev => prev.map(p => p.id === id ? { ...p, quantity: (p.quantity || 1) + 1 } : p));
  }

  function decreaseQty(id: string) {
    setCart(prev => prev.map(p => p.id === id ? { ...p, quantity: (p.quantity || 1) - 1 } : p).filter(p => p.quantity > 0));
  }

  function removeItem(id: string) {
    setCart(prev => prev.filter(p => p.id !== id));
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter valid 10-digit mobile number";
    if (!form.address.trim()) e.address = "Please enter your delivery address";
    return e;
  };

  const sendTelegram = async (name: string, phone: string, address: string, items: any[], orderAmt: number) => {
    const itemsList = items
      .map((item: any) => `  • ${item.name} x${item.quantity} = ₹${getItemPrice(item) * item.quantity}`)
      .join("\n");
    const message = `🛒 *NEW ORDER RECEIVED!*\n\n👤 *Customer:* ${name}\n📞 *Phone:* ${phone}\n📍 *Address:* ${address}\n\n📦 *Items:*\n${itemsList}\n\n💰 *Total: ₹${orderAmt}*\n\n🕐 ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" }),
    });
  };

  const handlePlaceOrder = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    const capturedTotal = total;
    const capturedName = form.name;
    const capturedCart = [...cart];
    try {
      const { error } = await supabase.from("orders").insert([{
        customer_name: capturedName,
        phone: form.phone,
        address: form.address,
        items: capturedCart,
        total_amount: capturedTotal,
      }]);
      if (error) throw error;
      await sendTelegram(capturedName, form.phone, form.address, capturedCart, capturedTotal);
      setOrderTotal(capturedTotal);
      setOrderName(capturedName);
      localStorage.removeItem("cart");
      setCart([]);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (!isMounted) return null;

  // SUCCESS SCREEN
  if (success) {
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(160deg,#fff5f5,#fff)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "32px 24px", textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}>
        <style>{`
          @keyframes truckMove { 0%{transform:translateX(-60px);opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{transform:translateX(60px);opacity:0} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
          .truck-anim { animation: truckMove 2s ease-in-out infinite; display:inline-block; font-size:52px; }
          .fade-up-1 { animation: fadeUp 0.5s ease 0.1s both; }
          .fade-up-2 { animation: fadeUp 0.5s ease 0.3s both; }
          .fade-up-3 { animation: fadeUp 0.5s ease 0.5s both; }
          .fade-up-4 { animation: fadeUp 0.5s ease 0.7s both; }
          .pulse-btn { animation: pulse 2s ease-in-out infinite; }
        `}</style>
        <div style={{ marginBottom: 8, overflow: "hidden", width: 160, height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="truck-anim">🚚</span>
        </div>
        <div style={{ width: 200, height: 3, background: "linear-gradient(90deg,transparent,#fca5a5,transparent)", borderRadius: 2, marginBottom: 28 }} />
        <div className="fade-up-1" style={{ fontSize: 26, fontWeight: 800, color: "#dc2626", marginBottom: 6 }}>Order Placed! 🎉</div>
        <div className="fade-up-2" style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, marginBottom: 20 }}>
          Thank you, <strong>{orderName}</strong>!<br />Your order will be delivered today.
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
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#6b7280", fontSize: 13 }}>Delivery Time</span>
            <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: 13 }}>⚡ Same Day</span>
          </div>
          <div style={{ height: 1, background: "#fee2e2", margin: "10px 0" }} />
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
            📞 For queries, contact:<br />
            <a href="tel:9500259930" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>9500259930</span>
            </a>
          </div>
        </div>
        <a href="/" style={{ textDecoration: "none", width: "100%", maxWidth: 340 }}>
          <div className="fade-up-4 pulse-btn" style={{
            background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff",
            borderRadius: 16, padding: "14px 28px", fontWeight: 700, fontSize: 15,
            cursor: "pointer", boxShadow: "0 4px 20px rgba(220,38,38,0.35)",
          }}>← Continue Shopping</div>
        </a>
      </div>
    );
  }

  // EMPTY CART
  if (cart.length === 0) {
    return (
      <div style={{
        minHeight: "100vh", background: "#fff5f5", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🛒</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>Your cart is empty!</div>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>Add some products before checking out.</div>
        <a href="/" style={{
          background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff",
          borderRadius: 14, padding: "12px 28px", fontWeight: 700, fontSize: 15,
          textDecoration: "none", boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
        }}>← Browse Products</a>
      </div>
    );
  }

  // CHECKOUT FORM
  return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: "#fff5f5", paddingBottom: 100 }}>
      <div style={{
        background: "linear-gradient(135deg,#ef4444,#b91c1c)",
        padding: "16px 16px 36px", color: "#fff", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <div style={{
              background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)",
              color: "#fff", borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>← Back</div>
          </a>
          <div>
            <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: "1px", textTransform: "uppercase" }}>Janaki Guru Enterprises</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>🛒 Checkout</div>
          </div>
        </div>

        {/* Same Day Delivery badge */}
        <div style={{
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 10, padding: "6px 14px", display: "inline-flex",
          alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#fff", marginTop: 8,
        }}>
          ⚡ Same Day Delivery &nbsp;·&nbsp; 🚚 Free within 10 km
        </div>

        <div style={{ position: "absolute", bottom: -20, left: 0, right: 0, height: 40, background: "#fff5f5", borderRadius: "50% 50% 0 0 / 40px 40px 0 0" }} />
      </div>

      {/* ORDER SUMMARY with edit */}
      <div style={{ margin: "32px 14px 0", background: "#fff", borderRadius: 18, padding: 16, boxShadow: "0 2px 16px rgba(220,38,38,0.07)", border: "1.5px solid #fee2e2" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 12 }}>📦 Your Order</div>
        {cart.map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px dashed #fee2e2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              {item.image_url?.[0] && (
                <img src={item.image_url[0]} alt={item.name}
                  style={{ width: 38, height: 38, borderRadius: 8, objectFit: "contain", border: "1px solid #fee2e2", background: "#fff5f5", flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>₹{getItemPrice(item)} each</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {/* Qty controls */}
              <div style={{ display: "flex", alignItems: "center", background: "#fff1f1", borderRadius: 8, border: "1.5px solid #fca5a5", overflow: "hidden" }}>
                <button onClick={() => decreaseQty(item.id)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 16, fontWeight: 800, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                <button onClick={() => increaseQty(item.id)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 16, fontWeight: 800, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
              {/* Item total */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", minWidth: 46, textAlign: "right" }}>₹{getItemPrice(item) * item.quantity}</div>
              {/* Remove */}
              <button onClick={() => removeItem(item.id)} style={{ background: "#fff5f5", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 6, width: 26, height: 26, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "2px solid #fee2e2" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>₹{total}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1, background: "#fff1f1", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#dc2626", border: "1.5px solid #fca5a5" }}>
            🚚 Free delivery · Within 10 km
          </div>
          <div style={{ background: "#fffbeb", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#f59e0b", border: "1.5px solid #fde68a" }}>
            ⚡ Same Day
          </div>
        </div>
      </div>

      {/* CUSTOMER DETAILS */}
      <div style={{ margin: "14px 14px 0", background: "#fff", borderRadius: 18, padding: 16, boxShadow: "0 2px 16px rgba(220,38,38,0.07)", border: "1.5px solid #fee2e2" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 14 }}>👤 Your Details</div>
        {[
          { key: "name", label: "Full Name", type: "text", placeholder: "Enter your name" },
          { key: "phone", label: "Phone Number", type: "tel", placeholder: "10-digit mobile number" },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>{field.label}</label>
            <input
              type={field.type} placeholder={field.placeholder}
              value={(form as any)[field.key]}
              onChange={e => { setForm({ ...form, [field.key]: e.target.value }); setErrors({ ...errors, [field.key]: "" }); }}
              style={{
                width: "100%", border: `2px solid ${(errors as any)[field.key] ? "#f87171" : "#fee2e2"}`,
                borderRadius: 12, padding: "10px 14px", fontSize: 14,
                fontFamily: "system-ui,sans-serif", color: "#1a1a1a", background: "#fffafa", outline: "none",
                boxSizing: "border-box" as const,
              }}
            />
            {(errors as any)[field.key] && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 3, fontWeight: 600 }}>⚠ {(errors as any)[field.key]}</div>}
          </div>
        ))}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>Delivery Address</label>
          <textarea rows={3} placeholder="House no, street, area, landmark..."
            value={form.address}
            onChange={e => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: "" }); }}
            style={{
              width: "100%", border: `2px solid ${errors.address ? "#f87171" : "#fee2e2"}`,
              borderRadius: 12, padding: "10px 14px", fontSize: 14,
              fontFamily: "system-ui,sans-serif", color: "#1a1a1a", background: "#fffafa", outline: "none", resize: "none",
              boxSizing: "border-box" as const,
            }}
          />
          {errors.address && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 3, fontWeight: 600 }}>⚠ {errors.address}</div>}
        </div>
      </div>

      {/* Place Order */}
      <div style={{ position: "fixed", bottom: 16, left: 14, right: 14 }}>
        <button onClick={handlePlaceOrder} disabled={loading} style={{
          width: "100%", background: loading ? "#f87171" : "linear-gradient(135deg,#ef4444,#b91c1c)",
          color: "#fff", border: "none", borderRadius: 16, padding: 15,
          fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "system-ui,sans-serif", boxShadow: "0 4px 20px rgba(220,38,38,0.35)",
        }}>
          {loading ? "Placing Order..." : `🎉 Place Order · ₹${total}`}
        </button>
      </div>
    </div>
  );
}