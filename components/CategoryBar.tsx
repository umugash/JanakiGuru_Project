"use client";

import { useRef, useState } from "react";

interface CategoryBarProps {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  All: "🏪",
  Stationery: "✏️",
  "School Supplies": "🎒",
  Cleaning: "🧹",
  "Art & Craft": "🎨",
  "Office Supplies": "📎",
  Books: "📚",
  "Ink & Pens": "🖊️",
  Files: "🗂️",
  Notebooks: "📓",
};

export default function CategoryBar({ categories, selected, onSelect }: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const allCats = ["All", ...categories.filter(c => c !== "All")];

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX);
  };
  const stopDrag = () => setIsDragging(false);

  return (
    <div style={{ padding: "10px 0 8px", background: "#fff" }}>
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        style={{
          display: "flex", gap: 8, overflowX: "auto", padding: "4px 14px 6px",
          scrollbarWidth: "none", cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {allCats.map(cat => {
          const isActive = selected === cat;
          return (
            <div
              key={cat}
              onClick={() => onSelect(cat)}
              style={{
                flexShrink: 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 14px", borderRadius: 14, cursor: "pointer",
                minWidth: 70,
                background: isActive
                  ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                  : "#fff0f0",
                border: isActive ? "2px solid #ef4444" : "2px solid #fca5a5",
                boxShadow: isActive
                  ? "0 4px 14px rgba(220,38,38,0.3)"
                  : "0 1px 4px rgba(220,38,38,0.1)",
                transform: isActive ? "translateY(-2px)" : "none",
                transition: "all 0.18s ease",
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>
                {CATEGORY_ICONS[cat] || "📦"}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isActive ? "#fff" : "#dc2626",
                whiteSpace: "nowrap", fontFamily: "system-ui, sans-serif",
              }}>
                {cat}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
