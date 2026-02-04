# CCP Event Calendar

A corporate event calendar web application for **Cork City Partnership**. Staff view and sign up for events; administrators manage the organisation’s schedule, create and edit events, and control visibility. Built with React, TypeScript, and Supabase.

---

## What this application does (functionality summary)

- **Authentication** — Sign in with work email and password (Supabase Auth). Roles: staff (default) and admin.
- **Calendar views** — Month grid and list view; responsive layout with mobile bottom navigation.
- **Events** — View event details (title, description, date, time, location, category, tags, poster, attachments). Admins create, edit, and delete events; staff see only published events.
- **Recurrence** — Events can repeat daily, weekly, monthly, or yearly with interval and end date; admins can delete a single occurrence or the whole series.
- **RSVP** — Join or cancel attendance for events with RSVP enabled; see attendee list and max attendees.
- **Comments** — Add and delete comments on events (per occurrence for recurring events).
- **Search and filters** — Search by title, description, location, tags; filter by category, location, creator, date range; admins can also filter by draft/published.
- **Add to Calendar** — Per-event links: Google Calendar, Outlook.com, Office 365, or download `.ics` for Apple Calendar and others.
- **Export** — Export the current filtered set as **iCal (`.ics`)** or **Excel (`.xlsx`)**; recurring events are expanded in Excel over a configurable range.
- **Notifications** — Notification center (bell icon): view, mark read, delete; quick access to upcoming events the user has RSVP’d to.
- **Theme** — Light/dark theme toggle (persisted).
- **Media** — Event posters and file attachments (PDFs, documents, images) with download; optional link to open location in Google Maps.

---

## Table of contents

