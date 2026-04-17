import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Star, Truck, ShieldCheck, RotateCcw, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores/cart";
import { useChatContext } from "@/stores/chat-context";
import { formatINR, discountPct } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
});

async function fetchProduct(slug: string) {
  const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchReviews(productId: string) {
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, title, body, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const add = useCart((s) => s.add);
  const setPage = useChatContext((s) => s.setPage);

  const { data: p, isLoading } = useQuery({ queryKey: ["product", slug], queryFn: () => fetchProduct(slug) });
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", p?.id], queryFn: () => fetchReviews(p!.id), enabled: !!p?.id,
  });

  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (p) {
      setPage({
        kind: "product", productId: p.id, title: p.title, price: Number(p.price),
        stock: p.stock, brand: p.brand, category: p.category,
      });
    }
  }, [p, setPage]);

  if (isLoading) return <div className="mx-auto max-w-7xl px-6 py-12 text-center text-muted-foreground">Loading…</div>;
  if (!p) return <div className="mx-auto max-w-7xl px-6 py-12 text-center">Product not found.</div>;

  const gallery = z.array(z.string()).safeParse(p.gallery).success
    ? (p.gallery as string[])
    : [p.image_url];
  const off = discountPct(Number(p.price), p.original_price ? Number(p.original_price) : null);
  const inStock = p.stock > 0;

  const onAdd = () => {
    add({ productId: p.id, slug: p.slug, title: p.title, price: Number(p.price), imageUrl: p.image_url }, qty);
    toast.success(`${p.title} added to cart`);
  };
  const onBuy = () => { onAdd(); navigate({ to: "/checkout" }); };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div
            className="relative aspect-square overflow-hidden rounded-2xl border bg-card"
            onMouseEnter={() => setZoom((z) => ({ ...z, on: true }))}
            onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ on: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
          >
            <img
              src={gallery[active]}
              alt={p.title}
              className="h-full w-full object-cover transition-smooth"
              style={zoom.on ? { transformOrigin: `${zoom.x}% ${zoom.y}%`, transform: "scale(1.8)" } : undefined}
            />
            {off > 0 && (
              <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-soft">
                {off}% OFF
              </span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-4 flex gap-3">
              {gallery.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-20 w-20 overflow-hidden rounded-md border-2 transition-base ${active === i ? "border-accent" : "border-transparent opacity-70"}`}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{p.brand} • {p.category}</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight">{p.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              {Number(p.rating).toFixed(1)} <Star className="h-3 w-3 fill-current" />
            </div>
            <span className="text-xs text-muted-foreground">({p.rating_count.toLocaleString("en-IN")} ratings)</span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold">{formatINR(Number(p.price))}</span>
            {p.original_price && (
              <>
                <span className="text-base text-muted-foreground line-through">{formatINR(Number(p.original_price))}</span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">You save {formatINR(Number(p.original_price) - Number(p.price))}</span>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Inclusive of all taxes</p>

          <div className="mt-5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${inStock ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`} />
              {inStock ? `In stock — ${p.stock} available` : "Out of stock"}
            </span>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{p.description}</p>

          {/* Quantity + actions */}
          <div className="mt-7 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-base hover:text-foreground">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums">{qty}</span>
              <button onClick={() => setQty(Math.min(p.stock, qty + 1))} className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-base hover:text-foreground">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={onAdd} disabled={!inStock} className="h-12 flex-1 rounded-full bg-secondary text-secondary-foreground hover:bg-muted">Add to cart</Button>
            <Button onClick={onBuy} disabled={!inStock} className="h-12 flex-1 rounded-full bg-accent text-accent-foreground shadow-glow hover:opacity-90">Buy now</Button>
          </div>

          {/* Trust */}
          <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border bg-surface-elevated p-4 text-xs">
            <Trust icon={Truck} label="Free delivery" />
            <Trust icon={RotateCcw} label="7-day returns" />
            <Trust icon={ShieldCheck} label="Secure checkout" />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16">
        <h2 className="font-display text-xl font-bold">Customer reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No reviews yet — be the first to share your experience.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {reviews.map((r: any) => (
              <li key={r.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                  ))}</div>
                  {r.title && <p className="text-sm font-semibold">{r.title}</p>}
                </div>
                {r.body && <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Trust({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center text-muted-foreground">
      <Icon className="h-5 w-5 text-accent" />
      <span className="font-medium text-foreground">{label}</span>
    </div>
  );
}
