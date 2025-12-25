# Protocol - App Specification

## App Identity

**Name:** Protocol
**Subtitle:** Face Routine for Men
**Full App Store listing:** "Protocol - Face Routine for Men"

**App Store Keywords (100 chars):**
```
mewing,skincare,jawline,looksmax,skin care,face gains,male grooming,glow up,self improvement,routine
```

---

## Overview

A face-focused looksmaxxing app for young males. Personalized routines built from modular blocks based on user input. Simple, actionable, no fluff.

---

## Visual Design & Aesthetic

**Core Vibe:**
- Terminal-like, cold, hard aesthetic
- Black and white primarily
- Minimalist, no fluff
- Monospace or minimal sans-serif typography
- Simple greetings: "Good morning." / "Good evening."

**Color Usage:**
- Mostly black/dark background
- White text
- Green for checkmarks/completion states
- Other accent colors allowed sparingly - but never juvenile or overly colorful

**Tone:**
- Masculine, direct, no emojis
- NOT: "You got this king! 💪"
- YES: Clean, stoic, functional

**Motivation Layer (Future Consideration):**
- Stoic quotes from ancient Greeks, masculine figures
- NOT on main daily screen
- Could appear in: weekly summary, loading moments, notification rotation
- Examples:
  - "We suffer more in imagination than reality." - Seneca
  - "No man is free who is not master of himself." - Epictetus

---

## Target User

- Young males (16-24)
- Beginners who want structure ("where do I start")
- Looking to improve: jawline, skin, overall facial appearance
- NOT fitness or fashion - face only

---

## Core Flow

```
Screen 1: Welcome
┌─────────────────────────────────┐
│ Welcome to Protocol.            │
│                                 │
│ What are you looking to improve?│
│ > _                             │
│                      [Continue] │
└─────────────────────────────────┘
       ↓
AI classifies input, pre-checks detected categories
       ↓
Screen 2: Category Confirmation (ALWAYS shown)
┌─────────────────────────────────┐
│ Select all that apply.          │
│                                 │
│ ■ Jawline        ← AI pre-checked
│ □ Acne                          │
│ □ Oily skin                     │
│ □ Dry skin                      │
│ □ Blackheads                    │
│ □ Dark circles                  │
│ □ Skin texture                  │
│ □ Hyperpigmentation             │
│ □ Facial hair                   │
│                      [Continue] │
└─────────────────────────────────┘
       ↓
Screen 3: Follow-up Questions (only relevant ones shown)
  - Skin type (if not already selected oily/dry)
  - Budget (if products involved)
  - Time available (if routine involved)
       ↓
Screen 4: Sign Up (email/password)
       ↓
Screen 5: Your Plan (with integrated shopping)
  - See full routine with product recommendations
  - For each product: type what you got + [Add] or [Skip]
  - Option to mark "waiting for delivery"
  - [Start Routine] activates when all decided
       ↓
TODAY TAB - Active routine begins
       ↓
Notifications remind them to complete routine
       ↓
Weekly progress photo (same day each week)
       ↓
"What to Expect" card shown after each photo
```

**User States:**
1. **Onboarding** - Screens 1-4 (questions, sign up)
2. **Plan Setup** - Screen 5 (integrated shopping in plan view)
3. **Active Routine** - Today tab with daily tasks

---

## Plan Screen (Integrated Shopping)

Shopping is integrated into the Plan screen (Screen 5 of onboarding). User sees their full routine with ingredient-first product selection inline.

**Display Structure (ingredient-first per step):**
```
┌─────────────────────────────────────┐
│  Your Plan                          │
│                                     │
│  Based on: Jawline, Oily Skin       │
│  Time: 20 min/day | Budget: Low     │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  ▼ Morning Routine                  │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Salicylic Acid (BHA)            ││
│  │                                 ││
│  │ For: Blackheads, oily skin,     ││
│  │      pore control               ││
│  │ Use: Evening cleanser or        ││
│  │      treatment                  ││
│  │                                 ││
│  │ Examples:                       ││
│  │ • CeraVe SA Cleanser (~$15)     ││
│  │ • Paula's Choice 2% BHA (~$22)  ││
│  │ • The Ordinary Salicylic (~$8)  ││
│  │                                 ││
│  │ ┌─────────────────────────────┐ ││
│  │ │ What did you get?           │ ││
│  │ └─────────────────────────────┘ ││
│  │ □ Still waiting for delivery    ││
│  │                                 ││
│  │ [Add to routine]     [Skip]     ││
│  └─────────────────────────────────┘│
│                                     │
│  ▶ Evening Routine                  │
│  ▶ Daily Exercises                  │
│                                     │
│  Progress: 3/7 items decided        │
│                                     │
│         [Start Routine]             │
│    (activates when all decided)     │
└─────────────────────────────────────┘
```

