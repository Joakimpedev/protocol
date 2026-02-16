# Umax - Onboarding Flow Analysis

## App Overview
**App Name:** Umax - Become Hot
**Downloads/month:** 100,000
**Revenue/month:** $200,000
**Reviews:** 49,000
**Top Countries:** US, UK, Canada
**Pricing:** 59 NOK/week (~$5.50 USD/week)

---

## Screen-by-Screen Breakdown

### Screen 1: Gender Selection (IMG_6548.PNG)
- **Headline:** "Choose gender"
- **Options:** "Male", "Female" (large pill-shaped gradient buttons)
- **Bottom link:** "skip"
- **Design:** Pure black background, purple-to-magenta gradient buttons with neon glass-morphism glow, 5-segment progress bar (segment 1 active)
- **Psychology:** Minimal friction (binary choice), skip option visually deprioritized

### Screen 2: Social Proof + App Store Rating (IMG_6549.PNG)
- **Headline:** "Trusted by 1,000,000+ people"
- **iOS native App Store rating dialog** overlaid
- **Button:** "Continue"
- **Design:** Progress bar segment 2, system dialog in dark-grey card
- **Psychology:** Social proof before any app usage, early rating capture while user is in positive/curious mindset

### Screen 3: Referral Code Entry (IMG_6550.PNG)
- **Headline:** "Do you have a referral code?"
- **Input:** Pre-filled with "jX7yT2" (possibly auto-populated from clipboard/deep link)
- **Helper:** "Enter your code here, or skip"
- **Button:** "Continue"
- **Psychology:** Viral loop entry point, pre-filled code reduces friction, low-pressure "or skip"

### Screen 4: Enable Notifications (IMG_6551.PNG)
- **Headline:** "Enable notifications"
- **iOS native notification permission dialog** overlaid
- **Button:** "Continue"
- **Psychology:** Permission priming with custom headline, placed mid-flow when user is in "yes" momentum (sunk cost from 3 completed steps)

### Screen 5: Results Gate (IMG_6601.PNG)
- **Headline:** "Reveal your results" (with eyes emoji)
- **Subheadline:** "Invite 3 friends or get Umax Pro to view"
- **Buttons:** "Get Umax Pro" (primary, purple gradient) / "Invite 3 Friends" (secondary, dark outlined)
- **Visual:** Blurred circular image area (user's scan result hidden behind blur)
- **Psychology:** MASSIVE curiosity gap - results exist but are hidden. Dual monetization: pay OR drive viral growth. Sunk cost from entire onboarding + photo scan

### Screen 6: Paywall (IMG_6602.PNG)
- **Headline:** "LEVEL UP" (bold italic all-caps)
- **Subheadline:** "Proven to help you max your looks"
- **Content:** 6 rating categories in 3x2 grid (Overall 68, Potential 91, Jawline 56, Masculinity 81, Skin Quality 65, Cheekbones 76) with color-coded progress bars
- **Social proof:** "1,000,000 scans completed"
- **CTA:** "Unlock now" (purple gradient)
- **Price:** "NOK 59,00 per week"
- **Design:** Dark navy gradient at top, pagination dots (multi-page paywall)
- **Psychology:** Aspirational "LEVEL UP" language, high Potential score (91) creates hope, weekly pricing minimizes perceived cost, sample ratings make value tangible

### Screen 7: Invite Friends / Share Code (IMG_6603.PNG)
- **Bottom sheet:** Share invite code "T2FDOK" with copy + share buttons
- **"Redeem" button** for entering someone else's code
- **Background:** Same blurred results
- **Psychology:** Viral loop closure - connects back to Screen 3 referral entry. Requiring 3 invites (not 1) maximizes viral coefficient

---

## Overall Flow Summary

| Step | Screen | Purpose | Value Extracted |
|------|--------|---------|----------------|
| 1 | Gender Selection | Personalization | User data |
| 2 | Social Proof + Rating | Trust building | App Store rating |
| 3 | Referral Code | Viral loop entry | Growth attribution |
| 4 | Notifications | Retention | Push permission |
| 5 | Results Gate | Conversion | Revenue or growth |
| 6 | Paywall | Monetization | Subscription |
| 7 | Invite Share | Alternative unlock | Viral growth |

**Only 4-5 taps before photo scan. Estimated time: 30-60 seconds.**

---

## Design Patterns

### Color Palette
- **Background:** Pure black (#000000)
- **Primary accent:** Purple-to-magenta gradient (~#7B2FFF to #D946EF)
- **Text:** White headlines, muted grey secondary
- **Cards/inputs:** Dark grey (#1C1C1E to #2C2C2E)

### Layout
- One question/action per screen
- Full-width gradient CTA buttons at bottom
- 5-segment progress bar at top
- Generous whitespace, never cluttered
- Bottom sheet pattern for invite sharing

---

## Psychological Techniques

| Technique | Implementation |
|-----------|---------------|
| **Social Proof** | "1,000,000+ people", "1,000,000 scans completed" |
| **Curiosity Gap** | Blurred results after scan - cannot see without paying/inviting |
| **Sunk Cost** | User invested time + photo before paywall |
| **Commitment & Consistency** | Progressive small commitments build momentum |
| **Dual-Path Monetization** | Pay OR invite 3 friends (both benefit company) |
| **Weekly Pricing** | NOK 59/week sounds smaller than ~$22/month |
| **Early Rating Capture** | App Store rating before any negative experience |
| **Permission Priming** | Custom screen before system dialogs |
| **FOMO** | Results exist but hidden |
| **Viral Loop** | Code entry → code sharing → next user enters code |

---

## Key Takeaways

1. **Brilliant curiosity gap** - User is scanned, results exist but are blurred behind paywall
2. **Every screen extracts value** - Gender data, rating, referral, notification permission, then revenue/growth
3. **Structural viral loop** - Referral code entry feeds into invite sharing, 3-friend requirement amplifies coefficient
4. **Minimal friction** - One question per screen, large buttons, skip options deprioritized
5. **Dual monetization** - Users either pay or bring 3 new potential paying users
6. **Fast time-to-value** - Only 4-5 taps to photo scan
7. **Dark premium aesthetic** - Matches young male looksmaxxing demographic
8. **Localized pricing** - NOK currency, geo-targeted
