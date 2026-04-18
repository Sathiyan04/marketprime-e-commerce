-- Wishlists
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wishlist" ON public.wishlists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wishlist" ON public.wishlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own wishlist" ON public.wishlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);

-- Coupons
CREATE TYPE public.coupon_type AS ENUM ('percent', 'flat');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type public.coupon_type NOT NULL,
  value NUMERIC NOT NULL CHECK (value > 0),
  min_order NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons readable by all" ON public.coupons
  FOR SELECT TO anon, authenticated USING (active = true);

-- Coupon redemptions
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID,
  discount_applied NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own redemptions" ON public.coupon_redemptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX idx_redemptions_user ON public.coupon_redemptions(user_id);

-- Add discount + coupon columns to orders
ALTER TABLE public.orders
  ADD COLUMN coupon_code TEXT,
  ADD COLUMN discount NUMERIC NOT NULL DEFAULT 0;

-- Allow users to delete their own pending orders (for cancellation, status enforced in app)
-- Actually use UPDATE to set status='cancelled' — already permitted by existing update policy.

-- Seed demo coupons
INSERT INTO public.coupons (code, type, value, min_order, description) VALUES
  ('WELCOME10', 'percent', 10, 0, '10% off your first order'),
  ('FLAT100', 'flat', 100, 499, '₹100 off on orders above ₹499'),
  ('FREESHIP', 'flat', 49, 0, 'Free shipping on any order');