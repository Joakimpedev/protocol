# Shopping Flow - Specification

## Overview

Two-context shopping system: optimistic onboarding flow, then accountability-driven routine flow.

---

## Onboarding Shopping (After Sign-Up)

Fast, optimistic, no friction. Assume users will get everything.

### Card Layout

```
┌─────────────────────────────────────┐
│                                     │
│  Get your products.            1/5  │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  SALICYLIC ACID (BHA)               │
│                                     │
│  Controls oil, clears pores.        │
│  Used in your evening routine.      │
│                                     │
│  Examples:                          │
│  • CeraVe SA Cleanser (~$15)        │
│  • Paula's Choice 2% BHA (~$22)     │
│  • The Ordinary Salicylic (~$8)     │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  [I have this]        [Will get it] │
│                                     │
└─────────────────────────────────────┘
```

### Flow

**"I have this" →**
```
┌─────────────────────────────────────┐
│                                     │
│  What product did you get?          │
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│            [Continue]               │
│                                     │
└─────────────────────────────────────┘
```
→ Product marked as active → Next card

**"Will get it" →**
→ Product marked as pending → Next card (no extra steps)

### Design Notes

- Card stack format with progress indicator (1/5, 2/5, etc.)
- No "skip" option during onboarding
- No warnings or friction
- Optimistic framing: assume they'll buy everything

---

## Daily Routine - Pending Products

When users encounter a "Will get it" product in their daily routine.

### Pending Product Display

```
┌─────────────────────────────────────┐
│                                     │
│  ◌ BHA Treatment                    │
│    Waiting for you to get this      │
│                                     │
└─────────────────────────────────────┘
```

Different icon (◌) and visual treatment from active products.

### Tap → Step 1: Do you have this?

```
┌─────────────────────────────────────┐
│                                     │
│  SALICYLIC ACID (BHA)               │
│                                     │
│  Controls oil, clears pores.        │
│                                     │
│  Do you have this now?              │
│                                     │
│  [I have this]    [I don't have this]│
│                                     │
└─────────────────────────────────────┘
```

### If "I have this" → Input Product Name

```
┌─────────────────────────────────────┐
│                                     │
│  What product did you get?          │
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│            [Continue]               │
│                                     │
└─────────────────────────────────────┘
```
→ Product now active in routine

### If "I don't have this" → Step 2: Intent

```
┌─────────────────────────────────────┐
│                                     │
│  This ingredient helps with         │
│  oil control and pore clearing.     │
│                                     │
│      [Waiting for delivery]         │  ← Primary button
│                                     │
│          Skip forever               │  ← Small, muted text
│                                     │
└─────────────────────────────────────┘
```

Shows benefit text as soft reminder of what they're giving up.

### If "Waiting for delivery" → When to Ask Again

```
┌─────────────────────────────────────┐
│                                     │
│  When should we ask again?          │
│                                     │
│  ○ 1 day                            │
│  ○ 3 days                           │
│  ○ 1 week                           │
│                                     │
└─────────────────────────────────────┘
```

→ Product hidden from routine until selected time, then reappears

### If "Skip forever" → Warning Popup

```
┌─────────────────────────────────────┐
│                                     │
│  Skip this ingredient?              │
│                                     │
│  BHA helps with oil control and     │
│  pore clearing. Your routine will   │
│  be less effective without it.      │
│                                     │
│  You can re-add it anytime in       │
│  the Protocol tab.                  │
│                                     │
│  [Keep it]              Skip anyway │
│                                     │
└─────────────────────────────────────┘
```

- "Keep it" = Primary button, returns to previous screen
- "Skip anyway" = Small text, confirms skip

→ Product removed from routine, can be re-added in Protocol tab

---

## Flow Summary Table

| Stage | Action | Result |
|-------|--------|--------|
| **Onboarding** | "I have this" | Input name → active in routine |
| **Onboarding** | "Will get it" | Pending, shows in routine later |
| **Routine** | "I have this" | Input name → active in routine |
| **Routine** | "Waiting for delivery" | Pick 1 day / 3 days / 1 week → hidden until then |
| **Routine** | "Skip forever" | Warning → removed, revert in Protocol tab |

---

## Psychology & Design Rationale

### Two-Context Approach

| Context | User Mindset | Options |
|---------|--------------|---------|
| Onboarding | "I'm starting fresh, I'll get what I need" | Have it / Will get it |
| Daily routine | "I've had time, what's the status?" | Have it / Waiting / Skip forever |

### Friction by Choice

| Action | Friction Level | Visual Weight |
|--------|----------------|---------------|
| I have this | Low (1 tap + input) | Primary button |
| Will get it | Very low (1 tap) | Primary button |
| Waiting for delivery | Low (2 taps) | Primary button |
| Skip forever | High (2 taps + warning) | Small muted text |

### Key Principles

1. **Optimistic onboarding** - No skip option, assume they'll buy
2. **"Will get it" not "Don't have"** - Expectation of action
3. **"Waiting for delivery" not "Remind me later"** - Assumes purchase made
4. **"Skip forever" is harsh** - Deliberate choice with consequences
5. **Warning shows trade-off** - What they lose + where to revert
6. **Max 1 week defer** - Creates accountability, can't postpone indefinitely

---

## Product States

| State | How It Got There | Display in Routine | Can Complete? |
|-------|------------------|-------------------|---------------|
| **Active** | "I have this" + input name | Normal checkbox | Yes |
| **Pending** | "Will get it" in onboarding | ◌ icon + "Waiting for you to get this" | No |
| **Deferred** | "Waiting for delivery" + time | Hidden until time passes | No |
| **Skipped** | "Skip forever" confirmed | Not shown, visible in Protocol tab | N/A |

---

*Created: December 2025*
*Status: Specification complete*