**Key Principles:**
- Ingredient-first approach (scientific, educational)
- Shows WHY they need it, not just product names
- Example products with approximate prices
- User types in the product they purchased
- Their input becomes what shows in daily routine
- User sees full plan context while selecting products

**Two Actions Per Ingredient:**

| Action | Result |
|--------|--------|
| Types product + "Add to routine" | Added to daily routine with their product name |
| Taps "Skip" | Not added to routine, logged in Guide tab for later |
| Neither | Cannot proceed, must decide on each item |

**Product States After Selection:**

| State | Meaning | In Daily Routine |
|-------|---------|------------------|
| **Added** | User has the product | Shows as normal checkable step |
| **Not Received** | Added but "waiting for delivery" checked | Shows but cannot check off |
| **Skipped** | User chose not to get this | Does not show in routine |

**Edge Case - All Skipped:**
```
You've skipped all skincare products.
Your routine will only include exercises.

[ Continue anyway ]    [ Go back ]
```

---

## Daily Routine UX

**Main Screen Layout:**
```
Good morning.

78% this week
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▼ Morning                         3 steps

  ▢ Cleanser
    CeraVe Foaming

  ▢ Niacinamide serum
    The Ordinary

  ▢ SPF
    Neutrogena Ultra Sheer

▶ Evening                         3 steps
▶ Exercises                       2 steps
```

**Layout Details:**
- Simple greeting based on time of day
- Weekly consistency score always visible at top
- Collapsible sections: Morning, Evening, Exercises
- ▼ = expanded, ▶ = collapsed
- Current relevant section auto-expands based on time of day
- Each step shows the user's product name underneath

**Interaction:**
- Tap checkbox (▢) to mark complete → becomes green ✓
- Checkbox has good tap margins to prevent mis-taps
- Tap anywhere on row to expand and see step details
- Long-press or arrow for more details if needed

**Step Details (in accordion):**
When expanded, each step shows:
- Their product name
- Brief instruction (e.g., "Massage for 60 sec, rinse with lukewarm water")

**Not Received Products:**
Products selected but not yet received show differently:
```
  ◌ Niacinamide            not received
    The Ordinary          [ Received ]
```
- Different icon (◌ instead of ▢) - visually distinct, not checkable
- "not received" label
- Inline [ Received ] button - one tap when product arrives
- Once received → becomes normal checkable ▢

**Design Notes:**
- No progress bar needed - consistency score serves this purpose
- Section collapses after completion optional
- Clean, minimal, terminal aesthetic maintained

---

## App Navigation (Tab Structure)

```
[ Today ]    [ Guide ]    [ Progress ]
```

**Today Tab:**
- Main daily routine screen (see Daily Routine UX above)
- What users see most frequently

**Guide Tab:**
- Reference and management layer
- NOT cluttered with daily tasks

```
Your Routine Guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▼ Why this routine
  Based on: Oily skin, blackheads, jawline
  Time: 20 min/day
  Budget: Low

  Your routine targets oil control and pore
  clearing in the AM, active treatment in PM,
  with daily mewing and jaw exercises.

▼ Your products (4)
  ✓ Cleanser - CeraVe Foaming
  ✓ BHA Treatment - Paula's Choice
  ✓ Moisturizer - Cetaphil
  ✓ SPF - Neutrogena

  [ Edit products ]

▼ Skipped ingredients (1)
  ⚠ Niacinamide - recommended for oil control

  [ Add now ]

▼ Exercises
  • Mewing (proper tongue posture)
  • Jaw curls

  [ View tutorials ]
```

