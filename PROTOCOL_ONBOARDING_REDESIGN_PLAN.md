# Protocol Onboarding Redesign Plan
## Comprehensive Competitor Analysis & Strategic Recommendations

---

# PART 1: COMPETITOR REVENUE & PERFORMANCE ANALYSIS

## Revenue Leaderboard

| App | Downloads/mo | Revenue/mo | Rev/Download | Reviews | Pricing |
|-----|-------------|------------|-------------|---------|---------|
| **Umax** | 100,000 | **$200,000** | **$2.00** | 49,000 | 59 NOK/week (~$5.50/wk) |
| **LooksMax Rating AI** | **200,000** | $100,000 | $0.50 | 30,500 | 399 NOK/year (~$37.50/yr) |
| **Glow Up Maxxing** | 30,000 | $50,000 | **$1.67** | 1,973 | 599 NOK/year (~$58/yr) |
| **LooksMax AI** | 50,000 | $40,000 | $0.80 | 41,300 | 49 NOK/week (~$4.50/wk) |
| Moggr | 5,000 | $7,000 | $1.40 | 4,151 | N/A |

### Key Revenue Insights

1. **Umax is the clear revenue king** at $200K/mo with the highest revenue-per-download ($2.00). Their dual monetization (pay OR invite 3 friends) + curiosity gap paywall is the most effective model.

2. **LooksMax Rating AI has the most downloads** (200K/mo) but lower conversion ($0.50/download). Their 14-screen aggressive funnel drives volume but the yearly pricing at $37.50 limits per-user revenue.

3. **Glow Up Maxxing punches above its weight** - only 30K downloads but $50K revenue = $1.67/download. Their 23-screen emotional investment funnel converts well despite being the longest. Their yearly pricing at $58 is the highest.

4. **Weekly pricing wins on revenue** - Umax ($5.50/wk) and LooksMax AI ($4.50/wk) both use weekly billing. Umax's weekly pricing drives their $200K revenue dominance.

5. **Top countries are the same** - US, UK, and either Canada or Mexico for all apps. The market is primarily English-speaking young males.

---

# PART 2: WHAT THE TOP COMPETITORS ARE DOING DIFFERENTLY FROM PROTOCOL

## Critical Differences

### 1. Protocol's Terminal Aesthetic vs. Competitors' Premium Dark Mode

**Protocol:** Monospace fonts (Menlo), matrix effects, green-on-black terminal theme, `━━━━━━` dividers, `■`/`□` checkboxes
**All Competitors:** Premium dark mode with gradient accents (purple, orange, coral), glassmorphism cards, bold modern sans-serif fonts, high-quality model photography

**Verdict:** Protocol's terminal aesthetic is unique and memorable, BUT every top-revenue app uses a premium dark mode with vibrant gradient accents. The terminal look may feel "techy" rather than "aspirational" - and aspirational is what drives conversions in this market.

### 2. Protocol Shows Too Much Before Paywall

**Protocol:** 22 screens before paywall, including full routine reveal, ingredient selection, product shopping, and exercise browsing. Users get substantial value before ever paying.
**Competitors:** Results are ALWAYS gated behind the paywall. Users never see their actual analysis until they pay. The curiosity gap is the conversion engine.

**This is the single biggest difference.** Protocol gives away the value. Competitors create an irresistible curiosity gap.

### 3. Photo-First vs. Question-First

**Protocol:** Starts with text input ("What are you looking to improve?") → category selection → severity questions. No photo until much later (if at all during onboarding).
**Competitors:** Photo/selfie is central. The entire promise is "take a selfie → get your analysis." The face scan is the core value proposition.

**Protocol lacks the "take a selfie and find out" hook** that drives all competitors.

### 4. No Aspirational Imagery

**Protocol:** Text-heavy, no model photos, no before/after imagery, no aspirational visuals
**All Competitors:** Extensive use of attractive male model photography, before/after comparisons, aspirational imagery throughout

**Aspirational imagery is a universal pattern** across ALL successful competitors. It's not optional.

