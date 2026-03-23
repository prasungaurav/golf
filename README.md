# Golf Tournament Management App

Full-stack golf tournament platform for players, organisers, sponsors, and admins.

This app is being built as a multi-role system where:

- players discover tournaments, register, track approvals, and use QR entry passes
- organisers create tournaments, manage registrations, publish schedules, run live match updates, and scan player check-ins
- sponsors discover open tournaments, place sponsorship bids, and track bid results
- admins can extend oversight and platform management where needed

## Product Vision

The goal is to build one unified app for the full tournament lifecycle:

1. tournament discovery and promotion
2. player registration and approval workflow
3. organiser operations before and during the event
4. live scoring, leaderboard, and updates
5. sponsor bidding and sponsor-slot selection
6. secure tournament-day entry using QR-based passes

## Core Modules Planned For This App

### 1. Authentication and Role-Based Access

- session-based login using `express-session`
- email/password login
- OTP login flow for phone-based access
- supported roles: `player`, `sponsor`, `organiser`, `admin`

### 2. Tournament Discovery

- public tournament listing
- tournament detail pages
- entry fee, rules, registration deadline, format, city, course
- support for public/private tournament visibility

### 3. Player Registration Flow

- player-only registration
- configurable fee, max players, handicap range, extras, waitlist
- organiser approval/rejection/blocking
- player dashboard for "My Tournaments"
- approved players receive entry pass data

### 4. Organiser Dashboard

- create and manage tournaments
- review registrations
- approve/reject/update payment status
- issue entry codes
- manage scheduling and match creation
- run QR scanner for venue check-in
- manage sponsor bids

### 5. Match, Live, and Leaderboard Flow

- create matches from organiser schedules
- quick live score updates
- tournament match listing
- live/public match feed
- leaderboard and tournament update models for future expansion

### 6. Sponsor Marketplace

- sponsors browse available tournaments
- bidding window tied to registration closing time
- place bids by slot type
- organiser approval/rejection flow
- automatic next-best pending bid selection after rejection

### 7. Entry Pass and Check-In

- approved registration gets unique `entryCode` and `entrySecret`
- player can open/download QR entry pass
- organiser scans QR on event day
- system verifies pass and marks check-in

## Current Tech Stack

### Frontend

- React 19
- React Router
- CSS stylesheets organised by feature area
- `html5-qrcode` for organiser scanning
- `qrcode.react` for player entry QR generation
- `html2canvas` + `jspdf` for downloadable entry passes

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- `express-session`
- `connect-mongo`
- `bcryptjs`
- `express-rate-limit`

## Current Project Structure

```text
golf/
  client/   React frontend
  server/   Express + MongoDB backend
  README.md
```

Important backend areas:

- `server/common/auth.routes.js`
- `server/middleware/sessionAuth.js`
- `server/routes/tournament.js`
- `server/routes/SponsorBid.js`
- `server/routes/OrganiserSponsor.js`
- `server/routes/match.js`
- `server/models/*`

Important frontend areas:

- `client/src/common/component/*`
- `client/src/organizer/component/*`
- `client/src/player/component/*`
- `client/src/sponser/component/Sponser.jsx`
- `client/src/admin/component/*`

## Main User Flows

### Player

- register/login
- browse tournaments
- register for a tournament
- see approval status
- open "My Tournaments"
- download entry pass after approval

### Organiser

- register/login
- create tournament
- set registration rules and dates
- manage players and payment flags
- generate entry codes
- publish schedules and matches
- scan QR for check-in
- review sponsor bids

### Sponsor

- register/login
- browse tournaments with open bidding
- submit sponsorship proposal
- track status of bids
- later upload brand assets after approval

## Backend Features Already Present In This Repo

### Implemented models

- `User`
- `Otp`
- `Tournament`
- `TournamentPlayer`
- `TournamentUpdate`
- `TeeTime`
- `Match`
- `LeaderboardEntry`
- `SponsorBid`

### Implemented API areas

- auth registration/login/logout/session
- public tournament listing
- organiser tournament listing/detail/create
- player registration
- player "my tournaments"
- organiser registration management
- paid-status toggle
- entry-code issuing
- player entry-pass fetch
- organiser QR check-in verification
- sponsor tournament list and sponsor bidding
- organiser sponsor-bid review
- match list, match update, and schedule-based match creation

### Implemented frontend screens

- dashboard/home
- live page
- tournaments page
- organiser manage tournaments
- organiser scheduling
- organiser registrations
- sponsor panel
- player my tournaments
- player entry pass
- organiser QR scanner

## Development Status

### Done or largely built

- project split into `client` and `server`
- session auth with Mongo-backed sessions
- role-aware auth flow
- tournament creation and public listing
- player registration pipeline
- organiser registration review flow
- sponsor bidding core workflow
- organiser sponsor decision workflow
- QR entry pass and check-in workflow
- base live-match scheduling/update flow

### Still to complete or verify

- verify all tournament detail response sections expected by frontend: `field`, `teeTimes`, `leaderboard`, `updates`
- verify organiser-only protections on every organiser action
- align `session.user.id` and `_id` usage consistently across routes
- finish sponsor UI integration and polish
- connect tournament page tabs fully with backend data
- add tests for sponsor routes, registration flow, and check-in flow
- add better admin workflows
- add production-ready validation, error handling, and deployment config

## Recommended Next Build Steps

1. Stabilize the tournament API contract so frontend and backend return the same shapes everywhere.
2. Add server tests for auth, sponsor bidding, registration approval, and QR check-in.
3. Complete organiser sub-features for updates, tee times, leaderboard, and settings.
4. Add payment integration if paid registration is required.
5. Add file/media upload flow for banners, logos, and tournament assets.
6. Prepare production environment settings for secure cookies and HTTPS.

## Local Setup

### Backend

```bash
cd server
npm install
```

Create a `.env` with values like:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
SESSION_SECRET=your_session_secret
OTP_TTL_MIN=5
```

Start backend:

```bash
node server.js
```

### Frontend

```bash
cd client
npm install
npm start
```

Frontend runs on `http://localhost:3000` and backend on `http://localhost:5000`.

## Notes

- sessions currently use cookie-based auth with Mongo session storage
- development config is set for local HTTP; production should use secure cookies
- the repo already contains strong foundations for the main business flows
- the next big step is consistency, validation, and testing across all modules
