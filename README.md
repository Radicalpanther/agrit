# AgriTrails

A production-grade Next.js 16 (App Router, TypeScript, Tailwind 4) authentic rural farm stay and agri-tourism platform across Maharashtra, Kerala, and Punjab.

---

## Tech Stack & Architecture

- **Next.js 16** — App Router, React 19 Server Components, Streaming Route Handlers
- **TypeScript 5.7** — Strict type safety across all schemas, APIs, and components
- **Tailwind CSS 4 & Custom Design System** — Organic earth-tone palette (`--forest`, `--leaf`, `--mint`, `--gold`, `--cream`), zero emoji usage, Lucide vector icons
- **Supabase** — PostgreSQL with Row Level Security (RLS), Auth triggers, triggers for live rating averages
- **PWA (Progressive Web App)** — Manifest, service worker, and local vector/tile caching for offline rural travel safety cards
- **WhatsApp Cloud API** — Meta Graph API outbound template messages with graceful UI mock fallback
- **AgriGuide AI Assistant** — Floating rural advisor backed by Claude / Gemini or database-driven tool streaming

---

## Quick Start & Running the Project

### Prerequisites
- Node.js 20+ installed
- pnpm package manager (`npm install -g pnpm`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/agritrail.git
cd agritrail
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials (see below). If Meta WhatsApp keys or AI keys are omitted, the application runs automatically in safe **Mock Mode** with 100% feature functionality.

### 3. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
pnpm build
pnpm start
```

---

## Supabase Database Setup

All database tables, constraints, RLS policies, triggers, and mock seeds are provided in [`supabase/setup.sql`](file:///C:/Users/sanka/OneDrive/Desktop/final/v1%20pbl/agritrail/supabase/setup.sql).

### 1. Create Supabase Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. In **Project Settings > API**, copy:
   - **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** -> `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

### 2. Seed Test Accounts
Create the two demo accounts in **Supabase Dashboard > Authentication > Users** (or register via `/login`):
- **Farmer Account:** `farmer@agritrails.dev` (Password: `123456`)
- **Tourist Account:** `tourist@agritrails.dev` (Password: `123456`)

### 3. Execute Setup SQL
Open **SQL Editor** in the Supabase Dashboard, create a **New query**, paste the entire contents of [`supabase/setup.sql`](file:///C:/Users/sanka/OneDrive/Desktop/final/v1%20pbl/agritrail/supabase/setup.sql), and click **Run**.

This script sets up:
- 11 relational tables: `profiles`, `farms`, `crops`, `farm_crops`, `activities`, `products`, `bookings`, `product_reservations`, `reviews`, `review_photos`, `notifications`.
- `handle_new_user` trigger on `auth.users` to automatically populate profile roles (`farmer` or `tourist`).
- `update_farm_rating` trigger on `reviews` to maintain `rating_avg` and `review_count` in real time.
- RLS policies ensuring farmers can only edit their own listings and products, tourists can only read their own reservations, and public visitors can view published stays and products.
- Seeds 7 verified farm stays, 12 regional crops, 33 farm activities, 26 farm-fresh produce items, sample bookings, and 22 verified reviews with ratings.

> **Incremental Migration:** For existing databases where you only need to add the published toggle and updated RLS read policy without re-running `setup.sql`, run [`supabase/migrations/001_published.sql`](file:///C:/Users/sanka/OneDrive/Desktop/final/v1%20pbl/agritrail/supabase/migrations/001_published.sql).

---

## Seed Accounts Reference

| Role | Email | Password | Primary Actions |
|------|-------|----------|-----------------|
| **Farmer** | `farmer@agritrails.dev` | `123456` | Manage farm stays, add seasonal crops, manage harvest products & stock, review bookings (Confirm/Decline), track earnings |
| **Tourist** | `tourist@agritrails.dev` | `123456` | Browse stays, book visits, reserve produce for farm pickup, access offline travel safety cards, write verified reviews |

---

## Outbound WhatsApp Cloud API & Template Messages

Outbound WhatsApp notifications use Meta's official WhatsApp Business Cloud API (`lib/whatsapp.ts`, `lib/notify.ts`).

### Mock Mode
If `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` are not configured in `.env.local`, AgriTrails activates **Mock Mode**:
- API calls to Meta are skipped.
- Notifications are saved to the `notifications` database table with status `'mock'`.
- The exact notification message copy is displayed on the booking confirmation screen in a dedicated **Message Preview** card.
- A failed dispatch never breaks or delays a guest booking.

### Live Mode Meta Templates
To enable live dispatch to phones with `whatsapp_opt_in = true`, configure the following 5 templates in **Meta Business Manager > WhatsApp Manager > Message Templates**:

#### 1. `farmer_new_booking`
- **Category:** UTILITY
- **Language:** English (US) (`en_US`)
- **Variables:** `{{1}}` Farmer name, `{{2}}` Guest name, `{{3}}` Visit type, `{{4}}` Check-in date, `{{5}}` Guest count, `{{6}}` Farm name, `{{7}}` Booking reference ID
- **Body:**
  ```text
  Namaste {{1}}, you have a new booking request for {{6}} from {{2}} ({{3}}, {{5}} guests on {{4}}). Booking ref: {{7}}. Please review and confirm in your AgriTrails farmer dashboard.
  ```

#### 2. `tourist_booking_received`
- **Category:** UTILITY
- **Language:** English (US) (`en_US`)
- **Variables:** `{{1}}` Guest name, `{{2}}` Booking reference ID, `{{3}}` Farm name, `{{4}}` Visit type, `{{5}}` Check-in date
- **Body:**
  ```text
  Namaste {{1}}, your booking request {{2}} for a {{4}} at {{3}} on {{5}} has been received. Your host will confirm availability shortly. No payment is required today.
  ```

#### 3. `tourist_booking_confirmed`
- **Category:** UTILITY
- **Language:** English (US) (`en_US`)
- **Variables:** `{{1}}` Guest name, `{{2}}` Farm name, `{{3}}` Check-in date, `{{4}}` Host name, `{{5}}` Host phone number, `{{6}}` Directions & travel card URL
- **Body:**
  ```text
  Namaste {{1}}, great news! Your stay at {{2}} on {{3}} has been confirmed by {{4}}. Contact your host at {{5}}. View directions and offline safety card: {{6}}
  ```

#### 4. `tourist_booking_declined`
- **Category:** UTILITY
- **Language:** English (US) (`en_US`)
- **Variables:** `{{1}}` Guest name, `{{2}}` Farm name, `{{3}}` Check-in date
- **Body:**
  ```text
  Namaste {{1}}, unfortunately {{2}} is unable to host your visit on {{3}}. You can explore other authentic stays across Maharashtra and Kerala on agritrails.dev
  ```

#### 5. `tourist_pre_arrival_reminder`
- **Category:** UTILITY
- **Language:** English (US) (`en_US`)
- **Variables:** `{{1}}` Guest name, `{{2}}` Farm name, `{{3}}` Check-in date, `{{4}}` Host phone number, `{{5}}` Offline travel card URL
- **Triggered via:** Protected route `/api/cron/reminders` via Vercel Cron or GitHub Actions (authenticated via `Authorization: Bearer <CRON_SECRET>`).
- **Body:**
  ```text
  Namaste {{1}}, reminder that your farm stay at {{2}} begins tomorrow ({{3}})! Host contact: {{4}}. Please download your offline travel safety card before leaving: {{5}}
  ```

---

## AgriGuide Conversational Assistant

AgriGuide (`components/AgriGuide.tsx`, `app/api/chat/route.ts`) is a floating conversational assistant anchored at the bottom-right of every page.
- **Provider Abstraction:** Works with Claude (`ANTHROPIC_API_KEY`), Gemini free tier (`GEMINI_API_KEY`), or built-in database-driven mock stream.
- **Strict Database Tools:** The assistant never hallucinates; it queries:
  - `searchFarms`: Filters stays by budget in paise, region, month, and guest count.
  - `getFarmDetails`: Retrieves rules, amenities, and check-in guidelines.
  - `getSeasonalCrops`: Retrieves active regional harvest schedules.
- **System Constraints:** Replies are short, contain zero emojis, recommend 1 to 3 stays with markdown links (`[Name](/farms/[slug])`), and state plainly if no match exists.
- **Rate Limited:** 20 requests/min per IP via sliding window (`lib/rate-limit.ts`).

---

## Presentation Demo Script

Follow this screen-by-screen sequence for an impressive, end-to-end product demonstration:

### Step 1: Home Screen (`/`)
1. **Show the Hero & Multi-Field Search:** Point out the Where, When, and Experience filters (e.g. searching Maharashtra, fruit picking, or vineyard stays).
2. **Verified Stays & Trust Components:** Highlight the **"Verified by AgriTrails"** badge and the **EcoScore** block estimating kg CO2 saved vs urban hotels and organic food percentage.
3. **Seasonal Harvest Calendar:** Show interactive month tabs tracking crop seasons (Alphonso mangoes, Nashik grapes, Kashmiri saffron).
4. **Farm-Fresh Produce ("Reserve for pickup"):** Explain that AgriTrails is not an e-commerce marketplace—guests reserve produce items directly from farmers to collect and pay for at the farm gate.

### Step 2: Floating Assistant (`AgriGuide`)
1. **Open AgriGuide:** Tap the green launcher button at the bottom right.
2. **Execute Suggested Prompts:** Tap *"Weekend stay under ₹2,500"* or *"What is in season this month?"*.
3. **Demonstrate Tool Streaming:** Show how the assistant streams authentic prices and harvest data queried live from Postgres with clickable markdown links directly to farm pages.

### Step 3: Farm Detail Page (`/farms/aamrai-orchard-escape`)
1. **Trust Modal:** Click the **Verified Badge** to show the transparency modal (explaining identity verification, farm visits, safety checklist, and zero stored government ID data).
2. **Local Economy & Nearby Products:** Show the "Products from this farm" block and the "Nearby farms within 15 km" produce carousel calculated via haversine distance.
3. **Verified Reviews Section:**
   - Display the 4 rating bars: Food authenticity, Cleanliness, Hospitality, Location.
   - Show the guest snapshot gallery strip and tap a thumbnail to open the zero-lag Lightbox.
   - Show the review submission form restricted to verified guests with completed bookings.

### Step 4: Booking Flow & Reservation (`/book/aamrai-orchard-escape`)
1. **Configure Visit:** Toggle between Day Visit and Overnight Stay, set guests and dates.
2. **Produce Pickup:** Check items under *"Reserve products to collect at the farm"*.
3. **Submit Booking:** Submit with WhatsApp notification opted in (`+919800000001`).

### Step 5: Booking Confirmation & Offline Travel Safety Card
1. **WhatsApp Message Preview:** Point out the message preview block displaying the exact rendered text of the `tourist_booking_received` template logged to the database.
2. **Travel Safety Card (Level 1 & Level 2):**
   - **Large GPS coordinates:** Highlight high-precision decimal coordinates with a single-click Copy button.
   - **Landmark directions:** Numbered steps starting from the nearest highway or bus stop.
   - **Offline Safety Links:** Three carrier-based buttons: *Call host*, *Call 112 (National Emergency)*, and *Share location by SMS* (pre-filled with coordinates).
   - **Offline PWA Map:** Toggle to the interactive offline PWA route map showing the GeoJSON farm trail and live GPS tracker.
   - **Client-Side PDF & Print:** Tap *Download PDF* or *Print Card* to show signal-independent travel safety.

### Step 6: Farmer Management Portal (`/dashboard`)
1. **Sign in as Farmer:** Log in with `farmer@agritrails.dev`.
2. **Overview Stats:** View upcoming guests, this month's earnings, and produce collection requests calculated from bookings.
3. **Manage Listings:** Click *Edit Listing* or *Add Stay* to show the Leaflet coordinate pin dropper, landmark instructions, and publish toggle.
4. **Manage Bookings & Produce:** Confirm or decline pending booking requests, triggering real-time notification dispatch (`notifyBookingStatus`). Update product inventory stock using the responsive progress bars.
5. **Switch to Tourist View:** Tap *"My bookings & travel safety cards"* to inspect all confirmed travel cards from a guest perspective.

---

## License

MIT © AgriTrails Team. Built for sustainable rural agritourism.
