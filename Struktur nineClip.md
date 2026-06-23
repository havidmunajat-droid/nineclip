## 🏗️ ARSITEKTUR PLATFORM VIDEO CLIP SAAS 

## 1. SYSTEM ARCHITECTURE 

text 

```
│
│
│  ┌────────────────────────────────────────────────────────────────────┐
│
│  │  PRIMARY DATABASE (PostgreSQL)
│     │
│  │  - Users, Subscriptions, Payments, Metadata                         │
│
│  │  - Read replica untuk read-heavy queries                            │
│
│  │  - Connection pooling (PgBouncer)                                   │
│
│  │  - Partitioning berdasarkan created_at untuk tabel besar            │
│
│  └────────────────────────────────────────────────────────────────────┘
│
│
│
│  ┌────────────────────────────────────────────────────────────────────┐
│
│  │  SEARCH ENGINE (Elasticsearch / Meilisearch)                        │
│
│  │  - Full-text search video titles, descriptions, tags               │
│
│  │  - Faceted search (category, duration, resolution, date range)     │
│
│  │  - Fuzzy matching & typo tolerance                                  │
│
│  │  - Indexing dari CDC (Change Data Capture) via Debezium            │
│
│  └────────────────────────────────────────────────────────────────────┘
│
│
│
│  ┌────────────────────────────────────────────────────────────────────┐
│
│  │  CACHE LAYER (Redis Cluster)                                       │
│
│  │  - Session store                                                    │
│
│  │  - API response cache (TTL-based)                                   │
│
│  │  - Video view counter (batch write ke DB)                          │
│
│  │  - Trending calculation (sorted set dengan decay)                  │
│
```

```
│  │  - Rate limiting counters                                           │
│
│  └────────────────────────────────────────────────────────────────────┘
│
│
│
│  ┌────────────────────────────────────────────────────────────────────┐
│
│  │  OBJECT STORAGE + CDN                                              │
│
│  │  - S3 / GCS untuk raw & transcoded videos                          │
│
│  │  - CloudFront / Cloudflare R2 untuk delivery                       │
│
│  │  - Signed URLs untuk akses terproteksi (berdasarkan subscription)  │
│
│  │  - Pre-signed upload URLs untuk direct client upload               │
│
│  └────────────────────────────────────────────────────────────────────┘
│
│
│
│  ┌────────────────────────────────────────────────────────────────────┐
│
│  │  TIME-SERIES / ANALYTICS (ClickHouse / TimescaleDB)                │
│
│  │  - Page views, video plays, watch duration per user               │
│
│  │  - Real-time dashboard metrics                                     │
│
│  │  - Retention analysis                                               │
│
│  └────────────────────────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────────────────
────┘
```

```
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────
────┐
│                       OBSERVABILITY LAYER
│
│
│
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────────────┐
│
│  │  Logging   │  │  Metrics   │  │  Tracing   │  │  Alerting        │
│
│  │  (Loki /   │  │  (Promethe-│  │  (Jaeger / │  │  (PagerDuty /    │
│
│  │   ELK)     │  │   us +     │  │   Tempo)   │  │   Slack Webhook) │
│
│  │            │  │   Grafana) │  │            │  │                   │
│
```

```
│  └────────────┘  └────────────┘  └────────────┘  └───────────────────┘
```

```
│
```

```
└─────────────────────────────────────────────────────────────────────────
────┘
```

## Alur Data Penting: 

## Upload Flow: 

## text 

```
Client ──▶ Request upload URL ──▶ API ──▶ Generate pre-signed S3 URL
```

```
Client ──▶ Direct upload ke S3 (bypass server)
```

```
S3 Event ──▶ SNS/SQS ──▶ Video Worker terima event
```

```
Worker ──▶ Transcode (multi-resolution HLS) ──▶ Simpan ke S3
Worker ──▶ Extract thumbnail ──▶ Simpan ke S3
```

```
Worker ──▶ Update metadata ke PostgreSQL
```

```
Worker ──▶ Index ke Elasticsearch
```

```
Worker ──▶ Notify admin via WebSocket/Notification Service
```

## Playback Flow: 

## text 

```
Client ──▶ Request video ──▶ API Gateway
API ──▶ Check subscription entitlement (Redis cache → DB fallback)
API ──▶ Jika valid, generate signed CDN URL (TTL 2 jam)
Client ──▶ Fetch m3u8 manifest dari CDN
Client ──▶ HLS player adaptive streaming
Client ──▶ Send heartbeat (watch progress) secara batch ke API
API ──▶ Buffer di Redis, flush ke ClickHouse setiap 30 detik
```

## 2. UI ARCHITECTURE 

## text 

