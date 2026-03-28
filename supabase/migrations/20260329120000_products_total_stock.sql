-- Total stock = capacity for "remaining / total" on POS; stock = units left (decremented on sale).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS total_stock integer;

UPDATE public.products
SET total_stock = stock
WHERE total_stock IS NULL;

ALTER TABLE public.products
  ALTER COLUMN total_stock SET NOT NULL,
  ALTER COLUMN total_stock SET DEFAULT 0;

COMMENT ON COLUMN public.products.stock IS 'Remaining units available (decreases on POS sale)';
COMMENT ON COLUMN public.products.total_stock IS 'Total capacity for display as remaining/total; increase when restocking';
