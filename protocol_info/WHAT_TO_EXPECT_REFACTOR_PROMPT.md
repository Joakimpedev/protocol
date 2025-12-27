# What to Expect Screen - Refactor Task

## Context: Where We Are

You are working on the **Protocol** app - a face-focused looksmaxxing app for men. We are in **Phase 7: Progress Tab & Photo System**, specifically working on the **"What to Expect" feature** that appears after users take a progress photo.

## Current State

### What Exists:
1. **Data Structure**: `src/data/what_to_expect.json` contains detailed expectations for all 9 problem categories (jawline, acne, oily_skin, dry_skin, blackheads, dark_circles, skin_texture, hyperpigmentation, facial_hair) with week ranges (0-based, starting at week 0).

2. **Service**: `src/services/whatToExpectService.ts` currently extracts the first sentence from full descriptions to create short summaries.

3. **Screen**: `src/screens/WhatToExpectScreen.tsx` displays expectations after photo capture with this format:
   - Top: "Week x" (just the week number)
   - Second: All problems in one paragraph: "Problem 1: summary. Problem 2: summary. Problem 3: summary."
   - Third: "NEXT WEEK" label
   - Fourth: All problems for next week in one paragraph

### Current Issue:
The service is using `createShortSummary()` which just takes the first sentence from the full descriptions in `what_to_expect.json`. This is not ideal because:
- The first sentences are often too long or not concise enough
- We need purpose-written short summaries for each problem per week
- The summaries should be optimized for the display format (all problems in one paragraph)

## Task: Create Short Summaries

### What Needs to Be Done:

1. **Create a new data structure** with short, concise sentences for each problem per week. These should be:
   - **Short**: 1 sentence, ~15-30 words max
   - **Concise**: Get to the point quickly
   - **Per problem per week**: Each problem needs a unique summary for each week (0, 1, 2, 3, 4, 5, 6, etc.)
   - **No problem name prefix**: Just the text itself (e.g., "Muscle soreness in jaw and neck as you engage underused muscles" NOT "Jawline: Muscle soreness...")

2. **Coverage**: 
   - All 9 problem categories
   - All weeks (at least weeks 0-12, but should cover all weeks that have expectations in the current JSON)
   - Each week should have a summary, even if it's similar to adjacent weeks (try to vary them when possible)

3. **Format Requirements**:
   - The summaries will be displayed in a paragraph like: "Summary 1. Summary 2. Summary 3."
   - They should flow naturally when concatenated
   - Should match the tone: stoic, realistic, no fluff, masculine

4. **Data Structure Options**:
   - Option A: Add a new field `short_summary` to each expectation in `what_to_expect.json`
   - Option B: Create a separate `what_to_expect_short.json` file
   - Option C: Create a mapping object in the service file
   - **Recommendation**: Option A (add to existing JSON) for easier maintenance

### Reference Files:
- `src/data/what_to_expect.json` - Full expectations data (use as reference for content)
- `src/services/whatToExpectService.ts` - Service that needs to use the new short summaries
- `src/screens/WhatToExpectScreen.tsx` - Screen that displays the content

### Example Format:

For Week 1, if user has Jawline and Acne:
- Current week: "Muscle soreness in jaw and neck as you engage underused muscles. The purge begins with more breakouts as deep congestion surfaces."
- Next week: "Jaw may feel tired as muscles adapt. Peak purging phase with inflamed breakouts."

### Week Numbering:
- Week 0 = signup week (baseline photo)
- Week 1 = first full week after signup
- Week numbers are 0-based in the JSON (week_start: 0, week_end: 1 means "Week 1-2" in display)

### Next Steps:
1. Review `what_to_expect.json` to understand all the week ranges
2. Create short summaries for each problem for each week
3. Update the data structure (add `short_summary` field to expectations)
4. Update `whatToExpectService.ts` to use `short_summary` instead of `createShortSummary()`
5. Ensure the screen displays without problem name prefixes (just the summaries concatenated)

## Important Notes:
- The summaries should be realistic and match the detailed descriptions in tone
- They should be short enough to read quickly but informative enough to be useful
- When multiple problems are shown, they should flow naturally in a paragraph
- Week 0 may need special handling (baseline photo, no expectations yet)

---

*This task is part of Phase 7: Progress Tab & Photo System*
*Created: December 2025*



