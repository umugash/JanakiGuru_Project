"use client";

import { useEffect, useState, useRef } from "react";
import ProductCard from "@/components/ProductCard";
import CategoryBar from "@/components/CategoryBar";

const PAGE_SIZE = 50;

export default function Home() {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState<string[]>([]);
  
  const [cart, setCart] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Show loading state while fetching
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============ INITIALIZATION ============
  
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart, isMounted]);

  // Fetch all products once on mount - THIS IS THE FIX
  useEffect(() => {
    fetchAllProducts();
  }, []);

  // ============ SEARCH & FILTER (with debounce) ============
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      filterAndPaginate();
    }, 150);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, selectedCategory, allProducts]);

  // ============ INFINITE SCROLL ============
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, currentPage, filteredProducts]);

  // ============ FETCH FUNCTIONS - THIS IS THE MAIN FIX ============
  
  /**
   * FIXED VERSION: Properly fetch ALL products by looping through pagination
   * Old version had a bug where fetchProductsPaginated() was called inside extractCategories
   */
  async function fetchAllProducts() {
    try {
      setIsLoading(true);
      
      // Start with offset 0
      let allData: any[] = [];
      let offset = 0;
      const limit = 1000; // Supabase max limit per request
      let hasMoreData = true;

      // Keep fetching until we get all products
      while (hasMoreData) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=*&limit=${limit}&offset=${offset}`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            },
          }
        );

        const data = await response.json();
        
        // If this batch is empty or less than limit, we've reached the end
        if (data.length === 0 || data.length < limit) {
          hasMoreData = false;
        }
        
        allData.push(...data);
        offset += limit;

        console.log(`✅ Fetched ${allData.length} products so far...`);
      }

      console.log(`✅✅ DONE! Total products fetched: ${allData.length}`);
      
      setAllProducts(allData);
      
      // Extract categories from ALL products
      const extractedCategories = extractCategories(allData);
      setCategories(extractedCategories);
      
      setIsLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setIsLoading(false);
    }
  }

  // ============ FILTER & PAGINATION ============
  
  function filterAndPaginate() {
    let filtered = allProducts;

    // Apply category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(p => parseProductCategories(p.category).includes(selectedCategory));
    }

    // Apply search filter
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const searchText = [p.name || "", ...(p.keywords || [])].join(" ").toLowerCase();
        const words = searchLower.split(" ").filter(Boolean);
        return words.every(word => searchText.includes(word));
      });
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
    setDisplayedProducts(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
  }

  function loadMore() {
    setIsLoadingMore(true);
    
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIdx = (nextPage - 1) * PAGE_SIZE;
      const endIdx = startIdx + PAGE_SIZE;
      
      const newProducts = filteredProducts.slice(startIdx, endIdx);
      
      if (newProducts.length > 0) {
        setDisplayedProducts(prev => [...prev, ...newProducts]);
        setCurrentPage(nextPage);
      }
      
      setHasMore(endIdx < filteredProducts.length);
      setIsLoadingMore(false);
    }, 200);
  }

  // ============ CATEGORY PARSING ============
  
  function extractCategories(products: any[]): string[] {
    return [...new Set(
      products.flatMap(p => {
        const cat = p.category;
        if (!cat) return [];
        if (Array.isArray(cat)) return cat.map(String).map((s: string) => s.replace(/^["'\[\]\\]+|["'\[\]\\]+$/g, "").trim()).filter(Boolean);
        if (typeof cat === "string") {
          const s = cat.trim().replace(/\\/g, "");
          try { 
            const parsed = JSON.parse(s); 
            if (Array.isArray(parsed)) return parsed.map(String).map((x: string) => x.trim()).filter(Boolean); 
          } catch {}
          return s.replace(/^[\["']+|[\]"']+$/g, "").split(",").map((x: string) => x.trim()).filter(Boolean);
        }
        return [];
      })
    )].filter(Boolean).sort() as string[];
  }

  function parseProductCategories(cat: any): string[] {
    if (!cat) return [];
    if (Array.isArray(cat)) return cat.map(String).map(s => s.replace(/^["'\[\]\\]+|["'\[\]\\]+$/g, "").trim()).filter(Boolean);
    if (typeof cat === "string") {
      const s = cat.trim().replace(/\\/g, "");
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String).map((x: string) => x.trim()).filter(Boolean);
        if (typeof parsed === "string") return [parsed.trim()];
      } catch {}
      return s.replace(/^[\["']+|[\]"']+$/g, "").split(",").map((x: string) => x.trim()).filter(Boolean);
    }
    return [];
  }

  // ============ CART FUNCTIONS ============
  
  function cartKey(productId: string, variantLabel: string) {
    return `${productId}|${variantLabel}`;
  }

  function addVariantToCart(product: any, variantLabel: string, variantPrice: number) {
    setCart(prev => {
      const key = cartKey(product.id, variantLabel);
      const existing = prev.find(p => cartKey(p.id, p.variantLabel) === key);
      if (existing) {
        return prev.map(p => cartKey(p.id, p.variantLabel) === key ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, {
        ...product,
        variantLabel,
        price: variantPrice,
        website_price: variantPrice,
        quantity: 1,
      }];
    });
  }

  function decrementVariant(product: any, variantLabel: string, variantPrice: number) {
    setCart(prev => {
      const key = cartKey(product.id, variantLabel);
      return prev.map(p => cartKey(p.id, p.variantLabel) === key ? { ...p, quantity: p.quantity - 1 } : p)
        .filter(p => p.quantity > 0);
    });
  }

  function addToCart(product: any) {
    const variantLabel = product.variantLabel ?? "";
    const price = Number(product.website_price) || Number(product.price) || 0;
    addVariantToCart(product, variantLabel, price);
  }

  function decreaseQuantity(product: any) {
    const variantLabel = product.variantLabel ?? "";
    const price = Number(product.website_price) || Number(product.price) || 0;
    decrementVariant(product, variantLabel, price);
  }

  function getVariantCartQuantities(productId: string): { [label: string]: number } {
    const result: { [label: string]: number } = {};
    cart.filter(p => p.id === productId).forEach(p => {
      result[p.variantLabel ?? ""] = p.quantity;
    });
    return result;
  }

  function getProductCartQty(productId: string): number {
    return cart.filter(p => p.id === productId).reduce((sum, p) => sum + p.quantity, 0);
  }

  const totalCartItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + (Number(item.website_price) || Number(item.price) || 0) * (item.quantity || 0), 0);

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
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "system-ui, sans-serif" }}>Janaki Guru Enterprises</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: "1px", fontFamily: "system-ui, sans-serif" }}>STATIONERY STORE</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <a href="tel:9500259930" style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 10, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#fff" }}>📞 9500259930</div>
            </a>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", textAlign: "right" }}>Bulk orders / queries</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15 }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search pencils, notebooks, pens..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 14, padding: "11px 16px 11px 42px", fontSize: 14, fontFamily: "system-ui, sans-serif", fontWeight: 500, color: "#1a1a1a", outline: "none", boxSizing: "border-box" as const }} 
            />
          </div>
          <a href="/checkout" style={{ textDecoration: "none", flexShrink: 0 }}>
            <div style={{ background: "#fff", border: "2px solid #fff", color: "#dc2626", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              🛒
              {totalCartItems > 0 && <span style={{ background: "#dc2626", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{totalCartItems}</span>}
            </div>
          </a>
        </div>

        <div style={{ background: "rgba(255,255,255,0.15)", borderTop: "1px solid rgba(255,255,255,0.2)", padding: "7px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginLeft: -16, marginRight: -16 }}>
          🚚 Free delivery within 10 km &nbsp;·&nbsp;
          <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>⚡ Same Day Delivery</span>
        </div>
      </div>

      {/* CATEGORIES */}
      <div style={{ background: "#fff", borderBottom: "1px solid #fee2e2" }}>
        <CategoryBar categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", padding: "16px 16px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        {selectedCategory === "All" ? "All Products" : selectedCategory}
        <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>({isLoading ? "Loading..." : filteredProducts.length} items)</span>
      </div>

      {/* LOADING STATE */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Loading all products...</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>This may take a moment for 7000+ products</div>
        </div>
      )}

      {/* PRODUCT GRID WITH INFINITE SCROLL */}
      {!isLoading && filteredProducts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No products found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search or category</div>
        </div>
      ) : !isLoading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "0 10px", alignItems: "start" }}>
            {displayedProducts.map(product => {
              const variantQtys = getVariantCartQuantities(product.id);
              const singleQty = getProductCartQty(product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQuantity={singleQty}
                  onAddToCart={addToCart}
                  onIncrement={addToCart}
                  onDecrement={decreaseQuantity}
                  variantCartQuantities={variantQtys}
                  onVariantIncrement={(p, label, price) => addVariantToCart(p, label, price)}
                  onVariantDecrement={(p, label, price) => decrementVariant(p, label, price)}
                />
              );
            })}
          </div>

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={observerTarget} style={{ padding: "20px", textAlign: "center" }}>
              {isLoadingMore && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: "50%", 
                    background: "#dc2626",
                    animation: "pulse 1.5s ease-in-out infinite"
                  }} />
                  <span style={{ color: "#6b7280", fontSize: 13 }}>Loading more products...</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* FLOATING CART BUTTON */}
      {totalCartItems > 0 && (
        <a href="/checkout" style={{ textDecoration: "none" }}>
          <div style={{ position: "fixed", bottom: 16, left: 16, right: 16, background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#fff", padding: "14px 20px", borderRadius: 18, boxShadow: "0 8px 28px rgba(220,38,38,0.4)", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: 15, cursor: "pointer", zIndex: 50 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "2px 8px", fontSize: 13 }}>{totalCartItems} items</span>
              <span>View Cart</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>₹{totalCartAmount} →</div>
          </div>
        </a>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </main>
  );
}