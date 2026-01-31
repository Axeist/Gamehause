-- Update admin user credentials for Gamehause branding
-- Change username from Nerfturf_admin (and other legacy values) to Gamehause_admin
-- and set password to Gamehause@123.
--
-- NOTE: This app uses a custom username/password table (`admin_users`) and compares
-- passwords in plaintext in the client. If you later migrate to hashed passwords,
-- update this accordingly.

-- 1) If the target account already exists, ensure its password/admin flag.
UPDATE public.admin_users
SET
  password = 'Gamehause@123',
  is_admin = true
WHERE username = 'Gamehause_admin';

-- 2) Rename legacy admin usernames to the target username, but only if the
-- target username doesn't already exist (prevents unique constraint conflicts).
UPDATE public.admin_users
SET
  username = 'Gamehause_admin',
  password = 'Gamehause@123',
  is_admin = true
WHERE username IN (
  'Nerfturf_admin',
  'nerfturf_admin',
  'Gamehaus_admin',
  'tipntop_admin'
)
AND NOT EXISTS (
  SELECT 1 FROM public.admin_users WHERE username = 'Gamehause_admin'
);

-- 3) If no admin user exists at all, create the target admin.
INSERT INTO public.admin_users (username, password, is_admin)
SELECT 'Gamehause_admin', 'Gamehause@123', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_users WHERE is_admin = true
);

-- 4) Ensure the target user is marked as admin (idempotent).
UPDATE public.admin_users
SET is_admin = true
WHERE username = 'Gamehause_admin';