```
┌─────────────────────────────────────────────────────────────────────────
```

```
────┐
```

- `│                         ROUTING STRUCTURE │` 

```
│
│
```

```
│  /                           → Landing Page (Public)
│
```

- `│  /pricing                    → Pricing & Plans (Public) │` 

```
│  /login                      → Login Page
│
```

```
│  /register                   → Register Page
│
│  /forgot-password            → Password Reset Flow
│
```

```
│  /verify-email/:token        → Email Verification
│
```

```
│
│
│  /dashboard                  → User Dashboard (Auth Required)
│
│  /browse                     → Video Browser / Catalog
│
│  /browse/:category           → Category Filtered View
│
│  /search                     → Search Results
│
│  /video/:slug                → Video Player Page
│
│  /playlist/:id               → Playlist Viewer
│
│  /bookmarks                  → User Bookmarks
│
│  /history                    → Watch History
│
│  /account                    → Account Settings
│
│  /account/subscription       → Subscription Management
│
│  /account/billing            → Billing History & Invoices
│
│
│
│  /admin                      → Admin Dashboard (Admin Only)
│
│  /admin/videos               → Video Management
│
│  /admin/videos/upload        → Upload Flow
│
│  /admin/videos/:id/edit      → Edit Video
│
│  /admin/categories           → Category Management
│
│  /admin/users                → User Management
│
│  /admin/subscriptions        → Subscription Overview
│
│  /admin/analytics            → Analytics Dashboard
│
│  /admin/settings             → Platform Settings
│
│  /admin/coupons              → Coupon Management
│
└─────────────────────────────────────────────────────────────────────────
────┘
```

## Component Architecture (Atomic Design) 

text 

```
┌─────────────────────────────────────────────────────────────────────────
────┐
```

```
│                           ATOMS
│
│
│
│  Button, Input, Badge, Avatar, Icon, Spinner,
│
│  Tooltip, Toggle, Checkbox, Radio, Select,
│
│  VideoThumbnail, DurationBadge, ResolutionTag,
│
│  ProgressBar, Skeleton, Divider, Typography
│
└─────────────────────────────────────────────────────────────────────────
────┘
```

```
                                    │
```

```
                                    ▼
```

```
┌─────────────────────────────────────────────────────────────────────────
────┐
│                          MOLECULES
│
│
│
│  SearchBar (Input + Icon + Suggestions Dropdown)
│
│  VideoCard (Thumbnail + Duration + Title + Meta)
│
│  CategoryChip (Tag + Count + Active State)
│
│  PlanCard (Price + Features + CTA Button)
│
│  SubscriptionBadge (Tier + Expiry + Status)
│
│  FilterDropdown (Label + Options + Multi-select)
│
│  VideoPlayerControls (Play/Pause + Seek + Volume + Quality)
│
│  NotificationToast (Icon + Message + Dismiss)
│
└─────────────────────────────────────────────────────────────────────────
────┘
```

```
                                    │
```

```
                                    ▼
```

```
┌─────────────────────────────────────────────────────────────────────────
────┐
│                          ORGANISMS
│
│
│
│  Header (Logo + SearchBar + Nav + UserMenu + SubscriptionStatus)
│
│  VideoGrid (Grid + VideoCard[] + Pagination/InfiniteScroll)
│
│  VideoPlayer (HLS Player + Controls + RelatedVideos Sidebar)
│
```

```
│  Sidebar (Navigation + UserStats + QuickActions)
│
│  PricingTable (PlanCard[] + Toggle Monthly/Yearly + FAQ)
│
│  UploadDropzone (Drag&Drop + Progress + Preview + Metadata Form)
│
│  AdminVideoTable (Table + Sort + Filter + BulkActions + Pagination)
│
│  AnalyticsChart (Chart + DateRange + MetricSelector + Export)
│
│  SubscriptionModal (CurrentPlan + UpgradeOptions + PaymentForm)
│
│  WatchHistoryList (Timeline + VideoCard + ContinueWatching)
│
```

```
└─────────────────────────────────────────────────────────────────────────
────┘
```

```
                                    │
```

```
                                    ▼
```

```
┌─────────────────────────────────────────────────────────────────────────
────┐
│                          TEMPLATES
│
│
│
│  PublicTemplate     → Header + Slot + Footer
│
│  DashboardTemplate  → Sidebar + Header + Slot
│
│  AdminTemplate      → AdminSidebar + AdminHeader + Slot
│
│  VideoTemplate      → MinimalHeader + FullWidthPlayer + Content
│
│  AuthTemplate       → SplitLayout (Illustration + Form)
│
│  EmbedTemplate      → BarePlayer (no chrome, for OEmbed)
│
└─────────────────────────────────────────────────────────────────────────
────┘
```

