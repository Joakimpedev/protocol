# Time vs Effectiveness Percentage Calculations

This document explains how the percentages are calculated in the "Time vs Effectiveness" section of the Detailed Insight screen.

## Overview

The "Time vs Effectiveness" section shows:
1. **Waiting periods skips** - percentage of effectiveness lost
2. **Full product skips** - percentage of effectiveness lost
3. **Exercises ended early** - currently only shown as a count (no percentage calculated)

## How Percentages Work

### 1. Waiting Skipped Percentage

**Location**: `src/screens/PremiumInsightScreen.tsx` lines 482-493

**Calculation Method**:
- Uses a "Linear Accumulation" point system
- **Base points** (without waiting): 10 points per application
- **Boosted points** (with waiting): 14 points per application (40% boost)

**Formula**:
```
Total possible waiting opportunities = products in routine × days with activity

Applications with wait = total possible - timer skips
Applications without wait = timer skips

Points earned = (applications with wait × 14) + (applications without wait × 10)
Points ideal = total possible opportunities × 14

Effectiveness = (points earned / points ideal) × 100
Effectiveness lost = 100 - effectiveness
```

**Example**:
- 6 products in routine
- 5 days with activity
- 10 timer skips

```
Total possible = 6 × 5 = 30 opportunities
Applications with wait = 30 - 10 = 20
Applications without wait = 10

Points earned = (20 × 14) + (10 × 10) = 280 + 100 = 380
Points ideal = 30 × 14 = 420

Effectiveness = (380 / 420) × 100 = 90.48%
Effectiveness lost = 100 - 90.48 = 9.52%
```

### 2. Product Skips Percentage

**Location**: `src/screens/PremiumInsightScreen.tsx` lines 495-513

**Calculation Method**:
- Assumes each product application with proper waiting = 14 points
- Calculates based on a full week (7 days)

**Formula**:
```
Total possible applications = products in routine × 7 days
Actual applications = total possible - product skips

Points earned = actual applications × 14
Points ideal = products in routine × 7 × 14

Effectiveness = (points earned / points ideal) × 100
Effectiveness lost = 100 - effectiveness
```

**Example**:
- 6 products in routine
- 8 product skips during the week

```
Total possible = 6 × 7 = 42 applications
Actual applications = 42 - 8 = 34

Points earned = 34 × 14 = 476
Points ideal = 42 × 14 = 588

Effectiveness = (476 / 588) × 100 = 80.95%
Effectiveness lost = 100 - 80.95 = 19.05%
```

### 3. Exercises Ended Early

**Location**: Currently tracked but NOT included in percentage calculation

**Status**: 
- `exerciseEarlyEnds` is tracked in the weekly summary (count of exercises ended early)
- It's displayed in the "What you have skipped" section as a count
- **It does NOT have a percentage calculation in the "Time vs Effectiveness" section**

**Why**: The current implementation only calculates percentages for:
- Waiting periods (timer skips)
- Product skips

Exercises ended early are tracked separately and shown as a count, but don't contribute to the effectiveness percentage calculation.

## Overall Effectiveness

**Location**: `src/screens/PremiumInsightScreen.tsx` lines 515-522

The overall effectiveness combines both waiting periods and product usage:

```
Total points earned = waiting points earned + product points earned
Total points ideal = waiting points ideal + product points ideal

Overall effectiveness = (total points earned / total points ideal) × 100
Total effectiveness lost = 100 - overall effectiveness
```

## Key Constants

Defined in `calculateTimeVsEffectiveness()`:
- `AVERAGE_WAITING_TIME_SECONDS = 30` (30 seconds per waiting period)
- `AVERAGE_PRODUCT_TIME_SECONDS = 45` (45 seconds to apply a product)
- `BASE_POINTS_PER_APPLICATION = 10` (points without waiting)
- `BOOSTED_POINTS_PER_APPLICATION = 14` (points with waiting - 40% boost)

## Notes

1. **Products in routine**: Uses `productsInRoutine` (products with state='added' or 'active'), not all products in the plan
2. **Days with activity**: Uses `summary.daysCompleted` for waiting calculations (more realistic than assuming 7 days)
3. **Full week assumption**: Product calculations assume a full 7-day week
4. **Capping**: Timer skips are capped to not exceed possible opportunities: `Math.min(timerSkips, totalPossibleWaitingOpportunities)`

