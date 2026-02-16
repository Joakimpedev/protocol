# Protocol App - Current Onboarding Documentation

## Overview
Protocol uses a **27-screen personalized onboarding flow** with a terminal/hacker aesthetic. The flow is designed to personalize the user's skincare/looksmaxxing routine, educate them, build commitment, and convert to a paid subscription.

---

## Visual Design System

### Color Palette
| Element | Color | Hex |
|---------|-------|-----|
| Background | Near-black | `#0a0a0a` |
| Surface/Cards | Dark gray | `#141414` |
| Primary Text | Off-white | `#e5e5e5` |
| Secondary Text | Muted gray | `#a0a0a0` |
| Muted Text | Dark gray | `#666666` |
| Accent | Bright green | `#00ff00` |
| Accent Secondary | Dark green | `#00cc00` |
| Borders | Subtle gray | `#2a2a2a` |

### Typography
- **Headings**: Menlo (iOS) / monospace (Android), 24px, semibold
- **Body**: System font, 16px, regular
- **Terminal feel** throughout with monospace fonts

### UI Elements
- Radio buttons: `●` (filled) / `○` (empty)
- Checkboxes: `■` (filled) / `□` (empty)
- Dividers: Monospace `━━━━━━━━━━━━━━━━━━━━━━━━`
- Progress bar: Green fill with spring animation

### Animation Patterns
1. **Matrix Effect** - Random characters reveal true text (Welcome)
2. **Typewriter** - Character-by-character text reveal (30-100ms)
3. **Fade-in** - 400-600ms opacity transitions
4. **Stagger** - Cards delayed 200-450ms per item
5. **Spring** - Progress bar with tension 50, friction 8
6. **Hold interaction** - 1.5s hold-to-commit fill animation

---

## Screen-by-Screen Flow

### Phase 1: Problem Discovery (Screens 0-2)

**Screen 0 - WelcomeScreen**
- Matrix-style animated heading: "Welcome to Protocol"
- Typewriter prompt: "What are you looking to improve?"
- Monospace TextInput with blinking cursor
- CTA: "Continue"

**Screen 1 - CategoryScreen**
- "Select all that apply" heading
- 9 checkboxes: Acne, Jawline, Facial Hair, Oily Skin, Dry Skin, Blackheads, Dark Circles, Skin Texture, Hyperpigmentation
- Note: "Oily + Dry = Combination skin type"

**Screen 2 - SeverityScreen**
- Problem-specific question (e.g., "How bad is your acne right now?")
- 3-4 radio options (Mild, Moderate, Severe)

### Phase 2: Education & Motivation (Screens 3-8)

**Screen 3 - EducationRealCauseScreen**
- "Most [problem] isn't random."
- Stat: "89% of cases are caused by:"
- 3 bullet points of real causes
- Closing: "All fixable with the right routine."

**Screen 4 - ImpactScreen**
- "How is this affecting you?" + "Select all that apply"
- 5 options: Avoiding photos, Less confident in social situations, Avoiding dating, Constantly thinking about it, Affects my mood daily

**Screen 5 - GoalSettingScreen**
- "Where do you believe you can be in 3 months?"
- Slider (6-26 weeks) with animated label
- 4 radio options (problem-specific goals)

**Screen 6 - TimelineStatsScreen**
- Typewriter title reveal
- Milestone cards (Week 1, 3, 6, 20) with staggered fade-in
- Color gradient: light green → bright green
- Problem/severity-specific timeline content

**Screen 7 - SocialProofScreen**
- "Real transformations with Protocol"
- 3 before/after testimonial cards (slide-in animation)
- Markus (dry skin), Dev (jawline), Jake (acne)

**Screen 8 - WhyOthersFailedScreen**
- Critiques generic solutions
- Positions Protocol as the right approach

### Phase 3: Personalization (Screens 9-12)

**Screen 9 - ConditionalFollowUpScreen**
- Conditional: Skipped for jawline/facial_hair
- Shows skin type Q for acne/blackheads/texture/hyperpigmentation
- Shows dark circles cause Q for dark_circles