```
                                    │
```

```
                                    ▼
```

```
┌─────────────────────────────────────────────────────────────────────────
────┐
│                            PAGES
│
│
│
│  LandingPage, PricingPage, LoginPage, RegisterPage,
│
│  BrowsePage, VideoPage, SearchPage, PlaylistPage,
│
│  DashboardPage, BookmarksPage, HistoryPage, AccountPage,
│
│  AdminDashboardPage, AdminVideosPage, AdminUploadPage,
│
```

```
│  AdminAnalyticsPage, AdminUsersPage, AdminSettingsPage
│
└─────────────────────────────────────────────────────────────────────────
────┘
```

## State Management Architecture 

## text 

```
┌─────────────────────────────────────────────────────────────────────────
────┐
```

```
│                        STATE LAYERS
│
```

```
│
│
```

```
│  ┌───────────────────────────────────────────────────────────────────┐
│
```

```
│  │  SERVER STATE (React Query / TanStack Query / SWR)                │
│
```

```
│  │                                                                    │
│
│  │  - Video list, video detail, search results                       │
│
```

```
│  │  - User profile, subscription status                              │
│
│  │  - Admin: analytics data, user list, video management             │
│
│  │  - Stale time, cache time, background refetch                     │
│
│  │  - Optimistic updates untuk bookmark, like                        │
│
│  │  - Pagination dengan infinite query                               │
│
│  └───────────────────────────────────────────────────────────────────┘
│
│
│
│  ┌───────────────────────────────────────────────────────────────────┐
│
```

```
│  │  CLIENT STATE (Zustand / Jotai)                                   │
│
│  │                                                                    │
│
│  │  - UI state: sidebar open/closed, modal visibility                │
│
│  │  - Player state: current time, volume, quality, playing/paused    │
│
│  │  - Filter state: active category, sort, resolution filter         │
│
│  │  - Temporary form state sebelum submit                            │
│
│  └───────────────────────────────────────────────────────────────────┘
│
```

```
│
│
```

```
│  ┌───────────────────────────────────────────────────────────────────┐
│
│  │  URL STATE (Router / Search Params)                               │
│
│  │                                                                    │
│
│  │  - Current page, category slug, search query                      │
│
│  │  - Sort order, page number, active filters                        │
│
│  │  - Shareable & bookmarkable state                                 │
│
│  └───────────────────────────────────────────────────────────────────┘
│
│
│
│  ┌───────────────────────────────────────────────────────────────────┐
│
│  │  PERSISTENT STATE (LocalStorage / IndexedDB)                      │
│
│  │                                                                    │
│
│  │  - Watch progress per video (resume playback)                     │
│
│  │  - User preferences (theme, default quality)                      │
│
│  │  - Recently viewed (offline-capable)                              │
│
│  └───────────────────────────────────────────────────────────────────┘
│
```

```
└─────────────────────────────────────────────────────────────────────────
────┘
```

## Tech Stack Rekomendasi UI 

|LAYER|TEKNOLOGI|ALASAN|
|---|---|---|
||||
|Framework<br>Next.js 14+ (App Router)<br>SSR/SSG, SEO, image optimization, routing built-in<br>Styling<br>Tailwind CSS + CVA (class-variance-authority)<br>Consistent, maintainable, dark mode native<br>Components Radix UI / shadcn/ui<br>Accessible, unstyled, composable<br>State Server<br>TanStack Query v5<br>Caching, revalidation, optimistic updates<br>State Client<br>Zustand<br>Minimal boilerplate, good TypeScript support<br>Video Player Video.js / HLS.js + custom controls<br>HLS adaptive streaming, extensible<br>Animation<br>Framer Motion<br>Page transitions, micro-interactions<br>Forms<br>React Hook Form + Zod<br>Performance, validation schema sharing dengan backend|||



|LAYER|TEKNOLOGI|ALASAN|
|---|---|---|
||||
|i18n<br>next-intl<br>Jika multi-bahasa diperlukan|||



## 3. SKEMA DATABASE 

sql 

```
CREATE INDEX idx_watch_history_user ON watch_history(user_id, updated_at
DESC);
```

```
CREATETABLE bookmarks (
    id          UUID PRIMARYKEYDEFAULT gen_random_uuid(),
    user_id     UUID NOTNULLREFERENCES users(id) ONDELETECASCADE,
    video_id    UUID NOTNULLREFERENCES videos(id) ONDELETECASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(user_id, video_id)
);
```

```
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
```

