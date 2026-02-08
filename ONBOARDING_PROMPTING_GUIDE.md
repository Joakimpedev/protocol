# Onboarding Implementation Guide

This guide outlines the complete implementation of the 27-page personalized onboarding flow for Protocol. Build each phase sequentially to ensure proper functionality.

**Reference files:**
- `EXTENDED_ONBOARDING_BASELINE.md` - Full page-by-page specifications
- `onboarding_content.json` - All personalization content and data
- `STYLE_GUIDE.md` - Voice, visual style, and copy rules

---

## Phase 0: Architecture & State Management

### Overview
Before building pages, set up the state management system that powers the entire personalized onboarding flow.

### State Structure
Create an onboarding state object that tracks:

```
{
  selectedProblems: [],           // Array of problem IDs user selected (e.g., ["acne", "jawline"])
  primaryProblem: null,           // Calculated: highest priority problem from selectedProblems
  severityLevel: null,            // User's severity selection for primary problem
  impacts: [],                    // Array of impact IDs from Page 5
  goalSetting: null,              // User's goal selection
  skinType: null,                 // From Page 9 conditional (if applicable)
  followupAnswer: null,           // From Page 9 conditional (varies by problem)
  timeCommitment: null,           // From Page 10
  budget: null,                   // From Page 12 (null if skipped)
  commitment: null,               // From Page 14
  shoppingSelections: {},         // From Page 17 shopping flow
  currentPage: 1                  // Track position in flow
}
```

### Primary Problem Calculation Logic
**Critical:** The entire onboarding personalizes based on the **highest priority problem** (lowest priority number).

**Algorithm:**
1. User selects multiple problems on Page 2
2. For each selected problem, look up its `priority` value in `onboarding_content.json` → `problems[problem_id].priority`
3. Find the problem with the **lowest priority number** (1 is highest priority, 9 is lowest)
4. Store this as `primaryProblem`

**Example:**
- User selects: `["jawline", "oily_skin", "dark_circles"]`
- Priorities: jawline=2, oily_skin=4, dark_circles=7
- Primary problem = `"jawline"` (priority 2 is highest)

### JSON Integration
All content personalization pulls from `onboarding_content.json` using the structure:
- `problems[primaryProblem].field_name` for problem-specific content
- `followup_questions.question_id` for conditional questions
- `impact_options` array for Page 5 impacts
- `wow_users` array for Page 24 matching

### Navigation Flow
- Linear progression (Page 1 → 2 → 3...) with conditional skips:
  - **Page 9**: Skip if certain conditions not met (see Phase 3)
  - **Page 12**: Skip if `problems[primaryProblem].requires_products === false`
- Store `currentPage` in state to allow resume/back navigation

### Routine Time Calculation
For Pages 14 and 19, calculate total routine time:
1. For each problem in `selectedProblems`
2. Sum up `problems[problem_id].routine_time_minutes`
3. Display total (e.g., "22 min/day")

---

## Phase 1: Pages 1-2 (Welcome & Problem Selection)

### Page 1: Welcome
**Layout:**
```
[Random number from 14,141 - 15,836], guys using Protocol.

What are you looking to improve?
> _

[Continue]
```

**Implementation:**
- Generate random number in range 14,141 to 15,836 on page load
- Single text input field
- Continue button navigates to Page 2
- Store text input (optional - can be used for analytics but not required for flow)