**Guide Tab Purpose:**
- Explains WHY this routine was created for them
- Lists all their products in one place
- Shows skipped ingredients (subtle ⚠, not aggressive)
- Skipped items can be added later without redoing onboarding
- Keeps the Today tab clean - no nagging about missing products there

**Progress Tab:**
- Progress photos
- Photo comparison
- Weekly summaries
- Friends/accountability features (layout TBD)

**Settings:**
- Location TBD (likely icon in header or within a tab)

---

## Problem Categories (v1)

| Category | Examples |
|----------|----------|
| Jawline | Weak jaw, double chin, mewing |
| Acne/Pimples | Active breakouts |
| Oily Skin | Shine, large pores |
| Dry Skin | Flaking, tightness |
| Blackheads | Nose, chin area |
| Dark Circles | Under-eye bags |
| Skin Texture | Uneven, rough |
| Hyperpigmentation | Dark spots, uneven tone |
| Facial Hair | Patchy beard, growth tips |

Users select 1-3 that matter most to them.

---

## Modular Routine System

**How it works:**
- Pre-built routine blocks (30-50 total)
- Code assembles blocks based on user selections
- No AI-generated content to users (consistent quality)

**Example assembly:**
```
User selects: Jawline + Acne + Oily Skin
Budget: Low
Time: 20 min

OUTPUT:
Morning Routine:
  - Gentle cleanser (oily skin) [product rec]
  - Moisturizer (lightweight) [product rec]
  - SPF [product rec]

Evening Routine:
  - Cleanser
  - Acne treatment (benzoyl peroxide) [product rec]
  - Moisturizer

Daily Exercises:
  - Mewing practice (5 min)
  - Jaw exercises (5 min)
```

**Product Recommendations:**
- Show product name and where to buy (no affiliate links for MVP)
- Focus on trust and good advice over monetization
- Can add affiliate links later once user base is established

---

## Progress Photo System

**Photo Schedule:**
- Weekly photos, same day each week (based on when user signed up)
- 5 free photos: Week 0, 1, 2, 3, 4
- Paywall at Week 5 (first week of month 2)

**Photo Storage: Local-First**
- Photos stored locally using `expo-file-system` (documentDirectory)
- NOT in device gallery - private to app
- Zero cloud storage costs
- GDPR-friendly - data never leaves device
- Trade-off: Lost if user deletes app (acceptable for MVP)

**Photo Capture UI:**
```
┌─────────────────────────────────────┐
│                              [X]    │
│    ┌───────────────────────────┐    │
│    │      [Camera Preview]     │    │
│    │                           │    │
│    │    ╭───────────────╮      │    │
│    │    │   ──  ──      │      │    │  ← Face outline overlay
│    │    │      │        │      │    │  ← Center + eye guides
│    │    ╰───────────────╯      │    │
│    └───────────────────────────┘    │
│                                     │
│    Use the same spot and lighting   │
│    each week for best comparison.   │
│                                     │
│           [ ◯ Capture ]             │
└─────────────────────────────────────┘
```

**Capture Flow:**
1. User taps "Take Week X Photo"
2. Camera opens with face outline overlay (PNG asset - TO CREATE)
3. Tip text: "Use the same spot and lighting each week"
4. Capture → Preview with [Retake] / [Use Photo]
5. Save to local storage
6. Show "What to Expect" card

**Photo Naming:** `week_[number]_[timestamp].jpg`

---

**"What to Expect" Feature:**
After each photo, show a modular card based on user's selected concerns:
- Validates progress even when changes are subtle
- Sets realistic expectations per concern type
- Shows "what to expect next week" to build anticipation
- Keeps users motivated during the "no visible change" period (weeks 1-3)

**Example content per concern per week:**
| Week | Jawline/Mewing | Acne | Oily Skin |
|------|----------------|------|-----------|
| 1 | Muscles adjusting, tongue posture building | Possible purging, skin adjusting | Slight balance starting |
| 2 | Jaw may feel tired (good sign) | Purging may continue | Less midday shine |
| 3 | Subtle definition starting | New breakouts slowing | Pores appearing smaller |
| 4 | Others might notice changes | Existing spots healing | Consistent oil control |

**Tone:**
- Realistic, not hype
- Data-driven ("most users see X at this stage")
- Never overpromise