### 5. Missing Social/Viral Mechanics in Onboarding

**Protocol:** Referral system exists but is tucked into the paywall screen as a secondary option
**Umax:** Dedicated referral entry screen + "invite 3 friends to unlock" as primary alternative to paying
**LooksMax Rating AI:** Fake TikTok comment thread + leaderboard + friend competition
**LooksMax AI:** Invite code screen with exclusivity framing
**Glow Up Maxxing:** Dating goals, social comparison, friend competition framing

**Protocol's viral loop is an afterthought.** Competitors make it a core part of the experience.

### 6. No App Store Rating Capture

**Protocol:** No rating request during onboarding
**All Competitors:** Request App Store rating early in onboarding, before any potential disappointment

**This is free ASO value** that Protocol is leaving on the table.

### 7. No Notification Pre-Permission Priming

**Protocol:** No dedicated notification permission screen
**All Competitors:** Custom-designed notification permission screens with value framing before triggering the system dialog

### 8. Protocol's Onboarding Is Problem-Focused, Not Aspiration-Focused

**Protocol:** "What are you looking to improve?" → Severity → Impact → "How is this affecting you?"
**Competitors:** "Become a Chad" → "Level Up" → "Reach your full potential" → "Create a new version of yourself"

**Protocol leads with pain. Competitors lead with aspiration.** The pain points come later, after the hook.

### 9. Scoring/Gamification is Absent

**Protocol:** No numerical scores, no percentiles, no ratings
**All Competitors:** X/10 scores, percentile rankings, bell curves, "Top 4%", leaderboards, color-coded ratings

**Gamification drives engagement and shareability.** People share their scores on social media, driving organic growth.

### 10. Protocol's Paywall Is Weak

**Protocol:** "Start Protocol - $3.99/week" at the end, with referral as secondary
**Umax:** Blurred results + "LEVEL UP" + dual path (pay or invite 3)
**LooksMax Rating AI:** "You are ?/10" + anchored pricing + 93% savings badge + results-gated
**Glow Up Maxxing:** Journey roadmap + 94% anchor + after 22 screens of emotional investment

**Protocol's paywall doesn't leverage curiosity, anchoring, or sunk cost** nearly as effectively.

---

# PART 3: UNIVERSAL PATTERNS ACROSS ALL SUCCESSFUL COMPETITORS

These patterns appear in EVERY successful competitor and should be considered mandatory:

1. **Dark mode with vibrant gradient accents** (purple, orange, coral)
2. **Results-gated paywall** - Never show actual results before payment
3. **Face scan / selfie as core hook** - "Take a selfie, get your analysis"
4. **Aspirational male model photography** throughout
5. **Numerical scoring system** (X/10, percentiles, color-coded)
6. **App Store rating request** during onboarding
7. **Notification permission** with custom pre-permission screen
8. **Referral/invite code system** integrated into onboarding flow
9. **Social proof** - download counts, user counts, transformation stats
10. **Weekly pricing display** (even if yearly is the steered option)
11. **Price anchoring** - Show expensive weekly price to make yearly seem like a steal
12. **"Cancel anytime"** reassurance on paywall
13. **Loading/analysis animation** that builds anticipation
14. **One action per screen** - never overwhelming

---

# PART 4: THE REDESIGN PLAN

## New Design Direction: Premium Dark Mode with Gradient Accents

### Abandon Terminal Aesthetic
The terminal/hacker theme should be replaced with the premium dark mode style that dominates the market:

- **Background:** Pure black (#000000) or near-black (#0A0A0A)
- **Primary accent:** Bold gradient (e.g., purple-to-coral or orange gradient)
- **Cards:** Glassmorphism (semi-transparent with blur) or dark charcoal (#1C1C1E)
- **Typography:** Bold modern sans-serif (SF Pro Display or similar), NOT monospace
- **Progress indicators:** Segmented or smooth gradient bar
- **CTAs:** Full-width gradient buttons, bold and vibrant

### Why This Change Is Necessary
Every competitor making $40K-$200K/month uses this exact style. The terminal aesthetic, while unique, doesn't trigger the aspirational feelings that drive conversions in the looksmaxxing market. Users need to feel like they're entering a premium, aspirational space - not a hacker terminal.

---

## New Onboarding Flow: 15-18 Screens

### Phase 1: Hook & Aspire (Screens 1-4)

**Screen 1 - Hero / Value Proposition**
- Headline: "Unlock Your Best Face" or "Your Glow Up Starts Now"
- Subheadline: "AI-powered facial analysis + personalized routines"
- Visual: Attractive male model with subtle face-scanning overlay (dots, symmetry lines)
- CTA: "Get Started" (gradient button)
- Design: Full-bleed aspirational photo, dark overlay, bold headline

**Screen 2 - Feature Preview: Rating System** *(NEW)*
- Headline: "Take a selfie and get your results"
- Visual: Sample profile photo → arrow → rating cards showing:
  - Skin Quality: 8/10 "Top 12%" HIGH (green)
  - Jawline: 5/10 "Average" MID (yellow)
  - Symmetry: 7/10 "Top 25%" (green)
- CTA: "Continue"
- Psychology: Show-don't-tell. Mixed scores create curiosity. Gamification hooks immediately.

**Screen 3 - Feature Preview: Personalized Plan** *(NEW)*
- Headline: "Your personalized protocol"
- Visual: Sample daily routine card (Morning Skincare, Jawline Exercises, Evening Routine)
- Attractiveness score: "68%" with upward arrow to "projected: 82%"
- CTA: "Continue"
- Psychology: Concrete value preview, transformation promise with numbers

**Screen 4 - Social Proof + App Store Rating** *(NEW)*
- Headline: "Trusted by [X] people"
- Badge: Laurel wreath with app positioning
- CTA: "Leave a Review" → triggers iOS rating dialog
- Psychology: Capture rating while excitement is high, before any friction

### Phase 2: Quick Personalization (Screens 5-8)

**Screen 5 - Selfie Upload** *(MOVED UP)*
- Headline: "Upload your selfie"
- Subheadline: "To get your personalized analysis"
- Visual: Photo frame with scanning aesthetic
- Options: "Take a selfie" / "Upload from library"
- Psychology: Photo commitment EARLY, before questions. This is the core hook.

**Screen 6 - Gender Selection**
- Headline: "Who should we analyze for?"
- Options: Male / Female / Non-Binary
- Clean card-based selection, gradient accent
- Psychology: Personalization signal, early commitment

**Screen 7 - Primary Concerns** (simplified from Protocol's current flow)
- Headline: "What are you looking to improve?"
- Multi-select cards with icons: Acne/Skin, Jawline, Hair/Hairline, Dark Circles, Body, Style
- Psychology: Covers Protocol's current categories but with visual icons instead of text checkboxes

**Screen 8 - Self-Rating Slider** *(NEW - from Glow Up Maxxing)*
- Headline: "How would you honestly rate your attractiveness?"
- Slider: Low → High (defaults slightly below center)
- Psychology: Confessional framing encourages lower rating, increases motivation

### Phase 3: Emotional Deepening (Screens 9-12)

**Screen 9 - Impact Assessment** (simplified from current)
- Headline: "How is this affecting your life?"
- Multi-select: Confidence, Dating, Social situations, Photos, Mood
- Psychology: Articulating pain points deepens commitment

**Screen 10 - Social Proof / Stats** *(NEW - inspired by Glow Up Maxxing)*
- Headline: "We get it."
- Large stat: "87% of users see visible improvements by week 6"
- Footnote: Based on [X] users
- Design: **FULL GRADIENT BACKGROUND** - visual break from dark screens
- Psychology: Empathetic validation + proof after vulnerable questions

**Screen 11 - Before/After Transformation** *(NEW)*
- Split screen: Before Protocol (red/negative) vs After Protocol (green/positive)
- Before: Insecure, inconsistent routine, guessing products, no progress
- After: Clear skin, defined jawline, confident, consistent routine
- Visual: Two contrasting model photos or before/after real results
- Psychology: Mirrors user's admitted pain points, aspirational transformation

**Screen 12 - Referral Code Entry** *(MOVED UP and redesigned)*
- Headline: "Got an invite code?"
- Social proof: Show friends/community activity
- Input: Code entry field
- CTA: "Enter Code" / "Skip"
- Psychology: Viral loop entry, exclusivity framing

### Phase 4: Analysis & Paywall (Screens 13-15)

**Screen 13 - Notification Permission** *(NEW)*
- Headline: "Stay on track"
- Body: "Get daily routine reminders and progress updates"
- Mockup: Sample notification showing streak/reminder
- CTA: "Enable Notifications" / "Maybe Later"
- Psychology: Value-framed pre-permission, then trigger system dialog

**Screen 14 - Analysis Loading** *(REDESIGNED)*
- Headline: "Analyzing your face..."
- Visual: Scanning animation with progress steps:
  - "Detecting facial landmarks..."
  - "Analyzing skin quality..."
  - "Measuring symmetry..."
  - "Building your protocol..."
  - "Complete."
- Psychology: Labor illusion = perceived value. Builds anticipation. Auto-navigates on complete.

**Screen 15 - PAYWALL** *(COMPLETELY REDESIGNED)*

**Option A: Curiosity Gap Paywall (Umax-style)**
- Visual: BLURRED analysis results (user's actual scores hidden behind blur)
- Headline: "Your results are ready"
- Subheadline: "You scored ?/10 - Unlock to see your full analysis"
- Sample visible elements: Category names visible, scores blurred
- Dual CTA:
  - Primary: "Unlock Results" (gradient button)
  - Secondary: "Invite 3 Friends to Unlock Free"
- Pricing: Show weekly price as anchor, yearly as savings
  - "Weekly: $5.99/week"
  - "Yearly: $2.30/week (Save 62%)" ← highlighted, pre-selected
- Footer: Cancel anytime, Terms, Privacy, Restore

**Option B: Feature-Stacked Paywall (LooksMax Rating AI-style)**
- Journey roadmap at top: Analysis → Routine → Products → Progress → Results
- Feature list with icons:
  - Detailed Face Analysis (39 traits)
  - Personalized Daily Routine
  - Product Recommendations
  - Progress Tracking
  - "You are ?/10"
- Social proof badge: "#1 Skincare Protocol App"
- Same pricing structure as Option A

**Recommendation: Use Option A.** The blurred results / curiosity gap is the single most powerful conversion technique across ALL competitors. Umax makes $200K/month primarily on this mechanic.

---

## Optional Additional Screens

**Screen 16 - Invite Friends (if they dismiss paywall)**
- Show referral code with share/copy functionality
- "Invite 3 friends to unlock your results for free"
- Viral growth alternative for non-converting users

**Screen 17 - Growth Projection (before paywall, optional)**
- Chart showing projected improvement over 3 months
- "Small steps, big changes"
- Reinforces ROI right before asking for money

---

## Summary of Flow Changes

| Current Protocol | New Protocol |
|-----------------|-------------|
| 27 screens | 15-18 screens |
| Terminal/hacker aesthetic | Premium dark + gradient |
| Text-only, no photos | Aspirational model photography |
| No face scan hook | Selfie upload at screen 5 |
| No scoring system | X/10 ratings, percentiles |
| Full routine revealed free | Results gated behind paywall |
| Referral buried in paywall | Referral code entry screen + invite flow |
| No App Store rating | Rating at screen 4 |
| No notification priming | Dedicated notification screen |
| Monospace fonts | Modern sans-serif |
| Green-on-black only | Vibrant gradient accents |
| Problem-first framing | Aspiration-first, then problems |
| $3.99/week flat | Anchored weekly + discounted yearly |

---

# PART 5: IMPLEMENTATION PRIORITIES

## Must-Have Changes (Revenue Impact: HIGH)

1. **Results-gated paywall with blurred scores** - This is the #1 revenue driver across all competitors. Protocol currently gives away its value for free.

2. **Face scanning / rating system** - Add numerical scoring (X/10) for facial traits. This is the core product hook that ALL competitors use. Without it, Protocol lacks the curiosity trigger.

3. **Selfie upload early in flow** - Move photo capture to screen 5 (before questions). The selfie is the investment that makes the paywall work.

4. **Redesigned visual style** - Replace terminal aesthetic with premium dark mode + gradient accents. This matches proven market expectations.

5. **Price anchoring** - Show expensive weekly price alongside discounted yearly to steer annual subscriptions and increase LTV.

## Should-Have Changes (Revenue Impact: MEDIUM)

6. **Aspirational model photography** - Add high-quality male model photos throughout onboarding
7. **App Store rating request** - Screen 4, before any friction
8. **Viral invite mechanic** - "Invite 3 friends to unlock free" as paywall alternative
9. **Social proof stats** - "X users", "Y% see results in Z days"
10. **Loading/analysis animation** - Build anticipation and perceived value

## Nice-to-Have Changes (Revenue Impact: LOW-MEDIUM)

11. **Notification pre-permission** - Custom screen before system dialog
12. **Before/after comparison screen** - Transformation visualization
13. **Self-rating slider** - Deepens emotional engagement
14. **Growth projection chart** - Visual ROI before paywall
15. **Dating/social questions** - Expand scope beyond skincare

---

# PART 6: REVENUE PROJECTION

### Current State
Protocol's current onboarding gives away substantial value before the paywall, uses a niche terminal aesthetic, and lacks the core engagement mechanics (scoring, curiosity gap, aspirational imagery) that drive competitor revenue.

### Expected Impact of Redesign

Based on competitor benchmarks:
- **Umax model** (curiosity gap + dual monetization): $2.00 revenue per download
- **Glow Up Maxxing model** (deep emotional investment): $1.67 revenue per download
- **LooksMax AI model** (efficient 7-screen): $0.80 revenue per download

If Protocol can achieve even the lowest competitor benchmark ($0.80/download) through these changes, and maintain or grow its download volume, the revenue impact would be significant. The blurred-results paywall alone (Umax's primary mechanic) could potentially 2-4x conversion rates based on industry benchmarks for curiosity-gap vs. feature-gate paywalls.

---

# PART 7: WHAT TO KEEP FROM CURRENT PROTOCOL

Not everything should change. Protocol has some strengths:

1. **Problem personalization** - The depth of problem-specific content (acne, jawline, etc.) is MORE detailed than any competitor. Keep this, but gate the results.

2. **Hold-to-commit gesture** - The 1.5s hold button is unique and psychologically powerful. Consider keeping it before the paywall.

3. **Referral system infrastructure** - Already built. Just needs better onboarding integration and the "invite 3 friends to unlock" mechanic.

4. **Content depth** - `onboarding_content.json` has rich problem-specific data. This becomes even more valuable when results are gated (the analysis LOOKS more thorough).

5. **Progress persistence** - AsyncStorage resume is good UX. Keep it.

6. **Loading animation concept** - The typing/building animation is good. Just restyle it from terminal to modern scanning aesthetic.

---

# APPENDIX: Files Created During This Analysis

| File | Description |
|------|-------------|
| `current_protocol_onboarding.md` | Detailed documentation of Protocol's current 27-screen onboarding |
| `analysis_umax.md` | Umax onboarding analysis (7 screens, $200K/mo revenue leader) |
| `analysis_looksmax_ai.md` | LooksMax AI analysis (7 screens, efficient flow) |
| `analysis_looksmax_rating_ai.md` | LooksMax Rating AI analysis (14 screens, most downloads) |
| `analysis_glow_up_maxxing.md` | Glow Up Maxxing analysis (23 screens, highest rev/download) |
| `PROTOCOL_ONBOARDING_REDESIGN_PLAN.md` | This document |