- [Overview](#overview)
- [What users (staff) can do](#what-users-staff-can-do)
- [What administrators can do](#what-administrators-can-do)
- [User guide](#user-guide)
- [Admin guide](#admin-guide)
- [For developers](#for-developers)

---

## Overview

- **Sign in:** Work email and password via Supabase Auth. New accounts get the **staff** role by default; an admin must promote users to **admin** (e.g. via Supabase or your user management).
- **Roles:** **staff** — view published events, RSVP, comment, export, use “Add to Calendar”; **admin** — all of the above plus create/edit/delete events, see and filter by draft events, create categories.
- **Views:** Month grid and list; layout adapts for mobile with bottom navigation. Navigate months (previous / next / today).
- **Export:** iCal (`.ics`) and Excel (`.xlsx`); “Add to Calendar” per event (Google, Outlook, `.ics` download).

---

## What users (staff) can do

All signed-in **staff** can:

1. **View the calendar**
   - Switch between **month** (grid) and **list** view.
   - Navigate months (previous / next / today).
   - See only **published** events (drafts are hidden).

2. **Search and filter**
   - **Search** by title, description, location, or tags.
   - **Filter** by category, location, creator, and date range (Today, This Week, This Month, Next Month, or custom).

3. **Open event details**
   - Click an event to open the detail modal: title, description, date, time, location, category, tags, poster, attachments, RSVP section, comments, and history (read-only).

4. **RSVP**
   - **Join** or **Cancel RSVP** for events that have RSVP enabled.
   - See attendee list and max attendees when set.

5. **Comments**
   - **Add** comments on events (including a specific occurrence for recurring events).
   - **Delete** their own comments (with confirmation).

6. **Add to Calendar**
   - From the event modal: **Add to Calendar** → choose **Google Calendar**, **Outlook.com**, **Office 365**, or **Download .ics file** for Apple Calendar or other apps.

7. **Downloads**
   - Download event **poster** and **attachments** (PDFs, documents, images) from the event modal.
   - Open **location** in Google Maps (link in event details).

8. **Export**
   - Use **Export** in the top bar to export the current filtered set of events as **iCal (`.ics`)** or **Excel (`.xlsx`)**. Recurring events are expanded in Excel within a configurable range.

9. **Notifications**
   - Open the **notification center** (bell icon) to see notifications, mark as read, or delete. Upcoming events the user has RSVP’d to are shown for quick access.

10. **App preferences**
    - **Toggle light/dark theme** (persisted).
    - **Refresh** the event list by clicking the calendar logo in the navbar.

Staff **cannot**: create events, edit events, delete events, or see draft events. The “New Event” button and edit/delete controls in the event modal are not shown to staff.

---

## What administrators can do

**Admins** can do everything **staff** can, plus:

1. **Create events**
   - **New Event** in the navbar, or click a day in the month grid (when the plus appears).
   - Set: title, date & time, location, description, category, tags, status (draft / published), poster, attachments, recurrence (daily / weekly / monthly / yearly), RSVP (on/off, max attendees).
   - Use **Create Category** when picking a category to add a new one.

2. **Edit events**
   - Open any event and use the **Edit** (pencil) button.
   - Change any of the fields above and save.

3. **Delete events**
   - Open an event and use the **Delete** (trash) button.
   - For recurring events: choose **Delete only this occurrence** or **Delete entire series**.

4. **See draft events**
   - Draft events appear in the calendar and in filters for admins only.
   - Use the **Status** filter (Draft / Published) in the filters panel.

5. **Filter by status**
   - In addition to category, location, creator, and date range, admins can filter by **Published** or **Draft**.

6. **Create categories**
   - When creating or editing an event, admins can create a new category from the category selector (used for all future events).

Staff see only published events and do not have create, edit, delete, or status-filter options.

---

## User guide

### 1. Sign in

Use your work email and password on the login page. New users can sign up; by default they get the **staff** role. An admin must promote a user to **admin** (e.g. via Supabase or your user management process) for admin features.

### 2. Calendar views

- **Month:** Grid by day. Use the arrows or “Today” to move. Click a day to open events; admins see a plus on a day to create an event that day.
- **List:** Chronological list of events (useful on small screens).
- **Mobile:** Same views with a responsive layout and bottom navigation.

### 3. Search and filters

Use the **search** box and **Filters** (category, location, creator, date range; admins also get status). Filters apply to both calendar and list. Clear filters with the clear control in the filter panel.

### 4. RSVP

If an event has “RSVP” enabled:

1. Open the event.
2. Click **Join Event** (or **Cancel RSVP** to leave).
3. Your name appears in the attendees list. For recurring events, RSVP is per occurrence.

### 5. Comments

In the event modal, scroll to **Comments**. Type your message and submit. You can delete your own comments via the delete action (with confirmation). For recurring events, comments are tied to the specific occurrence you are viewing.

### 6. Add to Calendar

In the event modal, click **Add to Calendar** and choose:

- **Office 365** or **Outlook.com** (opens in browser).
- **Google Calendar** (opens in browser).
- **Download .ics file** (for Apple Calendar or other apps).

### 7. Export

Click **Export** in the top bar. Choose **iCal (.ics)** or **Excel (.xlsx)**. The export uses the **currently filtered** events (search + filters). Recurring events are expanded in the Excel export over a defined time range.

### 8. Notifications and theme

- **Bell icon:** Open the notification center; mark as read or delete items. See a short list of upcoming events you’ve RSVP’d to.
- **Sun/Moon icon:** Switch between light and dark theme.

---

## Admin guide

Admins have all user features plus the following.

### 1. Create event

- Click **New Event** in the top bar, or click the **+** on a day in the month view.
- **Required:** Title, date, time, location.
- **Optional:** Description, category, tags, poster image, attachments (PDF, Word, images), status (Draft / Published), recurrence (daily / weekly / monthly / yearly with interval and end), RSVP (enabled + max attendees).
- Use **Create Category** in the category dropdown to add a new category.
- Save. Drafts are visible only to admins until published.

### 2. Edit and delete

- Open an event and click the **Edit** (pencil) icon to change any fields and save.
- Click the **Delete** (trash) icon:
  - **One-time event:** Confirm to delete.
  - **Recurring event:** Choose “Delete only this occurrence” or “Delete entire series,” then confirm.

### 3. Media and attachments

- **Poster:** Upload a cover image in the event form.
- **Attachments:** Add files (e.g. PDF, Word, images) for attendees to download from the event modal.

### 4. Categories and status

- When creating or editing an event, select an existing category or create one via **Create Category**.
- Set **Status** to **Draft** (visible only to admins) or **Published** (visible to everyone). Use the **Status** filter to show only drafts or only published events.

---

## For developers

### Requirements

- Node.js 18+
- npm or yarn
- Supabase account (Auth + Database)
- Cloudflare R2 (optional, for file storage)

### Setup and run

1. **Clone and install**

   ```bash
   git clone https://github.com/ihorvasyliev-gh/CCPFlowCalendar.git
   cd CCPFlowCalendar
   npm install
   ```

2. **Environment variables**

   Create `.env.local` in the project root (see `env.example.txt` if present):

   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_CLOUDFLARE_R2_PUBLIC_URL=your_r2_public_url
   ```

3. **Run locally**

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000`.

4. **Supabase:** Run the SQL in `supabase-setup.sql` in the Supabase SQL Editor, configure Auth (e.g. email/password), and optionally run any migration scripts (e.g. `event-comments-occurrence-migration.sql`, `rsvp-occurrence-migration.sql`) as described in the repo.

### Deploy

The app is set up for **Cloudflare Pages**.

1. Connect your GitHub repo in Cloudflare Pages.
2. **Build command:** `npm run build`
3. **Build output directory:** `dist`
4. Add the same environment variables in the Cloudflare project settings.

See `DEPLOY.md` and `CLOUDFLARE_SETUP.md` for more detail.

### Tech stack

| Layer    | Stack |
|----------|--------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Supabase (PostgreSQL, Auth, Realtime) |
| Storage  | Cloudflare R2 (posters, attachments) |
| Icons    | Lucide React |

### Database (Supabase)

- `users` — user profiles and roles (staff / admin)
- `events` — events (with recurrence and RSVP settings)
- `event_attachments` — posters and file attachments
- `event_comments` — comments (per occurrence for recurring events)
- `event_history` — change history for events
- `event_categories` — categories
- `rsvps` — RSVP records (per occurrence for recurring events)

Row Level Security (RLS) and app logic enforce: staff see only published events and cannot create/edit/delete events; admins can do full CRUD and see drafts.

### Creating an admin user

By default, new sign-ups are **staff**. To make a user an admin, set their `role` to `admin` in the `public.users` table (e.g. via Supabase Dashboard or SQL). See `CREATE_ADMIN_USER.md` for step-by-step instructions.

---

© Cork City Partnership. Internal use only.
