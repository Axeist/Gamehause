-- Update admin user credentials for Gamehaus rebrand
-- Change username from tipntop_admin to Gamehaus_admin and password to Gamehaus@123

UPDATE public.admin_users
SET 
  username = 'Gamehaus_admin',
  password = 'Gamehaus@123'
WHERE username = 'tipntop_admin' OR is_admin = true;

-- If no admin user exists, create one
INSERT INTO public.admin_users (username, password, is_admin)
SELECT 'Gamehaus_admin', 'Gamehaus@123', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_users WHERE is_admin = true
);

