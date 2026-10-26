"use client";

import { ChevronRight } from "lucide-react";
import { useRef } from "react";

type CategoryTabsProps = {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
};

export function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <section className="cartify-shell cartify-interests" aria-label="Explore interests">
      <div className="cartify-interests__heading">
        <span>CURATED FOR YOUR EVERYDAY</span>
        <h2>Find your next favorite</h2>
        <p>Good finds, in every category.</p>
      </div>
      <div className="cartify-tabs-wrap">
        <div className="cartify-tabs" ref={listRef} role="group" aria-label="Product categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={active === category}
              className={active === category ? "is-active" : ""}
              onClick={() => onChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <button
          className="cartify-tabs-next"
          type="button"
          aria-label="Scroll categories"
          onClick={() => listRef.current?.scrollBy({ left: 260, behavior: "smooth" })}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
