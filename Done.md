# GoLaugh Tournament App Development Checklist

## 1. Core Authentication & User Management
- [x] OTP-based Login/Signup
- [x] Basic User Roles (Player, Organizer, Admin)
- [x] Profile Management (Name, Phone, Email, City)
- [x] Friendship System (Add friends to register together in teams)
- [ ] Advanced Profile details (Handicap Index tracking, Parent Club)

## 2. Tournament Management (Organizers)
- [x] Create/Edit Tournament (Title, Dates, Venue, Format, Rounds)
- [x] Multi-format support (Stroke Play, Stableford, etc.)
- [x] Registration Rules (Fees, Team Size, Max Players, Handicap Limits)
- [x] Manual Registration (Organizer adding players manually)
- [x] Tournament Visibility (Public/Private)
- [x] Tournament Status Workflow (Draft -> Open -> Live -> Completed)
- [x] Banner/Logo uploads (Basic support)

## 3. Registration & Payments
- [x] Personal Registration for Individual formats
- [x] Team-Based Registration (Register with friends as partners)
- [x] Automated Entry Pass (QR Code) & Secret Generation for approved players
- [x] Organizer Approval/Rejection Workflow
- [x] Handling Blocked Players (Automatically blocking groups with blocked users)
- [/] Payment Integration
    - [x] Manual Payment Toggle
    - [ ] Stripe/PayPal Integration (Phase 2)

## 4. Scheduling & Match Management
- [x] Auto-Scheduling Engine (Create match slots based on approved players)
- [x] Manual Match Adjustments (Hole, Status, Scores)
- [x] Auto-Live Status (Matches automatically turn "Live" when start time is reached)
- [/] Match Visibility
    - [x] API to fetch tournament matches
    - [ ] Debug "Missing matches" issue in Organizer Dashboard (Investigate fetch logic)
- [x] Match PiP (Picture-in-Picture) mode for live tracking

## 5. Scoring & Leaderboards
- [x] Hole-by-hole Live Scoring (In-match updates)
- [x] Auto-calculation of Stroke/Stableford totals from hole scores
- [/] Real-time Leaderboard
    - [x] LeaderboardEntry model
    - [ ] Auto-updating Leaderboard logic when match scores change
    - [ ] Leaderboard categories (Overall, Team, Flight)

## 6. Social & Communication
- [x] Tournament Announcements (Updates by Organizer)
- [ ] Post/Photo sharing for players
- [ ] Like/Comment on tournament highlights

## 7. Sponsor Integration
- [x] Sponsor Bidding system
- [x] Sponsor Profile setup
- [ ] Sponsor Logo placement on Leaderboards/Hero sections

## Current Priorities (Next Steps)
1. **Verify Match Visibility**: Debug why scheduled matches sometimes don't appear in the organizer dashboard.
2. **Leaderboard Refresh**: Ensure leaderboard entries sync automatically with live match scores.
3. **Advanced Profile**: Implement Handicap tracking over time for players.
4. **Social Feed**: Start building the 'Post' component for tournament highlights.