**Screen 10 - TimeCommitmentScreen**
- Daily time: 10 min, 20 min, 30 min (radio)
- Budget: low, medium, flexible (radio)

**Screen 11 - MiniTimelinePreviewScreen**
- Quick timeline preview

**Screen 12 - ProtocolLoadingScreen**
- Typing animation sequence:
  1. "Building your protocol..."
  2. "> Fetching [problem] data" (per problem)
  3. "Matching ingredients..."
  4. "Planning optimal routine..."
  5. "Complete." (success haptic, auto-navigates)

### Phase 4: Protocol Reveal (Screens 13-17)

**Screen 13 - ProtocolOverviewScreen**
- Generated routine preview
- Ingredients with order and timing
- Exercises list

**Screen 14 - ReassuranceBeforeShoppingScreen**
- Confidence building before product selection

**Screen 15 - ProductsPrimerScreen**
- Product education

**Screen 16 - ShoppingScreen**
- Card-based ingredient/product browser
- States: Pending, Active (owned), Skipped
- Option to enter brand name or skip
- Skipped if primary problem doesn't need products (e.g., jawline)

**Screen 17 - WhyThisWorksScreen**
- Protocol vs typical approach comparison

### Phase 5: Commitment & Conversion (Screens 18-22)

**Screen 18 - WOWMomentScreen**
- Success highlights and key stats

**Screen 19 - CommitmentScreen**
- "Ready to lock in?"
- "78% of users see visible improvements by week 6."
- "This is your promise to yourself."
- **Hold Button**: Press and hold 1.5s → fills width → "Committed ✓"
- Haptic feedback on press (light) and completion (success)

**Screen 20 - TrialOfferScreen**
- Trial offer presentation

**Screen 21 - TrialReminderScreen**
- Next steps reminder

**Screen 22 - TrialPaywallScreen**
- "How your free trial works"
- 3 numbered steps (Day 1, Day 2, Day 3)
- CTA: "Start Protocol - $3.99/week" OR "Start 7-Day Trial" (referral)
- Referral system: Invite friend → both get free trial
- Footer: Restore Purchases, Terms, Privacy

---

## Progress Bar Behavior
- Shown on screens 0-19 only (first 20 screens)
- **Non-linear mapping** for psychological momentum:
  - First 60% of screens (0-11) → 70% of progress bar
  - Last 40% of screens (12-19) → 30% of progress bar
- Creates feeling of fast early progress

---

## Data Collected During Onboarding
| Data | Source Screen | Type |
|------|-------------|------|
| Selected problems | CategoryScreen | Multi-select (9 options) |
| Primary problem | Auto-calculated | Priority-based |
| Severity level | SeverityScreen | Single-select |
| Life impacts | ImpactScreen | Multi-select (5 options) |
| Goal/timeline | GoalSettingScreen | Slider + radio |
| Skin type | ConditionalFollowUp | Single-select |
| Time commitment | TimeCommitmentScreen | Radio (10/20/30 min) |
| Budget | TimeCommitmentScreen | Radio (low/med/flexible) |
| Product selections | ShoppingScreen | Per-ingredient state |
| Referral code | TrialPaywallScreen | Text input |

---

## Monetization
- **Primary**: $3.99/week subscription
- **Referral system**: Invite friend → both get 7-day free trial when friend starts
- **Paywall placement**: Screen 22 (near end, after commitment)

---

## Technical Notes
- Built with React Native + Expo
- State managed via OnboardingContext (React Context)
- Progress persisted to AsyncStorage for resume
- Anonymous user created at CommitmentScreen
- Analytics via PostHog
- Content driven by `onboarding_content.json`
- Conditional screen skipping based on selections

---

## Key Psychological Techniques
1. **Non-linear progress bar** - Fast early progress builds momentum
2. **Hold-to-commit gesture** - Physical commitment increases conversion
3. **Social proof** - Before/after transformations
4. **Education** - Explaining real causes builds trust
5. **Impact acknowledgment** - Validating emotional pain points
6. **Loading animation** - Creates perception of personalized computation
7. **Referral incentive** - Viral growth through free trial sharing