**Style notes:**
- Follow `STYLE_GUIDE.md`: monospace headings, clean sans-serif body, terminal-evolved aesthetic
- Dark background (~#0a0a0a), off-white text (~#e5e5e5)

---

### Page 2: Problem Selection
**Layout:**
```
Select all that apply.
□ Acne / breakouts
□ Jawline / face structure
□ Facial hair
□ Oily skin
□ Dry skin
□ Blackheads
□ Dark circles
□ Skin texture
□ Hyperpigmentation

[Continue]
```

**Implementation:**
- Multi-select checkboxes (allow multiple selections)
- Order MUST match the list above (this is priority order from most to least important)
- Map selections to problem IDs:
  - "Acne / breakouts" → `"acne"`
  - "Jawline / face structure" → `"jawline"`
  - "Facial hair" → `"facial_hair"`
  - "Oily skin" → `"oily_skin"`
  - "Dry skin" → `"dry_skin"`
  - "Blackheads" → `"blackheads"`
  - "Dark circles" → `"dark_circles"`
  - "Skin texture" → `"skin_texture"`
  - "Hyperpigmentation" → `"hyperpigmentation"`

**On Continue:**
1. Store `selectedProblems` array in state
2. Calculate and store `primaryProblem` using priority algorithm from Phase 0
3. Navigate to Page 3

**Validation:**
- Require at least one selection before allowing continue

---

## Phase 2: Pages 3-5 (Severity, Education, Impact)

### Page 3: Severity Rating
**Layout:**
```
[Question from JSON]

○ [Option 1]
○ [Option 2]
○ [Option 3]
○ [Option 4]

[Continue]
```

**Content Source:**
- Question: `problems[primaryProblem].severity_question.question`
- Options: `problems[primaryProblem].severity_question.options` array
  - Display `label`, store `value` when selected

**Implementation:**
- Single-select radio buttons
- Dynamically render question and options based on `primaryProblem`
- Store selected `value` as `severityLevel` in state
- This value is used later for Page 7 timeline stats

**Example:**
- If `primaryProblem === "acne"`, question is "How bad is your acne right now?"
- If `primaryProblem === "jawline"`, question is "Current jawline state?"

---

### Page 4: Education - The Real Cause
**Layout:**
```
[Title]

━━━━━━━━━━━━━━━━━━━━━━━━

[Stat line - if applicable]
• [Cause 1]
• [Cause 2]
• [Cause 3]

[Closing line]

[Continue]
```

**Content Source:**
`problems[primaryProblem].education_real_cause`
- `title` → Main heading
- `causes` → Array of bullet points
- `closing_line` → Bottom text

**Implementation:**
- Static informational page
- No user input required
- Continue navigates to Page 5

**Note:** Some problems have a stat line (like "89% of cases are caused by:"), others don't. Check if content structure varies and adapt accordingly.

---

### Page 5: Impact Question
**Layout:**
```
How is this affecting you?

Select all that apply.

□ [Impact 1]
□ [Impact 2]
□ [Impact 3]
□ [Impact 4]
□ [Impact 5]

[Continue]
```

**Content Source:**
`impact_options` array (5 universal options)
- Display each `impact_options[i].label`
- Store each `impact_options[i].id` when selected

**Implementation:**
- Multi-select checkboxes
- These selections are stored as `impacts` array
- Used later on Page 22 for personalized negative path using `for_negative_path` field

**Impact options:**
1. `avoiding_photos` → "Avoiding photos"
2. `less_confident` → "Less confident in social situations"
3. `avoiding_dating` → "Avoiding dating"
4. `constantly_thinking` → "Constantly thinking about it"
5. `affects_mood` → "Affects my mood daily"

---

## Phase 3: Pages 6-9 (Goal Setting, Timeline, Why Failed, Conditional)

### Page 6: Goal Setting
**Layout:**
```
[Question from JSON]

○ [Option 1]
○ [Option 2]
○ [Option 3]
○ [Option 4]

[Continue]
```

**Content Source:**
`problems[primaryProblem].goal_setting`
- `question` → Question text
- `options` → Array with `label` and `value`

**Implementation:**
- Single-select radio buttons
- Store selected `value` as `goalSetting` in state
- Note: Questions vary by problem - some ask "3 months", others "6 months"

---

### Page 7: Authority - Timeline Stats
**Layout:**
```
[Intro line]

Week [X]: [Description]
Week [Y]: [Description]
Week [Z]: [Description]
[Week [W]: [Description]]  ← Only for jawline/facial_hair

[Continue]
```

**Content Source:**
`problems[primaryProblem].timeline_stats[severityLevel]`
- `intro` → Opening line
- `milestones` → Array of week/description pairs

**Implementation:**
- Use `severityLevel` from Page 3 to select correct timeline variant
- Most problems have 3 milestones (acne, oily_skin, dry_skin, etc.)
- Jawline and facial_hair have 4 milestones
- Display each milestone: `Week [milestone.week]: [milestone.description]`

**Example:**
- If `primaryProblem === "acne"` and `severityLevel === "moderate"`:
  - Shows `timeline_stats.moderate` with weeks 1, 3, 6

---

### Page 8: Education - Why Other Things Failed
**Layout:**
```
[Title]

━━━━━━━━━━━━━━━━━━━━━━━━

[Explanation - multi-line]

Your routine needs:
• [Need 1]
• [Need 2]
• [Need 3]

[Continue]
```

**Content Source:**
`problems[primaryProblem].why_others_failed`
- `title` → Main heading
- `explanation` → Multi-line text (contains `\n` newlines)
- `your_routine_needs` → Array of bullet points

**Implementation:**
- Static informational page
- Respect newline characters in `explanation` field

---

### Page 9: Conditional Follow-Up Question
**Layout:**
```
Quick questions.

━━━━━━━━━━━━━━━━━━━━━━━━

[Question label]

○ Option 1
○ Option 2
○ Option 3
○ Option 4

[Continue]
```

**Complex Conditional Logic:**

**Show this page ONLY if:**

1. **For skincare skin type question:**
   - User selected at least one of: `acne`, `blackheads`, `skin_texture`, `hyperpigmentation`
   - AND user did NOT select `oily_skin` or `dry_skin`
   - Content: `followup_questions.skincare_skin_type`

2. **For dark circles cause:**
   - User selected `dark_circles` as ANY problem (not just primary)
   - Content: `followup_questions.dark_circles_cause`

**Skip this page if:**
- Primary problem is `jawline` or `facial_hair` (their severity question on Page 3 IS their follow-up)
- Skincare problems selected but user already selected `oily_skin` or `dry_skin` on Page 2

**Implementation:**
- Check `followup_questions[question_id].conditions` array
- Check `followup_questions[question_id].skip_if_selected` array (if present)
- Display appropriate question based on conditions met
- Store answer as `followupAnswer` or `skinType` depending on question
- If no conditions met, skip directly from Page 8 → Page 10

---

## Phase 4: Pages 10-14 (Time, Social Proof, Budget, Preview, Commitment)

### Page 10: Time Commitment
**Layout:**
```
Daily time available?

○ 10 min - Morning OR evening routine
○ 20 min - Both routines
○ 30+ min - Full protocol + exercises

[Continue]
```

**Implementation:**
- Single-select radio buttons
- Store selection as `timeCommitment` in state
- Fixed options (not from JSON)

---

### Page 11: Social Proof
**Layout:**
```
Real results from Protocol users.

━━━━━━━━━━━━━━━━━━━━━━━━

"Clearer skin in 3 weeks than 6 months
of random products."
- Marcus, 22

"Jawline actually changed. Thought
mewing was BS."
- Jake, 19

"Finally consistent. The routine just works."
- Dev, 21

[Continue]
```

**Implementation:**
- Static testimonial page
- Fixed content (from EXTENDED_ONBOARDING_BASELINE.md)
- No user input

---

### Page 12: Budget
**Layout:**
```
Product budget?

○ Low (~$30) - Basics that work
○ Medium (~$60) - Optimized ingredients
○ Flexible - Best available

[Continue]
```

**Conditional Display:**
- **Check:** `problems[primaryProblem].requires_products`
- **If `false`**: Skip this page entirely (e.g., jawline doesn't need products)
- **If `true`**: Show budget options

**Implementation:**
- Single-select radio buttons
- Store selection as `budget` in state
- If skipped, leave `budget` as `null`
- Navigate: Page 11 → Page 12 (if shown) → Page 13 OR Page 11 → Page 13 (if skipped)

---

### Page 13: Mini Timeline Preview
**Layout:**
```
Your timeline.

Based on: [Problem display name], [Additional problems if any]

━━━━━━━━━━━━━━━━━━━━━━━━

WEEK [X]
[Description]

WEEK [Y]
[Description]

WEEK [Z]
[Description]

━━━━━━━━━━━━━━━━━━━━━━━━

Results require consistency.

[Continue]
```

**Content Source:**
Reuse `problems[primaryProblem].timeline_stats[severityLevel].milestones`

**Implementation:**
- Display first 3 milestones (even if 4 exist for jawline/facial_hair)
- Format: "WEEK [week]" as header, description below
- Problem display names:
  - acne → "Acne"
  - jawline → "Jawline"
  - oily_skin → "Oily Skin"
  - etc. (capitalize and format for display)

---

### Page 14: Commitment Check
**Layout:**
```
This only works if you show up.

━━━━━━━━━━━━━━━━━━━━━━━━

Can you commit to:
• [X] min/day
• Morning and evening routine
• Weekly progress photos

○ Yes, I'm ready
○ I'll try my best
○ Not sure yet

[Continue]
```

**Dynamic Time Calculation:**
1. For each problem in `selectedProblems` array
2. Sum `problems[problem_id].routine_time_minutes`
3. Display total as "[X] min/day"

**Implementation:**
- Calculate total routine time dynamically
- Single-select radio buttons for commitment level
- Store selection as `commitment` in state

**Example:**
- User selected `acne` (12 min) + `jawline` (10 min) = "22 min/day"

---

## Phase 5: Pages 15-17 (Terminal, Overview, Shopping)

### Page 15: Terminal Animation Splitter
**Implementation:**
**Use existing terminal animation screen implementation.**

**Display sequence:**
```
Analyzing your data...
Fetching [problem] protocols...
Building custom routine...
Complete.
```

**Customization:**
- Auto-advance to Page 16 when animation completes, not to the old onboarding.

**Note:** This is already implemented in the app. Reference and integrate the existing component. No need to rebuild from scrtch.

---

### Page 16: Protocol Overview
**Layout:**
```
Your protocol is ready.

Based on: [Primary problem], [Additional if any]
Time: [Calculated time] min/day

Morning routine: [X] steps
Evening routine: [Y] steps
[Daily exercises: [Z] exercises]  ← Only if applicable

It only requires [Calculated time] minutes from you per day.

[Continue]
```

**Implementation:**
- Display `primaryProblem` and any additional problems from `selectedProblems`
- Show `budget` (or "N/A" if skipped)
- Show calculated total routine time from Page 14
- Step counts and exercises: Calculate based on selected problems
  - This requires understanding routine structure (reference `GUIDE_BLOCKS.json` if needed)
  - Jawline/facial_hair may include exercises
  - Skincare problems typically don't

**Note:** This is a summary preview page. Detailed routine shown on Page 19.

---

### Page 17: Shopping Screen
**Implementation:**
**Use existing shopping flow implementation.**

**Requirements:**
- Display ingredient cards based on selected problems and budget
- Each card has three options:
  - "I haave this" → Mark as owned
  - "Will get it" → Mark for purchase
  - "Skip" → Mark as skipped
- **Critical:** All existing logic for tracking selections must be preserved
- Store selections in `shoppingSelections` state

**Integration:**
- Pass `selectedProblems` and `budget` to shopping component
- Shopping component returns selections
- Navigate to Page 18 on completion

**Note:** This screen is already implemented. Reference and integrate the existing component. Ensure state management connects properly.

---

## Phase 6: Pages 18-21 (Confidence Building)

### Page 18: Reassurance After Shopping
**Layout:**
```
You just made the decision.

Most guys quit before they start.
You're already ahead.

[Personalized ending sentence]

[Continue]
```

**Content Source:**
`problems[primaryProblem].reassurance_ending`

**Implementation:**
- First two sentences are static (same for everyone)
- Third sentence pulls from JSON: `problems[primaryProblem].reassurance_ending`
- Examples:
  - Acne: "You will look back in 6 weeks, and see how much your acne has changed."
  - Jawline: "You will look back in 6 weeks, and see how much your jawline has changed."

---

### Page 19: What Your Day Looks Like
**Layout:**
```
Your daily protocol.

━━━━━━━━━━━━━━━━━━━━━━━━

[Time] AM - Morning routine
[X] steps, [Y] minutes

[Throughout day - Mewing reminders]  ← Only if jawline selected
[Builds jaw definition]

[Time] PM - Evening routine
[X] steps, [Y] minutes

━━━━━━━━━━━━━━━━━━━━━━━━

[Total] minutes total.
That's it.

[Continue]
```

**Implementation:**
- Calculate routine breakdown based on `selectedProblems`
- Morning/evening step counts: Based on products and routines for selected problems
- Times: Suggested times like "8:00 AM" and "9:00 PM" (can be static or customizable)
- **Conditional:** Show "Throughout day - Mewing reminders" ONLY if `jawline` is in `selectedProblems`
- Display calculated total time from Phase 4

**Reference:** May need to reference `GUIDE_BLOCKS.json` for routine structure per problem

---

### Page 20: Social Proof - Before/After Grid
**Layout:**
```
This will be you.

[Grid of 6 before/after images]

Week 0 → Week 6

[Continue]
```

**Implementation:**
- Display 6 placeholder before/after image slots in a grid (3 rows × 2 columns or 2 rows × 3 columns)
- Images can be generic transformations or sourced from assets
- Label: "Week 0 → Week 6" below grid
- Static page, no personalization needed here

**Note:** This is separate from Page 24 WOW moment. This page shows multiple generic transformations.

---

### Page 21: The Data
**Layout:**
```
[Personalized stat 1]

[Personalized stat 2]

Source: 12,847 active users that answered

[Continue]
```

**Content Source:**
`problems[primaryProblem].data_stat`

**Implementation:**
- First stat: Pull from `problems[primaryProblem].data_stat`
- Second stat: Fixed - "92% say it's easier than expected to stay consistent."
- Source line is fixed text

**Examples:**
- Acne: "78% of users see visible skin improvements by week 6."
- Jawline: "73% of users report visible jaw changes by week 8."

---

## Phase 7: Pages 22-24 (Negative Path, Authority, WOW Moment)

### Page 22: Negative Path
**Layout:**
```
6 months from now.

Without Protocol:
[Consequence 1]
[Consequence 2]
[Consequence 3]
[User impact sentence 1]
[User impact sentence 2]

With Protocol:
[Positive 1]
[Positive 2]
[Positive 3]

[Continue]
```

**Content Source:**
1. `problems[primaryProblem].negative_consequences.without_protocol` (array)
2. `problems[primaryProblem].negative_consequences.with_protocol` (array)
3. User's `impacts` from Page 5 → convert using `impact_options[id].for_negative_path`

**Implementation:**
- "Without Protocol" section:
  - Display all items from `negative_consequences.without_protocol`
  - For each impact ID in user's `impacts` array:
    - Find matching `impact_options[i]` where `id` matches
    - Append `for_negative_path` text to "Without Protocol" list
- "With Protocol" section:
  - Display all items from `negative_consequences.with_protocol`

**Example:**
User selected impacts: `["avoiding_photos", "affects_mood"]`
- Add "Still avoiding photos" to Without Protocol
- Add "Still letting it control your mood" to Without Protocol

---

### Page 23: Authority - Why This Works
**Layout:**
```
Why Protocol works when others fail:

✓ Personalized to YOUR concerns
✓ Right ingredients, right order
✓ Built-in accountability
✓ Weekly progress proof

Not generic advice.
Built for you.

[Continue]
```

**Implementation:**
- Static page with fixed content
- No personalization needed
- Use checkmark symbol (✓) or equivalent

---

### Page 24: WOW Moment - Personalized Match
**Complex matching logic with fallback.**

### Layout Option 1 (Match Found):
```
[Before photo]  |  [After photo]

This is [Name], [Age].

"[Quote]"

[Name] struggled with:
• [Problem display name]
• [Impact 1]
• [Impact 2]

Just like you.

Week 0 → Week [X]

[Continue]
```

### Layout Option 2 (No Match - Fallback Grid):
```
Real transformations.

━━━━━━━━━━━━━━━━━━━━━━━━

[Ethan - Acne]     [Saeid - Jawline]    [Alex - Beard]
Before → After     Before → After       Before → After
Week 10            Week 32              Week 44

━━━━━━━━━━━━━━━━━━━━━━━━

Protocol works.

[Continue]
```

**Matching Algorithm:**

1. **Try to match:** Find a user in `wow_users` array where:
   - `wow_users[i].problems` array contains `primaryProblem`

2. **If match found:**
   - Display before/after photos (images are 500×700 vertical format)
   - Show personalized template with user's name, age, quote
   - List user's problem(s) and impacts
   - Show timeline: "Week 0 → Week [weeks_elapsed]"

3. **If NO match found** (user selected oily_skin, dry_skin, blackheads, dark_circles, skin_texture, or hyperpigmentation):
   - Display all 3 WOW users in a horizontal grid
   - Each shows: Before/After images (500×700), name with problem label, week timeline
   - Fixed layout showing Ethan (Week 10), Saeid (Week 32), Alex (Week 44)

**WOW Users:**
- `ethan_22_acne`: Matches acne
- `saeid_19_jawline`: Matches jawline
- `alex_20_facial_hair`: Matches facial_hair

**Image Asset Names:**
- `ethan_acne_before.jpg` / `ethan_acne_after.jpg`
- `saeid_jawline_before.jpg` / `saeid_jawline_after.jpg`
- `alex_beard_before.jpg` / `alex_beard_after.jpg`

**Image Specs:** All images are 500×700 pixels (vertical/portrait orientation)

**Implementation Notes:**
- For matched view: Display images side-by-side with divider
- For grid view: Display three columns with before/after stacked vertically per user
- Adapt layout for mobile (may need to stack grid items)

---

## Phase 8: Pages 25-27 (Paywall Sequence)

### Page 25: Paywall 1 - Trial Offer
**Layout:**
```
[Themed colored section with logo]
[Curved divider]

Start your 3-day free trial.

No payment due now.

After 3 days: $4.99/month or $29.99/year

[Start Free Trial]
```

**Implementation:**
- Primary CTA button: "Start Free Trial"
- Clicking navigates to Page 26
- Visual design: Themed colored section (use brand color if defined) with logo, curved divider transitioning to main content

---

### Page 26: Paywall 2 - Reminder
**Layout:**
```
[Themed colored section with bell emoji]
[Curved divider]

We'll remind you 1 day before
your trial ends.

No payment due now.

[Continue for FREE]
```

**Implementation:**
- Use bell emoji (🔔) or icon
- CTA button: "Continue for FREE"
- Same visual style as Page 25
- Clicking navigates to Page 27

**Note:** Despite style guide saying no emojis, this specific page uses bell emoji as specified in baseline doc

---

### Page 27: Paywall 3 - How It Works (Final)
**Layout:**
```
[X button to dismiss - top right]
[Themed colored section]
[Curved divider]

How it works:

🔒 Today: Begin 3-day trial
🔔 Day 2: Reminder notification
⭐ Day 3: Continue or cancel

[Purchase - $4.99/month or $29.99/year]

[Restore] | [Terms] | [Privacy]
```

**Implementation:**
- X button in top-right allows dismissal/skip
- Emojis specified: 🔒 🔔 ⭐ (use these specific ones)
- Primary CTA: "Purchase" button with pricing options
- Footer links: Restore Purchases | Terms of Service | Privacy Policy
- Visual style consistent with previous paywall pages

**On Purchase:**
- Integrate with app's payment system (RevenueCat, StoreKit, etc.)
- Handle subscription initialization
- Navigate to main app after successful purchase

**On Dismiss (X button):**
- May need to handle "try app without subscribing" flow or loop back to paywall
- Define behavior based on business logic

---

## Implementation Checklist

After completing all phases, verify:

- [ ] State management properly tracks all user selections
- [ ] Primary problem calculation works correctly (priority system)
- [ ] All personalization pulls correct content from JSON based on `primaryProblem`
- [ ] Severity-based timeline stats display correctly
- [ ] Page 9 conditional logic properly shows/skips based on selections
- [ ] Page 12 budget page properly skips for non-product problems
- [ ] Routine time calculation sums correctly across all selected problems
- [ ] Terminal animation (Page 15) integrates existing component
- [ ] Shopping flow (Page 17) integrates existing component and preserves logic
- [ ] Page 22 combines problem-specific consequences with user's impact selections
- [ ] Page 24 WOW matching logic works with proper fallback to grid
- [ ] WOW images display correctly at 500×700 vertical dimensions
- [ ] All images load from correct asset paths
- [ ] Paywall sequence (Pages 25-27) connects to payment system
- [ ] Navigation flows correctly with conditional skips
- [ ] Style guide (STYLE_GUIDE.md) voice and visual design applied throughout
- [ ] No emojis used except where explicitly specified (Pages 26-27)
- [ ] All copy follows stoic, direct tone from style guide

---

## JSON Reference Quick Guide

**Problem-specific content:**
```
problems[primaryProblem].priority
problems[primaryProblem].requires_products
problems[primaryProblem].routine_time_minutes
problems[primaryProblem].severity_question
problems[primaryProblem].education_real_cause
problems[primaryProblem].goal_setting
problems[primaryProblem].timeline_stats[severityLevel]
problems[primaryProblem].why_others_failed
problems[primaryProblem].reassurance_ending
problems[primaryProblem].negative_consequences
problems[primaryProblem].data_stat
```

**Universal content:**
```
followup_questions.skincare_skin_type
followup_questions.dark_circles_cause
impact_options[i].{id, label, for_negative_path}
wow_users[i].{name, age, quote, problems, impacts, before_photo, after_photo, weeks_elapsed}
```

**Problem IDs:**
`acne`, `jawline`, `facial_hair`, `oily_skin`, `dry_skin`, `blackheads`, `dark_circles`, `skin_texture`, `hyperpigmentation`

**Priorities (1=highest):**
1. acne
2. jawline
3. facial_hair
4. oily_skin
5. dry_skin
6. blackheads
7. dark_circles
8. skin_texture
9. hyperpigmentation

---

*Build each phase sequentially. Test thoroughly before moving to next phase. Reference EXTENDED_ONBOARDING_BASELINE.md for detailed page specs and STYLE_GUIDE.md for voice/visual consistency.*
