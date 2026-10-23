# Supabase authentication and protected dashboard API

## Required environment variables

Configure these under **Vercel → Project → Settings → Environment Variables** for Production (and Preview/Development if needed):

| Name | Value | Exposure |
|---|---|---|
| `SUPABASE_URL` | Supabase Project URL, e.g. `https://PROJECT_REF.supabase.co` | Server |
| `SUPABASE_ANON_KEY` | Supabase anon/publishable key | Server-side API uses this to validate bearer tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret key | **Server only; never expose to browser** |

The static pages also load `/supabase-config.js` from `public/supabase-config.js`. Replace its `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` placeholders with the same project URL and anon/publishable key. The anon key is designed to be public; row-level security and server authorization are still required. Do not add `VITE_` to the service-role key.

A local `.env.example` is included as a template. Copy it to `.env.local` for local serverless development and never commit real secrets. Redeploy after setting environment variables.

## Supabase setup

1. Open the correct Supabase project and go to **SQL Editor**.
2. Run `supabase/migrations/202610230001_secure_dashboard.sql`. This creates profiles, transactions, trades, KYC status, administrator membership, audit logging, row-level security policies, and a restricted transaction-review function.
3. Run `supabase/migrations/202610230002_backfill_profiles.sql` to create profile rows for accounts that existed before the profile trigger was installed.
4. In **Authentication → URL Configuration**, set the Site URL to your production origin and add `https://YOUR_DOMAIN/login.html` to the allowed redirect URLs. Add your preview/local URLs only if needed.
5. In **Authentication → Providers**, enable Google and configure Google's OAuth client ID/secret and redirect URI using the callback URI Supabase displays. Email-link authentication must be enabled and email delivery configured.
6. Sign in once with the account that should be an administrator. In the Supabase SQL Editor, run the following after replacing the UUID with that account's actual Auth user ID:

   ```sql
   insert into public.admin_users (user_id, is_active)
   values ('REPLACE_WITH_AUTH_USER_UUID', true)
   on conflict (user_id) do update set is_active = true;
   ```

   Get the UUID from **Authentication → Users**. Never let users self-assign an admin role through client metadata or the browser.

## Endpoints

- `GET /api/dashboard`: requires a valid Supabase bearer token; returns only the signed-in user's profile, transactions, trades, and KYC status.
- `POST /api/transactions`: creates a pending deposit/withdrawal *request* owned by the authenticated user. It does not move funds or execute a trade.
- `GET /api/admin/users`: requires a valid session and active `admin_users` membership.
- `GET /api/admin/transactions`: returns pending/under-review requests to active admins.
- `PATCH /api/admin/transactions`: permits only `UNDER_REVIEW`, `COMPLETED`, or `REJECTED` status changes through a server-side database function and audit log. A status change does not transfer money.

All endpoints reject unauthenticated requests. The service-role key is only read by server-side API code. Direct browser reads are additionally constrained by row-level security. The admin table is not an authorization boundary; the server's `admin_users` check is.

## Build and deployment

The Vite multi-page build includes `index.html`, `login.html`, `dashboard.html`, `admin.html`, `crude-oil.html`, and `real-estate.html`. Vercel serves the `api/` JavaScript files as serverless functions and the built pages as static assets. After configuring Supabase and the Vercel environment variables, redeploy and test:
- a signed-out request to `/api/dashboard` returns 401;
- a signed-in regular user can only see their own dashboard data;
- a regular user receives 403 from admin endpoints;
- the configured admin can list users and review pending requests.

## Current limitations

This layer does not initiate blockchain transfers, bank payments, trading execution, or profit payouts. Deposit and withdrawal records are requests only. KYC stores a status and optional document path; upload storage and identity-document processing are not implemented. Before handling real funds or identity documents, add independently verified payment callbacks/manual reconciliation, private storage policies, rate limiting, monitoring, backups, and a security review.
