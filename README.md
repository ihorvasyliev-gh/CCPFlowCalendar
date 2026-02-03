# CCP Event Calendar

A corporate event calendar for **Cork City Partnership**. Staff can view upcoming events, meetings, and trainings and sign up for them; administrators can manage the organisation’s schedule.

---

## User guide

### 1. Sign in

Use your work email and password to access the calendar.

- **Staff**: View events and RSVP.
- **Admin**: Full rights to create, edit, and delete events.

### 2. Calendar views

- **Month**: Classic monthly grid. Use the arrows to move between months.
- **List**: Chronological list of upcoming events.
- **Mobile**: Layout adapts for phones and tablets.

### 3. RSVP (Join events)

Some events require registration.

1. Open the event card.
2. Click **Join Event**.
3. Your name appears in the attendees list.
4. To cancel, click **Cancel RSVP**.

### 4. Search and filters

Use the top toolbar to find events:

- **Search**: By title or keyword.
- **Categories**: Filter by type (Meeting, Workshop, Training, etc.).
- **Location**: Filter by venue.
- **Creator**: Events created by a specific user.

### 5. Extra features

- **Comments**: Ask questions and add notes on events.
- **Add to Calendar**: Save an event to Google Calendar, Outlook, or download an `.ics` file.
- **Export to Excel**: Use **Export** in the top bar to download events as a spreadsheet.

---

## Admin guide

Admins have all user features plus:

### 1. Create event

- Click **+ Create Event** in the top bar, or click any date in the calendar.
- Fill required fields: Title, Date, Time.
- **Recurrence**: Set daily, weekly, or monthly repeats.
- **RSVP**: Enable “RSVP” and set **Max Attendees** if you need a limit.

### 2. Edit and delete

- Open the event and use the ✏️ (edit) icon to change it.
- Use the 🗑️ (trash) icon to delete.
- For recurring events, you can delete this occurrence only or the whole series.

### 3. Media and attachments

- **Poster**: Upload a cover image.
- **Attachments**: Add PDFs, Word docs, or images for attendees to download.

### 4. Categories

When creating an event, pick an existing category or click **Create Category** to add a new one.

---

## For developers

### Requirements

- Node.js 18+
- npm or yarn
- Supabase account
- Cloudflare R2 (for file storage)

### Setup and run

1. **Clone and install**

   ```bash
   git clone https://github.com/ihorvasyliev-gh/CCPFlowCalendar.git
   cd CCPFlowCalendar
   npm install
   ```

2. **Environment variables**

   Create `.env.local` in the project root:

   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_CLOUDFLARE_R2_PUBLIC_URL=your_r2_public_url
   ```

3. **Run locally**

   ```bash
   npm run dev
   ```

   App runs at `http://localhost:3000`.

### Deploy

The app is set up for **Cloudflare Pages**.

1. Connect your GitHub repo in Cloudflare Pages.
2. **Build command**: `npm run build`
3. **Build output directory**: `dist`
4. Add the same environment variables in the Cloudflare project settings.

### Tech stack

| Layer   | Stack |
|--------|--------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Supabase (PostgreSQL, Auth, Realtime) |
| Storage  | Cloudflare R2 |
| Icons    | Lucide React |

### Database (Supabase)

- `events` — events
- `users` — user profiles and roles
- `rsvps` — event attendees
- `event_comments` — comments on events

---

© 2024 Cork City Partnership. Internal use only.
