INSERT INTO public.user_roles (user_id, role)
VALUES ('52c8ddea-ef37-4f15-a556-f70979a9910e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;