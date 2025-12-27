# Protocol Tab - Product Section Specification

## Overview

The Protocol tab shows the user's routine with problem/solution overview and their products. This spec covers the product management section.

---

## Product List Display

Each product shows:
- Ingredient name
- Product name (if active) or empty
- Status badge
- Configure button

```
┌─────────────────────────────────────┐
│                                     │
│  Your products                      │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ SALICYLIC ACID (BHA)            ││
│  │ CeraVe SA Cleanser         [•••]││
│  │                        You have ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ NIACINAMIDE                     ││
│  │                            [•••]││
│  │                Arriving Dec 30  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ RETINOL                         ││
│  │                            [•••]││
│  │                         Skipped ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## Badge States

| State | Badge Text | Calculation |
|-------|------------|-------------|
| Active | `You have` | User confirmed they have it |
| Pending | `Will get` | Said "Will get it" in onboarding, not yet configured |
| Deferred | `Arriving [date]` | Today + defer time (1 day/3 days/1 week) |
| Skipped | `Skipped` | User chose "Skip forever" |

---

## Date Calculation for "Arriving"

| User selected | Badge shows |
|---------------|-------------|
| 1 day | Tomorrow's date |
| 3 days | Date 3 days from selection |
| 1 week | Date 7 days from selection |

Format: `Arriving Dec 30` or `Arriving Jan 2`

---

## Configure Button [•••]

Tapping opens configure modal. Content depends on current state.

---

## Configure Modal - Active Product

```
┌─────────────────────────────────────┐
│                                     │
│  SALICYLIC ACID (BHA)          [X]  │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  Your product                       │
│  ┌─────────────────────────────────┐│
│  │ CeraVe SA Cleanser              ││
│  └─────────────────────────────────┘│
│                                     │
│           [Update]                  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Remove from routine                │
│                                     │
└─────────────────────────────────────┘
```

**Actions:**
- Can edit product name
- "Remove from routine" = same as skip forever, shows warning

---

## Configure Modal - Pending Product

```
┌─────────────────────────────────────┐
│                                     │
│  NIACINAMIDE                   [X]  │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  Controls oil, reduces pores.       │
│                                     │
│  Do you have this now?              │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Product name...                 ││
│  └─────────────────────────────────┘│
│                                     │
│         [I have this]               │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│      Waiting for delivery           │
│      Skip forever                   │
│                                     │
└─────────────────────────────────────┘
```

**Actions:**
- Same flow as routine modal
- Full decision tree available

**Visual hierarchy:**
- "I have this" = primary button
- "Waiting for delivery" = secondary text link
- "Skip forever" = small muted text

---

## Configure Modal - Deferred Product

```
┌─────────────────────────────────────┐
│                                     │
│  NIACINAMIDE                   [X]  │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  Arriving Dec 30                    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Got it early?                      │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Product name...                 ││
│  └─────────────────────────────────┘│
│                                     │
│         [I have this]               │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Change delivery date               │
│  Skip forever                       │
│                                     │
└─────────────────────────────────────┘
```

**Actions:**
- Shows expected arrival date
- Can mark as received early
- "Change delivery date" opens time picker (1 day / 3 days / 1 week)
- "Skip forever" shows warning

---

## Configure Modal - Skipped Product

```
┌─────────────────────────────────────┐
│                                     │
│  RETINOL                       [X]  │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  You skipped this ingredient.       │
│                                     │
│  Retinol helps with skin texture    │
│  and anti-aging.                    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Want to add it back?               │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Product name...                 ││
│  └─────────────────────────────────┘│
│                                     │
│         [I have this]               │
│                                     │
│      Waiting for delivery           │
│                                     │
└─────────────────────────────────────┘
```

**Actions:**
- Shows what they're missing (benefit text)
- Can re-add by inputting product name
- Can set as waiting for delivery
- No skip option (already skipped)

---

## Warning Modal - Remove/Skip

When user taps "Remove from routine" or "Skip forever":

```
┌─────────────────────────────────────┐
│                                     │
│  Remove this ingredient?            │
│                                     │
│  BHA helps with oil control and     │
│  pore clearing. Your routine will   │
│  be less effective without it.      │
│                                     │
│  You can re-add it anytime here     │
│  in the Protocol tab.               │
│                                     │
│  [Keep it]           Remove anyway  │
│                                     │
└─────────────────────────────────────┘
```

**Visual hierarchy:**
- "Keep it" = primary button
- "Remove anyway" = small muted text

---

## Visual Hierarchy Summary

| Element | Style |
|---------|-------|
| Ingredient name | Monospace, bold, white |
| Product name | Body, white |
| Badge - You have | Small, green text |
| Badge - Will get | Small, muted/gray text |
| Badge - Arriving [date] | Small, muted/gray text |
| Badge - Skipped | Small, muted/gray text |
| Configure [•••] | Muted, right-aligned |
| Primary actions | Green button |
| Secondary actions | Small muted text |
| Destructive actions | Small muted text (requires confirmation) |

---

*Created: December 2025*
*Status: Specification complete*
