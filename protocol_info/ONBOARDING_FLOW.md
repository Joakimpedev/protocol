# Onboarding Flow - Specification

## Overview

Terminal-style, minimal onboarding. AI-assisted classification with manual confirmation. Shopping integrated into plan view.

---

## Screen Flow

```
Screen 1: Welcome + Free Text
       ↓
Screen 2: Category Confirmation (always shown, AI pre-checks)
       ↓
Screen 3: Follow-up Questions (only relevant ones)
       ↓
Screen 4: Sign Up / Sign In
       ↓
Screen 5: Your Plan (with integrated shopping)
       ↓
Today Tab (routine active)
```

---

## Screen 1: Welcome + Free Text

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│  Welcome to Protocol.               │
│                                     │
│  What are you looking to improve?   │
│                                     │
│  > _                                │
│                                     │
│                                     │
│                        [Continue]   │
│                                     │
└─────────────────────────────────────┘
```

**Behavior:**
- Terminal-style blinking cursor
- User types freely
- On Continue → API call to classify input

**AI Classification Call:**
```javascript
// Input
{ "user_input": "I want a sharper jawline and clearer skin" }

// Output
{
  "categories": ["jawline", "acne"],
  "confidence": 0.85,
  "off_topic": false
}
```

**AI Edge Cases:**

| Input | AI Response | Result |
|-------|-------------|--------|
| "sharper jawline" | `["jawline"]` | Pre-check jawline |
| "better skin, less oily" | `["oily_skin"]` | Pre-check oily skin |
| "asdfjkl" | `[]` | No pre-checks, show categories |
| "better fashion" | `{ "off_topic": true }` | No pre-checks, show categories |
| "I want to glow up" | `[]` (too vague) | No pre-checks, show categories |

---

## Screen 2: Category Confirmation

**Always shown.** AI pre-checks detected categories. User confirms and can add more.

```
┌─────────────────────────────────────┐
│                                     │
│  Select all that apply.             │
│                                     │
│  ■ Jawline / face structure         │  ← pre-checked by AI
│  ■ Acne / breakouts                 │  ← pre-checked by AI
│  □ Oily skin                        │
│  □ Dry skin                         │
│  □ Blackheads                       │
│  □ Dark circles                     │
│  □ Skin texture                     │
│  □ Hyperpigmentation                │
│  □ Facial hair                      │
│                                     │
│                        [Continue]   │
│                                     │
└─────────────────────────────────────┘
```

**Rules:**
- Must select at least 1 category
- Max 3 categories (if they try to select 4th, show: "Pick your top 3")
- If user selects both Oily + Dry → treat as "Combination" skin type (no need to ask later)

---

## Screen 3: Follow-up Questions

**Only show questions relevant to selected categories.**

### Question Logic Matrix

| Category | Ask Skin Type? | Ask Budget? | Ask Time? |
|----------|----------------|-------------|-----------|
| Jawline | No | No | Yes |
| Acne | IF no oily/dry selected | Yes | Yes |
| Oily Skin | No (implied) | Yes | Yes |
| Dry Skin | No (implied) | Yes | Yes |
| Blackheads | IF no oily/dry selected | Yes | Yes |
| Dark Circles | No | Yes | No |
| Skin Texture | IF no oily/dry selected | Yes | Yes |
| Hyperpigmentation | IF no oily/dry selected | Yes | Yes |
| Facial Hair | No | Yes | No |

### Example Scenarios

**User selects: Jawline only**
→ Only ask: Time (10/20/30 min)

**User selects: Jawline + Oily Skin**
→ Ask: Budget, Time

**User selects: Acne + Hyperpigmentation**
→ Ask: Skin type, Budget, Time

**User selects: Oily Skin + Dry Skin (combination)**
→ Ask: Budget, Time (skin type already known)

### Screen Layout

```
┌─────────────────────────────────────┐
│                                     │
│  Quick questions.                   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Skin type?              (if shown) │
│  ○ Oily                             │
│  ○ Dry                              │
│  ○ Combination                      │
│  ○ Normal                           │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Budget for products?    (if shown) │
│  ○ Low (~$30)                       │
│  ○ Medium (~$60)                    │
│  ○ Flexible                         │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Daily time?             (if shown) │
│  ○ 10 min                           │
│  ○ 20 min                           │
│  ○ 30 min                           │
│                                     │
│                        [Continue]   │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 4: Sign Up

