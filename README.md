SMART BOOKMARK APP

Live URL: https://smart-bookmark-uss7.vercel.app

------------------------------------------------------------------------

PROJECT OVERVIEW

Smart Bookmark App is a production-ready bookmark management application
built using Next.js (App Router) and Supabase.

Users can securely log in using Google OAuth, store bookmarks privately,
and experience real-time updates across multiple tabs without refreshing
the page.

------------------------------------------------------------------------

TECH STACK

-   Next.js 16 (App Router)
-   Supabase (Auth, PostgreSQL, Realtime, RLS)
-   Tailwind CSS
-   Vercel (Deployment)

------------------------------------------------------------------------

FEATURES

-   Google OAuth Login (No email/password)
-   Add bookmarks (URL, Title, Category)
-   Private bookmarks per user (RLS secured)
-   Realtime updates across tabs
-   Edit bookmarks
-   Delete bookmarks
-   Favorite bookmarks
-   Search functionality
-   Category filtering
-   Sorting (Latest, Title, Favorites)
-   Dark / Light mode
-   Fully deployed on Vercel

------------------------------------------------------------------------

AUTHENTICATION FLOW

- Google OAuth handled via Supabase Auth
- Session stored securely
- Automatic redirect:
    /  -> /login
    Logged-in users -> /dashboard
- Cross-tab logout detection implemented using:
    - onAuthStateChange
    - Storage event listener
    - Periodic session validation
------------------------------------------------------------------------

DATABASE SCHEMA

Table: bookmarks

Columns:
- id (uuid, primary key)
- user_id (uuid, owner of bookmark)
- url (text)
- title (text)
- category (text)
- is_favorite (boolean)
- created_at (timestamp)

------------------------------------------------------------------------

SECURITY (ROW LEVEL SECURITY)

RLS Policies ensure: - Users can only view their own bookmarks - Users
can only insert their own bookmarks - Users can only update their own
bookmarks - Users can only delete their own bookmarks

This prevents unauthorized access at the database level.

------------------------------------------------------------------------

REALTIME IMPLEMENTATION

Supabase Realtime listens to: - INSERT - UPDATE - DELETE

Bookmarks update instantly across multiple tabs without page refresh.

------------------------------------------------------------------------

PROJECT STRUCTURE

smart-bookmark/
│
├── app/
│   ├── page.tsx
│   ├── login/page.tsx
│   └── dashboard/page.tsx
│
├── lib/
│   └── supabase.ts
│
├── .env.local
└── README.txt

------------------------------------------------------------------------

ENVIRONMENT VARIABLES

Create a .env.local file:

NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

------------------------------------------------------------------------

RUN LOCALLY

1.  git clone https://github.com/kadamantisravan/smart-bookmark.git
2.  npm install
3.  Add .env.local
4.  npm run dev

------------------------------------------------------------------------

DEPLOYMENT

-   Deployed using Vercel
-   Supabase Site URL updated to production domain
-   Redirect URLs configured properly
-   Environment variables added in Vercel

------------------------------------------------------------------------

CHALLENGES FACED

1.  Vercel 404 NOT_FOUND Cause: Missing root route. Fix: Added redirect
    in app/page.tsx

2.  OAuth redirecting to localhost Cause: Supabase Site URL set to
    localhost. Fix: Updated to production URL.

3.  Cross-tab logout sync Fix: Implemented Supabase auth listener and
    storage events.

------------------------------------------------------------------------

WHAT THIS PROJECT DEMONSTRATES

-   Real-world authentication flow
-   Secure multi-user architecture
-   Row Level Security implementation
-   Realtime systems
-   Production debugging
-   Full-stack development using modern stack

------------------------------------------------------------------------

AUTHOR

Sravan Kadamanti LinkedIn: https://www.linkedin.com/in/sravankadamanti/

------------------------------------------------------------------------

ASSIGNMENT CHECKLIST

Google OAuth only : Completed Add bookmark : Completed Private per user
: Completed Realtime updates : Completed Delete bookmarks : Completed
Deployed on Vercel : Completed

PROJECT STATUS: Production Ready
