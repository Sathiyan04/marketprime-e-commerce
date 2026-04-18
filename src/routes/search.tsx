import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, ProductCardSkeleton, type ProductCardData } from "@/components/ProductCard";
import { formatINR } from "@/lib/format";

const sortOptions = z.enum(["relevance", "price-asc", "price-desc", "rating", "newest"]);

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  sort: fallback(sortOptions, "relevance").default("relevance"),
  minPrice: fallback(z.number(), 0).default(0),
  maxPrice: fallback(z.number(), 0).default(0),
  page: fallback(z.number(), 1).default(1),
});

const PAGE_SIZE = 8;

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Browse — MarketPrime" }] }),
  component: SearchPage,
});

interface ProductRow extends ProductCardData {
  category: string;
  created_at: string;
}

async function fetchAll(): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title, brand, price, original_price, rating, rating_count, image_url, category, created_at");
  if (error) throw error;
  return (data ?? []) as never;
}

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useQuery({ queryKey: ["all-products"], queryFn: fetchAll });

  const cats = ["Electronics", "Fashion", "Home", "Books"];

  // price bounds for slider
  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 100000 };
    const prices = products.map((p) => Number(p.price));
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.q.toLowerCase();
    const minP = search.minPrice || priceBounds.min;
    const maxP = search.maxPrice || priceBounds.max;
    let list = products.filter((p) => {
      if (search.category && p.category !== search.category) return false;
      if (q && !`${p.title} ${p.brand}`.toLowerCase().includes(q)) return false;
      if (Number(p.price) < minP || Number(p.price) > maxP) return false;
      return true;
    });
    switch (search.sort) {
      case "price-asc": list = [...list].sort((a, b) => Number(a.price) - Number(b.price)); break;
      case "price-desc": list = [...list].sort((a, b) => Number(b.price) - Number(a.price)); break;
      case "rating": list = [...list].sort((a, b) => Number(b.rating) - Number(a.rating)); break;
      case "newest": list = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)); break;
    }
    return list;
  }, [products, search, priceBounds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(search.page, totalPages);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateSearch = (next: Partial<typeof search>) => {
    navigate({ to: "/search", search: (prev) => ({ ...prev, ...next, page: 1 }) });
  };

  const goToPage = (p: number) => {
    navigate({ to: "/search", search: (prev) => ({ ...prev, page: p }) });
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {search.category || (search.q ? `Results for "${search.q}"` : "All products")}
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} items</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Sort by</label>
          <select
            value={search.sort}
            onChange={(e) => updateSearch({ sort: e.target.value as z.infer<typeof sortOptions> })}
            className="h-9 rounded-md border bg-surface px-3 text-sm outline-none transition-base focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <h2 className="font-display text-sm font-bold">Filters</h2>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => updateSearch({ category: "" })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-base ${!search.category ? "bg-primary text-primary-foreground" : "border bg-surface text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => updateSearch({ category: c })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-base ${search.category === c ? "bg-primary text-primary-foreground" : "border bg-surface text-muted-foreground hover:text-foreground"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <PriceFilter
              bounds={priceBounds}
              minPrice={search.minPrice || priceBounds.min}
              maxPrice={search.maxPrice || priceBounds.max}
              onApply={(min, max) => updateSearch({ minPrice: min, maxPrice: max })}
              onClear={() => updateSearch({ minPrice: 0, maxPrice: 0 })}
            />
          </div>
        </aside>

        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border bg-card py-16 text-center">
              <p className="text-sm text-muted-foreground">No products match your filters.</p>
              <button
                onClick={() => navigate({ to: "/search", search: {} })}
                className="mt-3 text-sm font-medium text-accent hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {paged.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceFilter({
  bounds, minPrice, maxPrice, onApply, onClear,
}: {
  bounds: { min: number; max: number };
  minPrice: number;
  maxPrice: number;
  onApply: (min: number, max: number) => void;
  onClear: () => void;
}) {
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price range</p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          value={min}
          onChange={(e) => setMin(Number(e.target.value))}
          min={bounds.min}
          max={bounds.max}
          className="h-9 w-full rounded-md border bg-surface px-2 text-xs outline-none focus:border-accent"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="number"
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
          min={bounds.min}
          max={bounds.max}
          className="h-9 w-full rounded-md border bg-surface px-2 text-xs outline-none focus:border-accent"
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Range: {formatINR(bounds.min)} – {formatINR(bounds.max)}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onApply(Math.max(bounds.min, min), Math.min(bounds.max, max || bounds.max))}
          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-base hover:opacity-90"
        >
          Apply
        </button>
        <button
          onClick={() => { setMin(bounds.min); setMax(bounds.max); onClear(); }}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-base hover:text-foreground"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-md border px-3 py-1.5 text-xs font-medium transition-base disabled:opacity-40 hover:bg-muted"
      >
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold transition-base ${p === page ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-md border px-3 py-1.5 text-xs font-medium transition-base disabled:opacity-40 hover:bg-muted"
      >
        Next
      </button>
    </div>
  );
}
