-- Add plan_name and features to subscription table
ALTER TABLE public.subscription 
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS booking_access BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS staff_management_access BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_custom_end_date BOOLEAN NOT NULL DEFAULT false;

-- Update existing records
UPDATE public.subscription 
SET plan_name = 'Silver Basic',
    booking_access = false,
    staff_management_access = false
WHERE plan_name IS NULL;