```
CREATETABLE downloads (
    id              UUID PRIMARYKEYDEFAULT gen_random_uuid(),
    user_id         UUID NOTNULLREFERENCES users(id) ONDELETECASCADE,
    video_id        UUID NOTNULLREFERENCES videos(id),
    resolution      VARCHAR(10)NOTNULL,
    download_token  VARCHAR(255)NOTNULLUNIQUE,
    expires_at      TIMESTAMPTZ NOTNULL,
    downloaded_at   TIMESTAMPTZ,
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

```
CREATE INDEX idx_downloads_user ON downloads(user_id);
CREATE INDEX idx_downloads_token ON downloads(download_token);
```

```
-- ============================================================
```

```
-- ADMIN & SYSTEM
```

```
-- ============================================================
```

```
CREATETABLE upload_jobs (
    id              UUID PRIMARYKEYDEFAULT gen_random_uuid(),
    video_id        UUID REFERENCES videos(id),
    user_id         UUID NOTNULLREFERENCES users(id),
    status          VARCHAR(20)NOTNULLDEFAULT'queued',
-- queued,processing, completed, failed
```

```
    original_path   TEXT NOTNULL,
    output_path     TEXT,
    error_message   TEXT,
    progress        INTDEFAULT0,-- 0-100
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

`CREATE TABLE audit_logs ( id          UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id     UUID REFERENCES users(id), action VARCHAR(50) NOT NULL, -- video.create, user.update, subscription.cancel entity_type VARCHAR(50) NOT NULL,       -- video, user, subscription, payment entity_id   UUID, old_values  JSONB, new_values  JSONB, ip_address  INET, user_agent  TEXT, created_at  TIMESTAMPTZ DEFAULT NOW() ); CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC); CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id); CREATE TABLE system_settings ( key VARCHAR(100) PRIMARY KEY, value       JSONB NOT NULL, description TEXT, updated_at  TIMESTAMPTZ DEFAULT NOW() ); -- Contoh data: default_watermark, max_upload_size, allowed_formats, maintenance_mode, dll` Partitioning Strategy (untuk scale) 

sql `-- Partition watch_history by month (untuk jutaan record) -- Ini dilakukan setelah data mulai besar CREATE TABLE watch_history_2025_01 PARTITION OF watch_history FOR VALUES FROM ('2025-01-01') TO ('2025-02-01'); CREATE TABLE watch_history_2025_02 PARTITION OF watch_history FOR VALUES FROM ('2025-02-01') TO ('2025-03-01'); -- ... dst -- Partition audit_logs by month -- Partition payments by year` 

## 4. API ENDPOINTS 

text 

```
BASE URL: /api/v1
```

```
============================================================
AUTHENTICATION
```

```
============================================================
POST   /auth/register              → Register baru
POST   /auth/login                 → Login, return JWT + refresh token
POST   /auth/logout                → Revoke refresh token
POST   /auth/refresh               → Refresh access token
POST   /auth/forgot-password       → Kirim reset password email
POST   /auth/reset-password        → Reset password dengan token
POST   /auth/verify-email          → Verifikasi email
POST   /auth/oauth/:provider       → OAuth callback (Google, Apple, dll)
```

```
============================================================
USER PROFILE
```

```
============================================================
GET    /users/me                    → Profile sendiri
PATCH  /users/me                    → Update profile
PUT    /users/me/password           → Ganti password
PUT    /users/me/avatar             → Upload avatar
DELETE /users/me/account            → Hapus akun (soft delete + grace
period)
```

```
============================================================
SUBSCRIPTION & BILLING
============================================================
GET    /plans                       → List semua plan aktif
GET    /plans/:slug                 → Detail plan
GET    /subscription                → Subscription aktif user
POST   /subscription/checkout       → Create checkout session
POST   /subscription/cancel         → Cancel subscription
POST   /subscription/portal         → Redirect ke customer portal (Stripe)
POST   /subscription/upgrade        → Upgrade plan
GET    /payments                    → Riwayat pembayaran user
GET    /payments/:id                → Detail pembayaran
GET    /invoices                    → List invoice
GET    /invoices/:id/download       → Download PDF invoice
POST   /coupons/validate            → Validasi kode coupon
-- Webhooks (dari payment gateway)
POST   /webhooks/stripe             → Stripe webhook handler
POST   /webhooks/midtrans           → Midtrans webhook handler
============================================================
VIDEOS - PUBLIC / BROWSING
============================================================
GET    /videos                      → List video (paginated, filtered)
```

```
       ?category=<slug>
       ?tag=<slug>
       &to=<date>
```

## API Response Standard 

jsonc `// Success { "success": true, "data": { /* response data */ }, "meta": { "page": 1, "limit": 20, "total": 150, "total_pages": 8 } } // Error { "success": false, "error": { "code": "SUBSCRIPTION_EXPIRED", "message": "Your subscription has expired. Please renew to continue.", "details": { /* optional validation errors, etc */ } } } // List with pagination { "success": true, "data": [ { "id": "...", "title": "..." }, { "id": "...", "title": "..." } ], "meta": { "page": 1, "limit": 20, "total": 150, "total_pages": 8, "has_next": true, "has_prev": false } }` 

## Error Codes Convention 

text `AUTH_001    Invalid credentials AUTH_002    Token expired AUTH_003    Token invalid AUTH_004    Email not verified AUTH_005    Account suspended USER_001    User not found` 

```
USER_002    Email already registered
USER_003    Invalid email format
SUB_001     No active subscription
SUB_002     Subscription expired
SUB_003     Plan not found
SUB_004     Already subscribed to this plan
SUB_005     Downgrade not allowed during period
VIDEO_001   Video not found
VIDEO_002   Video not published
VIDEO_003   Access denied (tier too low)
VIDEO_004   Video still processing
VIDEO_005   Download not allowed for your plan
PAYMENT_001 Payment failed
PAYMENT_002 Payment not found
PAYMENT_003 Already refunded
PAYMENT_004 Coupon invalid
PAYMENT_005 Coupon expired
PAYMENT_006 Coupon usage limit reached
VALID_001   Validation error (details in response)
GENERIC_500 Internal server error
GENERIC_429 Rate limit exceeded
GENERIC_403 Forbidden
GENERIC_404 Not found
```

## 5. REKOMENDASI TAMBAHAN 

## 5.1 Security 

text 

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY MEASURES                             │
│                                                                  │
│  AUTHENTICATION                                                  │
│  ├── JWT access token (15 menit expiry)                         │
│  ├── JWT refresh token (7 hari, rotated)                        │
│  ├── Refresh token stored di HttpOnly cookie                    │
│  ├── Access token di memory (bukan localStorage)                │
│  ├── Rate limit: 5 login attempts / 15 menit per IP             │
│  └── Device fingerprinting untuk detect anomali                 │
│                                                                  │
│  AUTHORIZATION                                                   │
│  ├── RBAC: admin, editor, viewer, free_user                     │
│  ├── Entitlement check di setiap video request (cache di Redis) │
│  ├── Signed URLs untuk video streaming (TTL 2 jam)              │
│  └── IP-based geo-restriction (opsional per konten)            │
```

```
│                                                                  │
│  INPUT VALIDATION                                                │
│  ├── Zod schema validation di API layer                         │
│  ├── Parameterized queries (anti SQL injection)                 │
│  ├── Content-Security-Policy headers                            │
│  ├── XSS sanitization pada user-generated content               │
│  └── File upload validation (type, size, malware scan)          │
│                                                                  │
│  DATA PROTECTION                                                 │
│  ├── Encryption at rest (AES-256 untuk DB & S3)                 │
│  ├── Encryption in transit (TLS 1.3)                            │
│  ├── PII fields encrypted di DB level                           │
│  ├── GDPR: right to deletion, data export                       │
│  └── Password: bcrypt/scrypt dengan cost factor 12+            │
│                                                                  │
│  RATE LIMITING                                                   │
│  ├── Global: 100 req/min per IP                                 │
│  ├── Auth endpoints: 5 req/min per IP                           │
│  ├── Video playback: 60 req/min per user                        │
│  ├── Search: 30 req/min per user                                │
│  ├── Upload: 10 req/min per user                                │
│  └── Implementasi di Redis + middleware                         │
└─────────────────────────────────────────────────────────────────┘
```

## 5.2 Caching Strategy 

text 

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHING LAYERS                                │
│                                                                  │
│  L1: BROWSER CACHE                                               │
│  ├── Static assets: immutable cache (1 tahun)                    │
│  ├── API GET responses: Cache-Control header                    │
│  └── Service Worker: offline page caching                        │
│                                                                  │
│  L2: CDN EDGE CACHE                                              │
│  ├── Video m3u8 manifests: cache 1 jam                          │
│  ├── Video segments (.ts): cache 7 hari                         │
│  ├── Thumbnails: cache 30 hari                                  │
│  ├── HTML pages: cache 5 menit (stale-while-revalidate)         │
│  └── API responses: cache 1-5 menit (public endpoints)          │
│                                                                  │
│  L3: APPLICATION CACHE (Redis)                                   │
│  ├── User subscription status: TTL 5 menit                      │
│  ├── Video metadata: TTL 10 menit                               │
│  ├── Video list (browse): TTL 5 menit, cache per filter combo   │
│  ├── Search results: TTL 2 menit                                │
│  ├── Category tree: TTL 1 jam                                   │
│  ├── Trending videos: sorted set dengan score decay             │
│  │   score = (views * 1) + (likes * 5) + (bookmarks * 10)       │
│  │   decay: score *= 0.95 per hari                              │
│  ├── View counter: INCR di Redis, batch write ke DB setiap 5m  │
│  └── Session data: TTL sesuai refresh token                     │
│                                                                  │
│  CACHE INVALIDATION                                               │
```

```
│  ├── Write-through: update cache saat write                      │
│  ├── Event-driven: DB CDC trigger cache invalidation            │
│  ├── Tag-based: cache tags per video, per category              │
│  └── Manual purge: admin action trigger bulk invalidation       │
└─────────────────────────────────────────────────────────────────┘
```

## 5.3 Scalability Milestones 

text 

`┌─────────────────────────────────────────────────────────────────┐ │                 SCALE ROADMAP                                    │ │                                                                  │ │  PHASE 1: 0 - 10K users                                         │ │  ├── Monolith (NestJS single service)                           │ │  ├── Single PostgreSQL instance                                 │ │  ├── Single Redis instance                                      │ │  ├── S3 + CloudFront untuk video                                │ │  ├── AWS MediaConvert untuk transcode                            │ │  ├── Single server / small EC2 / Railway.app                    │ │  └── Est. cost: $200-500/bulan                                  │ │                                                                  │ │  PHASE 2: 10K - 100K users                                      │ │  ├── Split: Auth Service + Video Service + Billing Service      │ │  ├── PostgreSQL read replica                                     │ │  ├── Redis Cluster (3 nodes)                                    │ │  ├── Elasticsearch untuk search                                 │ │  ├── RabbitMQ untuk async jobs                                  │ │  ├── Docker + ECS Fargate                                       │ │  ├── CloudFront with multiple origins                           │ │  └── Est. cost: $1,000-3,000/bulan                              │ │                                                                  │ │  PHASE 3: 100K - 1M users                                       │ │  ├── Full microservices                                         │ │  ├── Kubernetes (EKS/GKE)                                       │ │  ├── PostgreSQL sharding (by user_id hash)                      │ │  ├── Redis Cluster (6+ nodes)                                   │ │  ├── Multi-region deployment                                    │ │  ├── Custom transcode farm (FFmpeg on GPU instances)            │ │  ├── ClickHouse untuk analytics                                 │ │  ├── Feature flags (LaunchDarkly / Unleash)                     │ │  └── Est. cost: $5,000-15,000/bulan                             │ │                                                                  │ │  PHASE 4: 1M+ users                                             │ │  ├── Multi-region active-active                                 │ │  ├── Global anycast CDN                                         │ │  ├── P2P-assisted delivery (WebRTC) untuk mengurangi bandwidth  │ │  ├── ML-powered recommendations                                 │ │  ├── Edge computing untuk personalization                       │ │  ├── Dedicated video encoding cluster                           │ │  └── Est. cost: $15,000-50,000+/bulan                           │ └─────────────────────────────────────────────────────────────────┘` 5.4 Monitoring & Alerting 

text 

```
┌─────────────────────────────────────────────────────────────────┐
```

```
│                 OBSERVABILITY STACK                               │
│                                                                  │
│  GOLDEN SIGNALS (wajib monitor)                                  │
│  ├── Latency: p50, p95, p99 API response time                   │
│  ├── Traffic: RPS per endpoint, per service                     │
│  ├── Errors: 5xx rate, error spike detection                    │
│  └── Saturation: CPU, memory, DB connections, queue depth       │
│                                                                  │
│  BUSINESS METRICS                                                │
│  ├── DAU / MAU / WAU                                            │
│  ├── Conversion rate: visitor → registered → paid               │
│  ├── Churn rate (daily, weekly, monthly)                        │
│  ├── MRR / ARR                                                  │
│  ├── Average watch time per session                             │
│  ├── Video completion rate                                       │
│  └── Top 10 videos by views, bookmarks, downloads               │
│                                                                  │
│  INFRASTRUCTURE METRICS                                          │
│  ├── K8s: pod restarts, HPA events, node utilization            │
│  ├── DB: query latency, connection pool, replication lag        │
│  ├── Redis: hit rate, memory usage, evictions                   │
│  ├── S3: storage growth, bandwidth cost                         │
│  ├── CDN: cache hit ratio, bandwidth, error rate                │
│  └── Transcode: queue depth, processing time, failure rate      │
│                                                                  │
│  ALERTING RULES                                                  │
│  ├── CRITICAL (page immediately):                               │
│  │   ├── 5xx rate > 5% for 2 minutes                            │
│  │   ├── DB primary down                                         │
│  │   ├── Payment webhook failures > 3 consecutive                │
│  │   └── Video processing queue > 1000 jobs                      │
│  ├── HIGH (page during business hours):                         │
│  │   ├── p95 latency > 2s for 5 minutes                         │
│  │   ├── Redis memory > 80%                                     │
│  │   ├── CDN cache hit ratio < 70%                              │
│  │   └── New user registration drops > 50% from baseline        │
│  └── LOW (slack notification):                                  │
│      ├── Disk usage > 70%                                       │
│      ├── Certificate expiry < 30 days                           │
│      └── Slow queries detected ( > 1s )                         │
└─────────────────────────────────────────────────────────────────┘
```

## 5.5 CI/CD Pipeline 

text 

```
┌─────────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                                │
│                                                                  │
│  PUSH TO PR                                                      │
│  ├── Lint (ESLint, Prettier)                                    │
│  ├── Type check (TypeScript strict)                              │
│  ├── Unit tests (Vitest, coverage > 80%)                        │
│  ├── Integration tests (supertest, testcontainers)               │
│  ├── Security scan (Snyk, Trivy untuk Docker)                   │
│  ├── Build (Docker image)                                        │
```

```
│  └── Preview deploy (staging environment per PR)                 │
│                                                                  │
│  MERGE TO MAIN                                                   │
│  ├── All PR checks must pass                                    │
│  ├── E2E tests (Playwright, critical paths)                     │
│  ├── Build & push Docker image to ECR                           │
│  ├── Deploy to staging                                           │
│  ├── Smoke tests against staging                                │
│  ├── Manual approval gate                                       │
│  └── Deploy to production (rolling update, zero downtime)       │
│                                                                  │
│  DATABASE MIGRATIONS                                             │
│  ├── Version controlled (Prisma / Flyway / golang-migrate)      │
│  ├── Run BEFORE application deploy                              │
│  ├── Backward-compatible migrations ONLY                        │
│  ├── Rollback script untuk setiap migration                     │
│  └── Never drop columns in single deploy (2-step process)       │
└─────────────────────────────────────────────────────────────────┘
```

## 5.6 Feature Prioritization (MVP ke Depan) 

text 

```
┌─────────────────────────────────────────────────────────────────┐
│                 FEATURE ROADMAP                                  │
│                                                                  │
│  MVP (Bulan 1-2)                                                 │
│  ├── User registration & login                                  │
│  ├── Video upload & transcode (HLS multi-resolution)            │
│  ├── Video browsing (category, search basic)                    │
│  ├── Video player (HLS, adaptive quality)                       │
│  ├── Subscription plans & Stripe integration                    │
│  ├── Entitlement check (tier-based access)                      │
│  ├── Admin dashboard (CRUD videos, users)                       │
│  └── Responsive design                                          │
│                                                                  │
│  V1.1 (Bulan 3)                                                  │
│  ├── Elasticsearch full-text search                             │
│  ├── Watch history & resume playback                            │
│  ├── Bookmarks                                                  │
│  ├── Download feature (tier-gated)                              │
│  ├── Email notifications (welcome, renewal, expiring)           │
│  ├── Admin analytics dashboard                                  │
│  └── Coupon system                                              │
│                                                                  │
│  V1.2 (Bulan 4-5)                                                │
│  ├── Playlists                                                  │
│  ├── Trending & recommendation engine (basic collaborative)     │
│  ├── OAuth login (Google, Apple)                                │
│  ├── Customer portal (self-service billing)                     │
│  ├── Video scheduling (publish at future date)                   │
│  ├── Bulk upload & management                                   │
│  └── OEmbed support (embed di website lain)                     │
│                                                                  │
│  V2.0 (Bulan 6+)                                                 │
│  ├── ML recommendation engine                                   │
```

```
│  ├── Multi-language (i18n)                                      │
│  ├── Watermarking (per-user dynamic watermark)                  │
│  ├── API for partners / white-label                             │
│  ├── Mobile apps (React Native)                                 │
│  ├── Offline download (mobile)                                  │
│  └── Live streaming (jika relevan)                              │
└─────────────────────────────────────────────────────────────────┘
```

## RINGKASAN TEKNOLOGI 

|LAYER|TEKNOLOGI|
|---|---|
|||
|Frontend<br>Next.js 14, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Video.js<br>Backend API<br>NestJS (TypeScript) atau Go<br>Database<br>PostgreSQL (PgBouncer)<br>Cache<br>Redis Cluster<br>Search<br>Elasticsearch atau Meilisearch<br>Queue<br>RabbitMQ atau AWS SQS<br>Video Processing<br>AWS Elemental MediaConvert atau FFmpeg on GPU<br>Storage<br>AWS S3 + CloudFront CDN<br>Payment<br>Stripe (global) + Midtrans/Xendit (Indonesia)<br>Auth<br>JWT + bcrypt, OAuth2 (Google, Apple)<br>Monitoring<br>Prometheus + Grafana + Loki + Jaeger<br>Infra<br>Docker + Kubernetes (EKS/GKE)<br>CI/CD<br>GitHub Actions + ArgoCD||



**==> picture [472 x 112] intentionally omitted <==**

clipvault/ ├── docker-compose.yml ├── turbo.json ├── pnpm-workspace.yaml ├── .env.example ├── .gitignore │ ├── packages/ │   └── shared/ │       ├── package.json │       ├── tsconfig.json │       └── src/ │           ├── index.ts │           ├── types/ │           │   ├── auth.types.ts │           │   ├── user.types.ts │           │   ├── video.types.ts │           │   ├── subscription.types.ts │           │   └── api.types.ts │           ├── constants/ │           │   └── index.ts │           └── validators/ │               ├── auth.validator.ts │               └── common.validator.ts │ ├── apps/ │   ├── api/ │   │   ├── package.json │   │   ├── tsconfig.json │   │   ├── tsconfig.build.json │   │   ├── nest-cli.json │   │   ├── Dockerfile │   │   ├── prisma/ │   │   │   ├── schema.prisma │   │   │   ├── seed.ts │   │   │   └── migrations/ │   │   └── src/ │   │       ├── main.ts │   │       ├── app.module.ts │   │       ├── common/ │   │       │   ├── decorators/ │   │       │   │   ├── current-user.decorator.ts │   │       │   │   ├── public.decorator.ts │   │       │   │   └── roles.decorator.ts │   │       │   ├── filters/ │   │       │   │   └── http-exception.filter.ts 

│   │       │   ├── guards/ │   │       │   │   ├── jwt-auth.guard.ts │   │       │   │   └── roles.guard.ts │   │       │   ├── interceptors/ │   │       │   │   └── transform.interceptor.ts │   │       │   ├── middlewares/ 

│   │       │   │   └── rate-limit.middleware.ts │   │       │   └── pipes/ │   │       │       └── zod-validation.pipe.ts │   │       ├── prisma/ │   │       │   ├── prisma.module.ts │   │       │   └── prisma.service.ts │   │       ├── auth/ │   │       │   ├── auth.module.ts │   │       │   ├── auth.controller.ts │   │       │   ├── auth.service.ts │   │       │   ├── strategies/ │   │       │   │   └── jwt.strategy.ts │   │       │   └── dto/ │   │       │       ├── register.dto.ts │   │       │       ├── login.dto.ts │   │       │       └── refresh-token.dto.ts │   │       ├── users/ │   │       │   ├── users.module.ts 

│   │       │   ├── users.controller.ts │   │       │   ├── users.service.ts │   │       │   └── dto/ │   │       │       └── update-profile.dto.ts │   │       └── config/ │   │           ├── config.module.ts │   │           └── configuration.ts │   │ │   └── web/ 

│       ├── package.json │       ├── tsconfig.json │       ├── next.config.ts │       ├── tailwind.config.ts │       ├── postcss.config.js │       ├── Dockerfile │       └── src/ │           ├── app/ │           │   ├── layout.tsx │           │   ├── page.tsx │           │   ├── globals.css │           │   ├── (auth)/ │           │   │   ├── login/ 

│           │   │   │   └── page.tsx │           │   │   └── register/ │           │   │       └── page.tsx │           │   ├── (main)/ │           │   │   ├── layout.tsx │           │   │   ├── browse/ │           │   │   │   └── page.tsx │           │   │   └── dashboard/ │           │   │       └── page.tsx │           │   └── admin/ │           │       └── page.tsx │           ├── components/ │           │   ├── ui/ │           │   │   ├── button.tsx │           │   │   ├── input.tsx │           │   │   ├── card.tsx │           │   │   ├── badge.tsx │           │   │   ├── skeleton.tsx │           │   │   └── toast.tsx │           │   ├── layout/ │           │   │   ├── header.tsx │           │   │   ├── footer.tsx │           │   │   └── sidebar.tsx │           │   └── auth/ │           │       ├── login-form.tsx │           │       └── register-form.tsx │           ├── lib/ │           │   ├── api-client.ts │           │   ├── utils.ts │           │   └── constants.ts │           ├── hooks/ │           │   ├── use-auth.ts │           │   └── use-toast.ts │           ├── providers/ │           │   ├── query-provider.tsx │           │   └── toast-provider.tsx │           └── types/ │               └── index.ts 

