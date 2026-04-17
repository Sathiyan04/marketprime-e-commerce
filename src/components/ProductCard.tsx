import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { formatINR, discountPct } from "@/lib/format";

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  original_price: number | null;
  rating: number;
  rating_count: number;
  image_url: string;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const off = discountPct(p.price, p.original_price);
  return (
    <Link
      to="/products/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-smooth hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={p.image_url}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition-smooth group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground shadow-soft">
            {off}% OFF
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {p.brand}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</h3>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
            {p.rating.toFixed(1)} <Star className="h-2.5 w-2.5 fill-current" />
          </div>
          <span className="text-[11px] text-muted-foreground">({p.rating_count.toLocaleString("en-IN")})</span>
        </div>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-display text-base font-semibold">{formatINR(p.price)}</span>
          {p.original_price && p.original_price > p.price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatINR(p.original_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
