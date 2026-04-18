import { useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  productId: string;
  hasPurchased: boolean;
  hasReviewed: boolean;
  onSubmitted?: () => void;
}

export function ReviewForm({ productId, hasPurchased, hasReviewed, onSubmitted }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm">
        <p className="text-muted-foreground">
          <a href="/login" className="font-medium text-accent hover:underline">Sign in</a> to write a review.
        </p>
      </div>
    );
  }
  if (hasReviewed) {
    return (
      <div className="rounded-xl border bg-success/5 p-5 text-sm">
        <p className="font-medium text-success">Thanks — your review is published.</p>
      </div>
    );
  }
  if (!hasPurchased) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm">
        <p className="text-muted-foreground">Only customers who have purchased this product can write a review.</p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      product_id: productId,
      rating,
      title: title || null,
      body: body || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Review posted — thank you!");
    onSubmitted?.();
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-card p-5">
      <h3 className="font-display text-base font-bold">Write a review</h3>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} stars`}
            className="p-0.5"
          >
            <Star
              className={`h-6 w-6 transition-base ${
                (hover || rating) >= n ? "fill-accent text-accent" : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 text-xs text-muted-foreground">{rating} of 5</span>}
      </div>
      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-4 h-10 w-full rounded-md border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        maxLength={100}
      />
      <textarea
        placeholder="Share your experience with this product…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={1000}
        className="mt-3 w-full rounded-md border bg-surface p-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
      <Button
        type="submit"
        disabled={submitting}
        className="mt-4 h-10 rounded-full bg-primary px-6 text-primary-foreground hover:opacity-90"
      >
        {submitting ? "Posting…" : "Submit review"}
      </Button>
    </form>
  );
}