---

## Friends & Accountability System

**How it works:**
- Each user gets a unique friend code (e.g., "JAKE847")
- Share code with friends via text, social, etc.
- Friends download app → enter code → connection request
- Accept to become accountability partners

**Features (Free):**
- Unlimited friends
- Notifications when friends complete their routine
- Friends list showing who completed today
- Mute individual friends (prevent notification spam)
- Ghost counter on home screen: "847 users completed today"

**Features (Premium):**
- Compare your consistency score with friends
- See friends' weekly stats

**Why free:**
- Viral growth mechanism (users recruit users)
- Retention through social accountability
- Premium upsell is stat comparison, not core functionality

---

## Features

### Free Tier
- Full personalized routine
- Daily routine view (morning/evening/exercises)
- Notification reminders
- 5 progress photos (Week 0-4)
- Basic photo comparison (side-by-side)
- Weekly summary (basic: consistency % only)
- Friends feature (unlimited friends, notifications)
- Ghost counter ("X users completed today")
- 1 plan generation

### Premium Tier
- Unlimited progress photos
- Photo timeline view
- Detailed weekly summary:
  - Consistency breakdown (morning/evening/exercises)
  - Current streak vs best streak
  - Trend over time
- Compare stats with friends
- Unlimited plan regeneration

---

## Consistency Score System

**How it works:**
- Weekly consistency score (resets each week)
- Calculated as: days completed / 7
- Displayed as percentage (e.g., "78%")

**Weekly Summary:**
- Sent/shown at end of each week
- Free: Shows only overall consistency %
- Premium: Detailed breakdown by routine type, streak info, trends

**Design Notes:**
- Call it "consistency score" not "streak" (less cringe for this demographic)
- Fresh start each week (psychologically motivating after bad weeks)
- No points, levels, or childish gamification

---

## AI Usage

**AI for classification only (cheap + reliable):**
- User types freely → AI returns category array
- Cost: ~$0.00003 per call (basically free)
- Using GPT-4o-mini or similar

**NOT using AI for:**
- Generating routine content (pre-built instead)
- Giving skincare advice (controlled by you)
- Any user-facing text generation
- Face analysis (not in MVP - potential future feature)

**Abuse prevention:**
- Free: 1 classification call (one plan)
- Regenerate plan = premium feature

---

## Engagement Hooks

| Hook | Implementation |
|------|----------------|
| Daily reminders | Push notifications for routine times (masculine tone) |
| Weekly photo | Prompt same day each week based on sign-up |
| "What to Expect" | Modular content after each photo validates progress |
| Consistency score | Weekly score with summary, resets for fresh starts |
| Friends | Notifications when friends complete, social accountability |
| Ghost counter | "847 users completed today" - community feel without complexity |

**Notification Tone:**
- Masculine, no fluff: "Routine ready. 8 minutes."
- NOT: "Time for your skincare! ✨"
- In-notification snooze option: "Remind me in 1 hour"
- Max 2 notifications per day

**Notification Timing:**
- App sets default times (e.g., 8am morning, 9pm evening)
- User can change times in Settings
- No time picker in onboarding - reduces friction

**Re-engagement Notifications:**
- **Day 3 of inactivity:** Softer nudge with stoic quote
  - Example: "We suffer more in imagination than reality. - Seneca. Ready to restart?"
- **Day 7 of inactivity:** More intense nudge, different quote
  - Example: "You've built nothing in a week. Start now."
- After Day 7: Stop notifications - don't be desperate

**Weekly Summary Notification:**
- Push notification with teaser
- Example: "78% this week. See your breakdown."
- Tapping opens full summary in app (Progress tab)

---

## Monetization

### Primary: Freemium Subscription
- Free app with full routine + 5 photos + friends
- Premium for unlimited photos, detailed stats, friend comparison

### Pricing (Decided)
- **Monthly:** $4.99/month
- **Annual:** $29.99/year (50% off, "6 months free" messaging)
- **Free trial:** 1 week free (payment method required upfront)
- **Urgency:** "Limited offer" messaging on annual plan (marketing, not actual limit)