```
┌─────────────────────────────────────┐
│                                     │
│  Create your account.               │
│                                     │
│  Email                              │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Password                           │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│        [Create Account]             │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Already have an account? Sign in   │
│                                     │
└─────────────────────────────────────┘
```

**Notes:**
- Email + password only for MVP
- Social sign-in (Apple/Google) can be added later
- Sign-in placed AFTER questions = lower friction, higher investment

---

## Screen 5: Your Plan (Integrated Shopping)

After sign-up, user sees their complete plan with shopping embedded. **Ingredient-first approach** - shows the ingredient/purpose, then product recommendations.

```
┌─────────────────────────────────────┐
│                                     │
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
│  │ Salicylic Acid (BHA)            ││  ← Ingredient name
│  │                                 ││
│  │ For: Blackheads, oily skin,     ││  ← Why they need it
│  │      pore control               ││
│  │ Use: Morning cleanser           ││  ← When to use
│  │                                 ││
│  │ Examples:                       ││
│  │ • CeraVe SA Cleanser (~$15)     ││
│  │ • Paula's Choice 2% BHA (~$22)  ││
│  │ • The Ordinary Salicylic (~$8)  ││
│  │                                 ││
│  │ ┌─────────────────────────────┐ ││
│  │ │ What did you get?           │ ││  ← User types product
│  │ └─────────────────────────────┘ ││
│  │ □ Still waiting for delivery    ││
│  │                                 ││
│  │ [Add to routine]     [Skip]     ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Niacinamide                     ││
│  │ ...                             ││
│  └─────────────────────────────────┘│
│                                     │
│  ▶ Evening Routine                  │
│  ▶ Daily Exercises                  │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  Progress: 3/7 items decided        │
│                                     │
│         [Start Routine]             │
│    (activates when all decided)     │
│                                     │
└─────────────────────────────────────┘
```

### Product States

| User Action | State | In Daily Routine |
|-------------|-------|------------------|
| Types product + "Add" | **Added** | Shows as checkable step |
| Types product + "Add" + marks "waiting for delivery" | **Not Received** | Shows but can't check off yet |
| Taps "Skip" | **Skipped** | Does not appear |

### "Not Received" Flow

When user adds a product, show toggle:

```
┌─────────────────────────────────────┐
│ What did you get?                   │
│ ┌─────────────────────────────────┐ │
│ │ CeraVe Foaming Cleanser         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ □ Still waiting for delivery        │
│                                     │
│ [Add to routine]          [Skip]    │
└─────────────────────────────────────┘
```

### All Skipped Warning

If user skips all products in a section:

```
┌─────────────────────────────────────┐
│                                     │
│  You've skipped all skincare        │
│  products.                          │
│                                     │
│  Your routine will only include     │
│  exercises.                         │
│                                     │
│  [Continue anyway]     [Go back]    │
│                                     │
└─────────────────────────────────────┘
```

---

## Complete User Journey

```
1. Open app for first time
2. "Welcome to [AppName]. What are you looking to improve?"
3. Type: "jawline and acne"
4. AI detects → jawline, acne pre-checked
5. Confirm categories (can add more)
6. Answer: skin type, budget, time
7. Create account (email/password)
8. See full plan with integrated shopping
9. For each product: add what you got or skip
10. "Start Routine" → Today tab activates
```

---

## Data Stored After Onboarding

```javascript
{
  user_id: "abc123",
  email: "user@example.com",

  // From onboarding
  concerns: ["jawline", "acne", "oily_skin"],
  skin_type: "oily",  // or derived from concerns
  budget: "low",
  daily_time: 20,

  // From shopping
  products: [
    { step: "cleanser", name: "CeraVe Foaming", received: true },
    { step: "moisturizer", name: "Cetaphil", received: false },
    { step: "spf", skipped: true }
  ],

  // Routine
  routine_started: true,
  signup_date: "2025-12-19",
  photo_day: "thursday"  // weekly photo day
}
```

---

*Decision locked: December 2025*
