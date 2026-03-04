"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import CategoryBar from "@/components/CategoryBar";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart, isMounted]);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => { filterProducts(); }, [searchTerm, selectedCategory, products]);

  async function fetchProducts() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        }
      );
      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }

  function filterProducts() {
    let filtered = products;
    if (selectedCategory !== "All") filtered = filtered.filter(p => p.category === selectedCategory);
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(term);
        const keywordMatch = p.keywords?.some((k: string) => k.toLowerCase().includes(term));
        return nameMatch || keywordMatch;
      });
    }
    setFilteredProducts(filtered);
  }

  function addToCart(product: any) {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) return prev.map(p => p.id === product.id ? { ...p, quantity: (p.quantity || 0) + 1 } : p);
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function decreaseQuantity(product: any) {
    setCart(prev => prev.map(p => p.id === product.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p).filter(p => p.quantity > 0));
  }

  const categories = [...new Set(products.map(p => p.category))];
  const totalCartItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * (item.quantity || 0), 0);

  if (!isMounted) return null;

  return (
    <main style={{ minHeight: "100vh", background: "#fff5f5", paddingBottom: 110 }}>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        padding: "16px 16px 0", position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 4px 20px rgba(220,38,38,0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "system-ui, sans-serif" }}>
              Janaki Guru Enterprises
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: "1px", fontFamily: "system-ui, sans-serif" }}>
              STATIONERY STORE
            </div>
          </div>
          <a href="/checkout" style={{ textDecoration: "none" }}>
            <div style={{
              background: "#fff", border: "2px solid #fff",
              color: "#dc2626", borderRadius: 12, padding: "8px 14px",
              fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}>
              🛒
              {totalCartItems > 0 && (
                <span style={{
                  background: "#dc2626", color: "#fff", borderRadius: "50%",
                  width: 18, height: 18, fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{totalCartItems}</span>
              )}
            </div>
          </a>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15 }}>🔍</span>
          <input
            type="text"
            placeholder="Search pencils, notebooks, pens..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.95)", border: "none",
              borderRadius: 14, padding: "11px 16px 11px 42px",
              fontSize: 14, fontFamily: "system-ui, sans-serif", fontWeight: 500,
              color: "#1a1a1a", outline: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {/* Delivery tag */}
        <div style={{
          background: "rgba(255,255,255,0.15)", borderTop: "1px solid rgba(255,255,255,0.2)",
          padding: "7px 16px", display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)",
          fontFamily: "system-ui, sans-serif",
          marginLeft: -16, marginRight: -16,
        }}>
          🚚 Free delivery within 10 km &nbsp;·&nbsp; 📍 Local store
        </div>
      </div>

      {/* CATEGORIES */}
      <div style={{ background: "#fff", borderBottom: "1px solid #fee2e2" }}>
        <CategoryBar categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>

      {/* SECTION TITLE */}
      <div style={{
        fontSize: 16, fontWeight: 700, color: "#1a1a1a",
        padding: "16px 16px 10px", display: "flex", alignItems: "center", gap: 8,
        fontFamily: "system-ui, sans-serif",
      }}>
        {selectedCategory === "All" ? "All Products" : selectedCategory}
        <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>
          ({filteredProducts.length} items)
        </span>
      </div>

      {/* PRODUCT GRID - 3 columns */}
      {filteredProducts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No products found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search or category</div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          padding: "0 10px",
          alignItems: "start",
        }}>
          {filteredProducts.map(product => {
            const cartItem = cart.find(p => p.id === product.id);
            return (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={cartItem?.quantity || 0}
                onAddToCart={addToCart}
                onIncrement={addToCart}
                onDecrement={decreaseQuantity}
              />
            );
          })}
        </div>
      )}

      {/* FLOATING CART */}
      {totalCartItems > 0 && (
        <a href="/checkout" style={{ textDecoration: "none" }}>
          <div style={{
            position: "fixed", bottom: 16, left: 16, right: 16,
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            color: "#fff", padding: "14px 20px", borderRadius: 18,
            boxShadow: "0 8px 28px rgba(220,38,38,0.4)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontFamily: "system-ui, sans-serif", fontWeight: 700, fontSize: 15,
            cursor: "pointer", zIndex: 50,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "2px 8px", fontSize: 13 }}>
                {totalCartItems} items
              </span>
              <span>View Cart</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>₹{totalCartAmount} →</div>
          </div>
        </a>
      )}
    </main>
  );
}
