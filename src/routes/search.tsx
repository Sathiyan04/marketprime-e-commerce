import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Browse — MarketPrime" }] }),
  component: SearchPage,
});

async function fetchAll(): Promise<ProductCardData[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title, brand, price, original_price, rating, rating_count, image_url, category");
  if (error) throw error;
  return (data ?? []) as never;
}

function SearchPage() {
  const { q, category } = Route.useSearch();
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useQuery({ queryKey: ["all-products"], queryFn: fetchAll });

  const filtered = products.filter((p: any) => {
    if (category && p.category !== category) return false;
    if (q && !`${p.title} ${p.brand}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const cats = ["Electronics", "Fashion", "Home", "Books"];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{category || (q ? `Results for "${q}"` : "All products")}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} items</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate({ to: "/search", search: {} })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-base ${!category ? "bg-primary text-primary-foreground" : "border bg-surface text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => navigate({ to: "/search", search: { category: c } })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-base ${category === c ? "bg-primary text-primary-foreground" : "border bg-surface text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="mt-12 text-center text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">No products match your filters.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