### Week 5 Paywall Flow
```
Week 5 photo prompt appears
       ↓
"Your progress photos are now premium."
       ↓
User taps Subscribe
       ↓
1 week free trial starts (payment method required)
       ↓
Immediately unlocks:
  - Week 5 photo
  - All premium features
       ↓
After 1 week → $4.99 charged (or $29.99 if annual)
       ↓
Monthly/annual billing continues
```

**Week 5 Paywall UI:**
```
Week 5.

Your progress photos are now premium.

[ $4.99/month ]     [ $29.99/year ]
   1 week free        50% off - limited offer

              [ Maybe later ]
```

### Cancellation Policy
- Photos stored for **6 months** after cancellation
- During cancellation: access limited to first month only (Week 0-4 photos)
- Resubscribe within 6 months → full access restored
- After 6 months → photos permanently deleted
- **Deletion warning:** Push notification 7 days before deletion ("Your photos will be deleted in 7 days. Resubscribe to keep them.")

### Subtle Premium Prompts (Before Week 5)
- **Weekly summary:** "Want the full breakdown?" below basic % → [Go Premium]
- **Friend comparison:** Show locked comparison feature when viewing friends
- **Plan regeneration:** Soft prompt if they try to regenerate plan
- NOT aggressive - subtle and non-intrusive

### Product Recommendations (No Affiliates for MVP)
- Show product names and where to buy
- No affiliate links initially - focus on trust
- Revisit affiliate strategy once user base established (50K+ users)

---

## Tech Stack (Planned)

Same as LoveWidgets:
- React Native / Expo
- Firebase (Auth, Firestore for user data)
- RevenueCat (subscriptions)
- OpenAI API (classification only)
- expo-file-system (local photo storage - NOT Firebase Storage)
- expo-camera (photo capture)
- expo-image-manipulator (photo compression)

---

## Marketing Strategy

- UGC content (transformation stories)
- TikTok/Reels (viral potential high)
- Leverage ecom marketing experience
- Target looksmaxxing communities
- Friend codes as viral loop

---

## Open Questions

- [x] ~~Exact premium pricing~~ → $4.99/month, $29.99/year
- [x] ~~Week 5 paywall copy/messaging~~ → See Monetization section
- [x] ~~Annual plan discount percentage~~ → 50% off
- [x] ~~Photo capture flow~~ → Local storage, face outline overlay, tip text
- [x] ~~Onboarding exact flow~~ → 5 screens, AI pre-check + manual confirm, integrated shopping
- [x] ~~App name / branding~~ → Protocol (subtitle: Face Routine for Men)

---

## Key Differentiators

1. Face-focused only (not another fitness app)
2. Personalized but consistent (modular system)
3. Progress photos with "What to Expect" validation
4. Simple daily routine (not overwhelming)
5. Friends/accountability built-in (viral growth)
6. Realistic expectations, no hype
7. Built by someone who knows the audience (ecom experience)

---

## Decisions Made

**Included in MVP:**
- Modular routine system
- 5 free photos, paywall at Week 5
- "What to Expect" content per photo
- Friends with codes (unlimited, free)
- Consistency score (weekly)
- Ghost counter
- Product recommendations (no affiliate)

**Onboarding:**
- 5 screens: Welcome → Categories → Questions → Sign Up → Plan
- Free text input with AI classification
- AI pre-checks categories, user always confirms manually
- Max 3 categories per user
- Follow-up questions only shown if relevant
- Sign-up after questions (lower friction)
- Shopping integrated into Plan screen (ingredient-first)

**Photo System:**
- Local storage only (expo-file-system)
- NOT in gallery, private to app
- Face outline overlay PNG (asset to create)
- Tip: "Use the same spot and lighting each week"
- Compression before saving (~500KB-1MB per photo)

**NOT in MVP (future consideration):**
- AI face analysis
- Affiliate links
- Coach/consultation tier
- Random friend matching
- Cloud photo backup (potential premium feature)
- Social sign-in (Apple/Google)

---

## Related Documents

- `ONBOARDING_FLOW.md` - Detailed onboarding specification
- `PHOTO_CAPTURE_FLOW.md` - Detailed photo capture specification

---

*Document created: December 2025*
*Last updated: December 2025*
*Status: Ready to code - all decisions complete*
