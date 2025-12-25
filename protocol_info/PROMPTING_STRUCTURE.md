# Prompting Structure for Building Protocol App

This document outlines the order and structure for prompting Cursor to build the Protocol app. Each phase builds on the previous one. Do NOT combine phases into one prompt - complete each before moving to the next.

---

## Phase 1: Project Foundation

### 1.1 - Project Setup
- Initialize Expo React Native project
- Install core dependencies (firebase, expo-camera, expo-file-system, etc.)
- Set up folder structure
- Configure TypeScript

### 1.2 - Design System
- Create theme/constants file with colors, typography, spacing
- Terminal aesthetic: dark background (#0a0a0a), off-white text (#e5e5e5)
- Monospace font for headings, clean sans-serif for body
- Reusable style primitives

### 1.3 - Navigation Shell
- Set up React Navigation with bottom tabs
- Three tabs: Today, Guide, Progress
- Basic placeholder screens for each tab
- Tab styling to match terminal aesthetic

---

## Phase 2: Authentication

### 2.1 - Firebase Setup
- Configure Firebase project connection
- Set up Firebase Auth with email/password
- Create auth context/provider for app-wide state

### 2.2 - Auth Screens
- Sign Up screen (email + password)
- Sign In screen
- Basic validation and error handling
- Navigation between auth and main app

---

## Phase 3: Onboarding Flow

### 3.1 - Onboarding Navigation
- Create onboarding stack navigator
- Set up flow: Welcome -> Categories -> Questions -> SignUp -> Plan
- Progress tracking through onboarding

### 3.2 - Screen 1: Welcome + Free Text
- Terminal-style input with blinking cursor
- "What are you looking to improve?" prompt
- Continue button to proceed

### 3.3 - AI Classification Integration
- Set up OpenAI API call for classification
- Input: user text -> Output: category array
- Handle edge cases (gibberish, off-topic, vague input)

### 3.4 - Screen 2: Category Confirmation
- Display 9 category checkboxes
- Pre-check categories from AI classification
- Max 3 selection limit with error message
- Handle Oily + Dry = Combination logic

### 3.5 - Screen 3: Follow-up Questions
- Conditional question logic based on selected categories
- Skin type question (if needed)
- Budget question (Low/Medium/Flexible)
- Time question (10/20/30 min)

### 3.6 - Screen 4: Sign Up Integration
- Connect existing auth screens to onboarding flow
- Save onboarding data after account creation

### 3.7 - Screen 5: Your Plan (Integrated Shopping)
- Display generated routine based on selections
- Collapsible sections: Morning, Evening, Exercises
- Ingredient-first product cards with recommendations
- Product input field + "Add to routine" / "Skip" buttons
- "Still waiting for delivery" checkbox
- Progress tracker (X/Y items decided)
- Start Routine button (enabled when all decided)

---

## Phase 4: Routine Data System

### 4.1 - Routine Blocks Database
- Create data structure for 30-50 routine blocks
- Each block: ingredient, purpose, usage instructions, product recommendations
- Category-to-blocks mapping

### 4.2 - Routine Assembly Logic
- Function to combine blocks based on user selections
- Conflict resolution for contradictory concerns
- Budget and time filtering

### 4.3 - User Routine State
- Store user's selected products in Firestore
- Track product states (Added, Not Received, Skipped)
- Routine activation status

---

## Phase 5: Today Tab (Daily Routine)

### 5.1 - Main Today Screen Layout
- Time-based greeting ("Good morning." / "Good evening.")
- Weekly consistency score display at top
- Collapsible routine sections (Morning, Evening, Exercises)

### 5.2 - Routine Section Components
- Collapsible accordion behavior
- Auto-expand relevant section based on time of day
- Step count indicator per section

### 5.3 - Routine Step Component
- Checkbox with tap-to-complete
- Product name display underneath step name
- Expandable details with instructions
- "Not received" state with different icon and inline "Received" button

### 5.4 - Completion Tracking
- Track step completions in state/database
- Update consistency score in real-time
- Mark sections as complete when all steps done

---

## Phase 6: Guide Tab

### 6.1 - Guide Screen Layout
- "Your Routine Guide" header
- Collapsible sections structure

### 6.2 - Why This Routine Section
- Display user's concerns, time, budget
- Brief explanation of routine strategy

### 6.3 - Your Products Section
- List all added products
- Edit products button

### 6.4 - Skipped Ingredients Section
- Show skipped items with subtle warning
- "Add now" button to add without re-onboarding

### 6.5 - Exercises Section
- List exercise routines
- Link to tutorials (placeholder for MVP)

---

## Phase 7: Progress Tab & Photo System

### 7.1 - Progress Tab Layout
- Weekly photo prompt card
- Photo timeline/grid view
- Comparison view access

### 7.2 - Photo Capture Screen
- Camera view with expo-camera (front-facing only)
- Face outline overlay PNG (create asset)
- Tip text: "Use the same spot and lighting each week"
- Capture button

### 7.3 - Photo Preview & Save
- Preview captured photo
- Retake / Use Photo buttons
- Save to local storage (expo-file-system)
- Compress image before saving

### 7.4 - Local Photo Storage
- Create progress_photos directory
- File naming: week_X_timestamp.jpg
- Load and display saved photos

### 7.5 - Photo Comparison View
- Side-by-side display (Week 0 vs Week X)
- Navigation between weeks

### 7.6 - What to Expect Cards
- Display after each photo capture
- Content based on user's concerns and current week
- Realistic progress expectations

---

## Phase 8: Notifications

### 8.1 - Notification Setup
- Configure expo-notifications
- Request permissions flow

### 8.2 - Routine Reminders
- Morning and evening reminder scheduling
- Default times with user-adjustable settings
- Masculine notification tone/copy

### 8.3 - Weekly Photo Reminder
- Schedule based on signup day
- "Same day. Same spot. Same light."

### 8.4 - Re-engagement Notifications
- Day 3 inactivity: soft nudge with stoic quote
- Day 7 inactivity: stronger nudge
- Stop after Day 7

### 8.5 - Weekly Summary Notification
- End-of-week push with consistency teaser
- Deep link to Progress tab

---

## Phase 9: Friends & Accountability

### 9.1 - Friend Code System
- Generate unique friend codes per user
- Store codes in Firestore

### 9.2 - Add Friend Flow
- Enter friend code screen
- Send/accept connection requests
- Friends list storage

### 9.3 - Friends List UI
- Make new 4th tab called social
- Display friends and their completion status
- Mute individual friends option

### 9.4 - Friend Notifications
- Notify when friends complete routine
- Respect mute settings

### 9.5 - Ghost Counter
- Track global completions per day
- Display "X users completed today" on home screen

---

## Phase 10: Premium & Paywall

### 10.1 - RevenueCat Setup
- Configure RevenueCat SDK
- Set up products ($4.99/month, $29.99/year)
- 1-week free trial configuration

### 10.2 - Week 5 Paywall
- Detect when user reaches Week 5 photo
- Display paywall modal
- Handle subscription purchase flow

### 10.3 - Premium Feature Gates
- Unlimited photos (beyond Week 4)
- Detailed weekly summary
- Friend stat comparison
- Plan regeneration

### 10.4 - Subtle Premium Prompts
- Weekly summary: "Want the full breakdown?"
- Friend comparison locked state
- Non-aggressive styling

### 10.5 - Subscription State Management
- Track premium status across app
- Handle cancellation (6-month photo retention)
- Deletion warning notification

---

## Phase 11: Consistency Score & Weekly Summary

### 11.1 - Consistency Calculation
- Track completions per day
- Calculate weekly percentage (days completed / 7)
- Weekly reset logic

### 11.2 - Weekly Summary Screen
- Free tier: overall consistency % only
- Premium: breakdown by routine type, streaks, trends

### 11.3 - Summary Delivery
- End-of-week trigger
- Push notification teaser
- In-app summary display

---

## Phase 12: Polish & Edge Cases

### 12.1 - Loading States
- Skeleton screens for data loading
- Terminal-style loading indicators

### 12.2 - Error Handling
- Network errors
- Auth errors
- Graceful fallbacks

### 12.3 - Edge Case Handling
- All products skipped warning
- Multi-day skip impact
- Mid-routine concern changes

### 12.4 - Settings Screen
- Notification time adjustment
- Account management
- Premium status display

---

## Notes for Prompting AI

1. **Always reference the source files** - Point to STYLE_GUIDE.md for copy/design, ONBOARDING_FLOW.md for onboarding details, etc.

2. **One phase at a time** - Complete and test each phase before starting the next.

3. **Provide context** - Each prompt should include what has been built so far.

4. **Be specific about aesthetics** - The terminal/stoic vibe is critical. Reference the copy examples in STYLE_GUIDE.md.

5. **Test before proceeding** - Ensure navigation works, data flows correctly, before adding features on top.

---

*Created: December 2025*
