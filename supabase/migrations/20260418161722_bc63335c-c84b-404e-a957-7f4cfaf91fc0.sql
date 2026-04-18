-- Add cancellation_reason to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Refund status enum
DO $$ BEGIN
  CREATE TYPE public.refund_status AS ENUM ('pending', 'processed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  status public.refund_status NOT NULL DEFAULT 'pending',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own refunds"
ON public.refunds FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: only the trigger (SECURITY DEFINER) writes.

CREATE TRIGGER update_refunds_updated_at
BEFORE UPDATE ON public.refunds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cancellation handler: restock + log refund for prepaid
CREATE OR REPLACE FUNCTION public.handle_order_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    -- Restock items
    FOR item IN
      SELECT product_id, quantity FROM public.order_items
      WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      UPDATE public.products
      SET stock = stock + item.quantity
      WHERE id = item.product_id;
    END LOOP;

    -- Log refund for prepaid orders (anything other than COD)
    IF lower(NEW.payment_method) <> 'cod' THEN
      INSERT INTO public.refunds (order_id, user_id, amount, status, reason)
      VALUES (NEW.id, NEW.user_id, NEW.total, 'pending', NEW.cancellation_reason);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_cancelled ON public.orders;
CREATE TRIGGER on_order_cancelled
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_cancellation();