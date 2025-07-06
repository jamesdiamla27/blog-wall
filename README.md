# Facebook Wall-Inspired Next.js App

This project is a modern, Facebook Wall-inspired social feed built with [Next.js](https://nextjs.org), [Supabase](https://supabase.com), and [Tailwind CSS](https://tailwindcss.com). Users can post short messages, pick an avatar, optionally attach an image, and see a live-updating feed.

## Features
- Post short messages (max 280 chars)
- Optional display name and avatar (DiceBear avatars)
- Optional image attachment (JPG, PNG, GIF up to 5MB)
- Live feed with real-time updates (Supabase Realtime)
- Responsive, modern UI with Tailwind CSS
- Toast notifications for successful posts

## Setup Instructions

### 1. Clone and Install
```bash
npm install
```

### 2. Supabase Setup
- Create a project at [Supabase](https://app.supabase.com/)
- Create a `posts` table with these columns:
  - `id` (uuid, primary key, default: uuid_generate_v4())
  - `author_id` (text)
  - `message` (text)
  - `created_at` (timestamp with time zone, default: now())
  - `display_name` (text)
  - `avatar_url` (text)
  - `image_url` (text)
- Enable **Realtime** for the `posts` table.
- Create a **storage bucket** (e.g., `post-images`) and set it to public.

#### Row Level Security (RLS) Policies
- For `posts` table:
  - Allow SELECT:
    ```sql
    create policy "Allow select for all" on posts for select to public using (true);
    ```
  - Allow INSERT:
    ```sql
    create policy "Allow insert for all" on posts for insert to public with check (true);
    ```
- For storage bucket:
  - Allow uploads:
    ```sql
    create policy "Allow upload for all" on storage.objects for insert to public with check (bucket_id = 'post-images');
    ```

### 3. Environment Variables
Create a `.env.local` file in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
Get these values from your Supabase project settings (API section).

### 4. Run the App
```bash
npm run dev
```
Visit [https://wall-diamla.vercel.app](https://wall-diamla.vercel.app) to use the live app.

## Tech Stack
- Next.js (App Router)
- Supabase (Database, Realtime, Storage)
- Tailwind CSS
- DiceBear Avatars
- react-spinners, react-toastify

## Customization
- You can change the avatar style by editing the DiceBear API URL in `app/page.tsx`.
- Adjust the UI with Tailwind classes as needed.

---

Enjoy your modern Facebook Wall-inspired app!
