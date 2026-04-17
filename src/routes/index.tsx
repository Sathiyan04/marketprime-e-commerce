import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Truck, ShieldCheck, RotateCcw, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { useChatContext } from "@/stores/chat-context";
import { formatINR, discountPct } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketPrime — Curated essentials, delivered fast" },
      { name: "description", content: "Premium electronics, fashion, home & books. Fast delivery, easy returns." },
    ],
  }),
  component: HomePage,
});

async function fetchProducts(): Promise<ProductCardData[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title, brand, price, original_price, rating, rating_count, image_url, category, is_deal_of_day, deal_ends_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as never;
}

function HomePage() {
  const setPage = useChatContext((s) => s.setPage);
  useEffect(() => { setPage({ kind: "home" }); }, [setPage]);

  const { data: products = [], isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const deal = products.find((p: any) => p.is_deal_of_day);
  const byCategory = (cat: string) => products.filter((p: any) => p.category === cat);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" /> New season, fresh finds
            </span>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Premium essentials,<br />
              <span className="bg-gradient-accent bg-clip-text text-transparent">honestly priced.</span>
            </h1>
            <p className="max-w-md text-base text-primary-foreground/75">
              Hand-picked products across electronics, fashion, home and books.
              Fast delivery, real reviews, no nonsense.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/search"
                search={{ category: "Electronics" } as never}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-glow transition-base hover:opacity-90"
              >
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/search"
                search={{} as never}
                className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-semibold transition-base hover:bg-white/10"
              >
                Browse catalog
              </Link>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="aspect-square overflow-hidden rounded-3xl bg-gradient-accent shadow-glow">
              <img
                src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80"
                alt="Featured product"
                className="h-full w-full object-cover mix-blend-multiply opacity-90"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-card p-4 text-card-foreground shadow-elevated">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Trending</p>
              <p className="mt-0.5 text-sm font-semibold">Lumen X Smartwatch</p>
              <p className="text-xs text-accent">From ₹8,999</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b bg-surface-elevated">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 py-6 md:grid-cols-3">
          <Trust icon={Truck} title="Free delivery" subtitle="On orders over ₹999" />
          <Trust icon={RotateCcw} title="Easy returns" subtitle="7-day no-questions" />
          <Trust icon={ShieldCheck} title="Secure checkout" subtitle="Bank-grade encryption" />
        </div>
      </section>

      {/* Deal of the day */}
      {deal && <DealOfTheDay deal={deal as any} />}

      {/* Category rows */}
      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12">
        {isLoading && <div className="text-center text-sm text-muted-foreground">Loading products…</div>}
        <CategoryRow title="Electronics" products={byCategory("Electronics") as any} />
        <CategoryRow title="Fashion" products={byCategory("Fashion") as any} />
        <CategoryRow title="Home & Living" products={byCategory("Home") as any} />
        <CategoryRow title="Books" products={byCategory("Books") as any} />
      </div>
    </div>
  );
}

function Trust({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function DealOfTheDay({ deal }: { deal: ProductCardData & { deal_ends_at: string } }) {
  const [tl, setTl] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(deal.deal_ends_at).getTime() - Date.now();
      if (diff <= 0) { setTl({ h: 0, m: 0, s: 0 }); return; }
      setTl({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deal.deal_ends_at]);

  const off = discountPct(deal.price, deal.original_price);

  return (
    <section className="mx-auto max-w-7xl px-6 pt-12">
      <div className="overflow-hidden rounded-3xl bg-gradient-deal text-accent-foreground shadow-elevated">
        <div className="grid items-center gap-6 p-6 md:grid-cols-[260px_1fr_auto] md:p-8">
          <div className="aspect-square overflow-hidden rounded-2xl bg-black/10">
            <img src={deal.image_url} alt={deal.title} className="h-full w-full object-cover" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Deal of the day
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight md:text-3xl">{deal.title}</h2>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold">{formatINR(deal.price)}</span>
              <span className="text-base line-through opacity-70">{formatINR(deal.original_price ?? 0)}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs font-bold">{off}% OFF</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">Ends in</span>
              <TimeBox v={tl.h} l="h" />
              <TimeBox v={tl.m} l="m" />
              <TimeBox v={tl.s} l="s" />
            </div>
          </div>
          <Link
            to="/products/$slug"
            params={{ slug: deal.slug }}
            className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-base hover:opacity-90"
          >
            Grab the deal <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function TimeBox({ v, l }: { v: number; l: string }) {
  return (
    <span className="inline-flex h-8 min-w-[40px] items-center justify-center rounded-md bg-black/25 px-2 font-mono text-sm font-bold tabular-nums">
      {String(v).padStart(2, "0")}{l}
    </span>
  );
}

function CategoryRow({ title, products }: { title: string; products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
        <Link
          to="/search"
          search={{ category: title === "Home & Living" ? "Home" : title } as never}
          className="text-sm font-medium text-accent hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
