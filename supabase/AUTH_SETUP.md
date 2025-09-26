# Supabase Auth Setup (Email + Password)

1) Supabase → Authentication → Providers → Email:
   - Enable "Email provider"
   - "Confirm email" = Enabled (send confirmation on sign up)
   - Site URL: your production URL (e.g., https://cashbook.savvyrilla.tech)
   - Redirect URLs: add
     - http://localhost:3000/auth/reset
     - https://cashbook.savvyrilla.tech/auth/reset

2) Password reset uses redirect URL /auth/reset.

3) Disable Magic Link provider entirely (optional).
