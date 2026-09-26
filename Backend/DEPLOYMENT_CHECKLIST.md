# 🚀 Deployment Checklist — Car Marketplace Backend

## Before deploying, verify every item below.

---

## 1. Environment Variables

Set ALL of these in your platform dashboard (Render / Railway). Never commit .env.

| Variable                   | Value                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | `production`                                                                                       |
| `PORT`                     | Set by platform automatically                                                                      |
| `MONGODB_URI`              | Your Atlas production connection string                                                            |
| `ACCESS_TOKEN_SECRET`      | Random 64-char hex string                                                                          |
| `REFRESH_TOKEN_SECRET`     | Different random 64-char hex string                                                                |
| `ACCESS_TOKEN_EXPIRY`      | `15m`                                                                                              |
| `REFRESH_TOKEN_EXPIRY`     | `7d`                                                                                               |
| `IMAGEKIT_PUBLIC_KEY`      | From ImageKit dashboard                                                                            |
| `IMAGEKIT_PRIVATE_KEY`     | From ImageKit dashboard                                                                            |
| `IMAGEKIT_URL_ENDPOINT`    | From ImageKit dashboard                                                                            |
| `ADMIN_SETUP_TOKEN`        | Long random token used only for initial admin setup                                                |
| `FRONTEND_URL`             | `https://your-frontend-domain.com` (no trailing slash)                                             |
| `IMAGEKIT_ORPHAN_GRACE_MS` | Optional; default `86400000` (24 hours) before an unreferenced `/cars` file is queued for deletion |

### Generate secure secrets (run locally):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run twice — use different values for ACCESS and REFRESH secrets.

---

## 2. MongoDB Atlas

- [ ] Created a production cluster (M0 free tier is fine to start)
- [ ] Whitelist deployment server IP under **Network Access**
  - Render/Railway: whitelist `0.0.0.0/0` (they use dynamic IPs)
  - VPS: whitelist your specific VPS IP
- [ ] Created a DB user with read/write permissions
- [ ] Connection string uses the correct DB name: `car-marketplace`
- [ ] Tested connection string locally before deploying

---

## 3. ImageKit

- [ ] Created an ImageKit account
- [ ] Verified the `cars/` folder appears after a test upload
- [ ] API credentials copied to platform env vars (never in code)

---

## 4. CORS

- [ ] `FRONTEND_URL` set to your exact production frontend URL
- [ ] No trailing slash: ✅ `https://frontend.com` ❌ `https://frontend.com/`
- [ ] NOT set to `*` in production

---

## 5. Platform Setup (Render)

1. Connect GitHub repo
2. Set **Build Command**: `npm install`
3. Set **Start Command**: `npm start` (runs `node src/server.js`)
4. Set **Node version**: 18+ (under Environment)
5. Add all env vars under **Environment** tab
6. Deploy

---

## 6. Post-Deploy Verification (Postman)

Switch Postman environment to Production URL and run:

| Test                                  | Expected                                          |
| ------------------------------------- | ------------------------------------------------- |
| `GET /`                               | `{ success: true, message: "Server running..." }` |
| `POST /api/admin/login`               | `200` with `accessToken`                          |
| `GET /api/cars`                       | `200` with cars array                             |
| `POST /api/cars` (with image)         | `201` — image appears in ImageKit                 |
| `GET /api/cars/search?keyword=Toyota` | `200` with results                                |
| Spam login 11 times                   | `429 Too Many Requests`                           |

### Listing consistency verification

- [ ] Confirm MongoDB indexes exist for `listingcreations.adminId_1_idempotencyKey_1`, `cars.creationOperationId`, and `imagecleanuptasks.operationKey`
- [ ] Submit the same listing twice with the same `Idempotency-Key`; only one Car document is created
- [ ] Delete a listing as both `superadmin` and `manager`; ImageKit files disappear before the Car document does
- [ ] Confirm the in-process cleanup worker runs every minute and the orphan reconciliation scan runs hourly
- [ ] Keep the Node server/proxy request timeout at least 135 seconds for the bounded multipart workflow

---

## 7. Security Checklist

- [ ] `.env` is in `.gitignore` — confirmed not pushed to GitHub
- [ ] `NODE_ENV=production` is set — disables stack traces in error responses
- [ ] `helmet()` applied — visible in response headers (`X-Frame-Options` etc.)
- [ ] Rate limiter active — test by spamming login endpoint
- [ ] `mongoSanitize()` applied — `$` and `.` stripped from inputs
- [ ] CORS restricted to frontend domain only
- [ ] Passwords stored as bcrypt hashes — verify in Atlas (never plain text)
- [ ] Refresh token in HttpOnly cookie — not visible in browser JS console
- [ ] CSRF token header is sent on all state-changing requests
- [ ] `GET /health/live` and `GET /health/ready` return expected status codes
- [ ] Access token expiry: 15m — not days or weeks

## 8. Initial Admin Setup

- [ ] Generate a unique `ADMIN_SETUP_TOKEN` and set it only in the backend environment
- [ ] Send the token in the `X-Admin-Setup-Token` header for the one-time `/api/admin/register` request
- [ ] Remove or rotate `ADMIN_SETUP_TOKEN` immediately after the first admin is created
- [ ] Confirm `/api/admin/register` returns `403` without the setup token
