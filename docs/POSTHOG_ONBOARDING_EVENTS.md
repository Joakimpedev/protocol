# PostHog Onboarding Events – Reference for Server Fetching

All event names use the **`protocol_`** prefix. Use the exact strings below when querying PostHog from a server.

---

## 1. Event names (triggers)

| Event name (exact string) | When it fires |
|---------------------------|---------------|
| `protocol_onboarding_screen_viewed` | User lands on any onboarding screen (fires on focus). Works for both V1 (23 screens) and V2 (24 screens). |
| `protocol_weekly_purchase` | User completes **weekly** purchase on the TrialPaywall **without** using the 7-day free trial (no referral). They pay from the start. |
| `protocol_free_trial_started` | User starts the **7-day free trial** via referral. Fires when they complete the flow and had referral credit (either they entered a friend's code, or someone used their code and started trial). Use property `referral_source` to distinguish. |

**Trial converted** (renewal/cancel) is not sent from the app; use RevenueCat → PostHog for that.

---

## 2. Property names (exact strings)

Use these exact property names when reading events from the API or building queries.

### For `protocol_onboarding_screen_viewed`

| Property name (exact) | Type | Always present? | Description |
|------------------------|------|------------------|-------------|
| `screen` | string | **Yes** | Which onboarding screen. V1 screens are plain names (e.g. `welcome`), V2 screens use the `v2_` prefix (e.g. `v2_hero`). See section 3 for all values. |
| `selected_problems` | string[] | No (omitted if empty) | Problem/category IDs the user picked (e.g. `["acne", "jawline"]`). |
| `skin_type` | string | No (omitted if not set) | One of: `oily`, `dry`, `combination`, `normal`. |
| `impacts` | string[] | No (omitted if empty) | Impact option IDs they selected. |

### For `protocol_weekly_purchase`

| Property name (exact) | Type | Always present? | Description |
|------------------------|------|------------------|-------------|
| `selected_problems` | string[] | No (omitted if empty) | Same as above. |
| `skin_type` | string | No (omitted if not set) | Same as above. |
| `impacts` | string[] | No (omitted if empty) | Same as above. |

(No `screen` property on `protocol_weekly_purchase`.)

### For `protocol_free_trial_started`

| Property name (exact) | Type | Always present? | Description |
|------------------------|------|------------------|-------------|
| `referral_source` | string | **Yes** | How they got the free trial. One of: `entered_friend_code` (user entered a friend's referral code), `friend_used_my_code` (someone used this user's code and started trial). |
| `selected_problems` | string[] | No (omitted if empty) | Same as above. |
| `skin_type` | string | No (omitted if not set) | Same as above. |
| `impacts` | string[] | No (omitted if empty) | Same as above. |

(No `screen` property on `protocol_free_trial_started`.)

---

## 3. All possible `screen` values (for `protocol_onboarding_screen_viewed`)

The `screen` property is always one of the exact strings below. V1 and V2 screens both fire the **same event** (`protocol_onboarding_screen_viewed`); use the `v2_` prefix to distinguish V2 screens.

### V1 Onboarding (23 screens)

| # | Value (exact string) |
|---|----------------------|
| 1 | `welcome` |
| 2 | `category` |
| 3 | `severity` |
| 4 | `education_real_cause` |
| 5 | `impact` |
| 6 | `goal_setting` |
| 7 | `timeline_stats` |
| 8 | `social_proof` |
| 9 | `why_others_failed` |
| 10 | `conditional_follow_up` |
| 11 | `time_commitment` |
| 12 | `mini_timeline_preview` |
| 13 | `protocol_loading` |
| 14 | `protocol_overview` |
| 15 | `reassurance_before_shopping` |
| 16 | `products_primer` |
| 17 | `shopping` |
| 18 | `why_this_works` |
| 19 | `wow_moment` |
| 20 | `commitment` |
| 21 | `trial_offer` |
| 22 | `trial_reminder` |
| 23 | `trial_paywall` |

### V2 Onboarding (24 screens)

Main flow (in order):

| # | Value (exact string) | Screen description |
|---|----------------------|--------------------|
| 1 | `v2_hero` | Landing / hero screen |
| 2 | `v2_face_scan` | Face scan intro |
| 3 | `v2_get_rating` | "Get your rating" CTA |
| 4 | `v2_personalized_routine` | Personalized routine teaser |
| 5 | `v2_gender` | Gender selection |
| 6 | `v2_concerns` | Broad concern categories (Skin Quality, Facial Structure, etc.) |
| 7 | `v2_skin_concerns` | Skin sub-concerns (acne, oily skin, etc.) |
| 8 | `v2_self_rating` | Self-rating slider (1-10) |
| 9 | `v2_social_proof` | Social proof / stats |
| 10 | `v2_life_impact` | Life impact goals (dates, career, photos, etc.) |
| 11 | `v2_before_after` | Before/after comparison |
| 12 | `v2_transformation_story` | User transformation story |
| 13 | `v2_journey` | Journey chart |
| 14 | `v2_growth_chart` | Growth/milestone chart |
| 15 | `v2_selfie` | Selfie capture (front + side) |
| 16 | `v2_review_ask` | App Store review prompt |
| 17 | `v2_notifications_ask` | Push notification permission |
| 18 | `v2_friend_code` | Friend/referral code entry |
| 19 | `v2_fake_analysis` | Fake face analysis animation |
| 20 | `v2_results_paywall` | Results paywall (main paywall) |

Additional screens (not in main flow, reached via branching):

| # | Value (exact string) | Screen description |
|---|----------------------|--------------------|
| 21 | `v2_pro_paywall` | Pro subscription paywall |
| 22 | `v2_face_rating` | Face rating results |
| 23 | `v2_protocol_overview` | Protocol overview |
| 24 | `v2_shopping` | Product shopping |

---

## 4. Quick copy-paste reference

**Event names:**
- `protocol_onboarding_screen_viewed`
- `protocol_weekly_purchase`
- `protocol_free_trial_started`

**Property names:**
- `screen` (string; only on `protocol_onboarding_screen_viewed`)
- `referral_source` (string; only on `protocol_free_trial_started`; values: `entered_friend_code`, `friend_used_my_code`)
- `selected_problems` (string[])
- `skin_type` (string)
- `impacts` (string[])

**V1 screen values:** `welcome`, `category`, `severity`, `education_real_cause`, `impact`, `goal_setting`, `timeline_stats`, `social_proof`, `why_others_failed`, `conditional_follow_up`, `time_commitment`, `mini_timeline_preview`, `protocol_loading`, `protocol_overview`, `reassurance_before_shopping`, `products_primer`, `shopping`, `why_this_works`, `wow_moment`, `commitment`, `trial_offer`, `trial_reminder`, `trial_paywall`

**V2 screen values:** `v2_hero`, `v2_face_scan`, `v2_get_rating`, `v2_personalized_routine`, `v2_gender`, `v2_concerns`, `v2_skin_concerns`, `v2_self_rating`, `v2_social_proof`, `v2_life_impact`, `v2_before_after`, `v2_transformation_story`, `v2_journey`, `v2_growth_chart`, `v2_selfie`, `v2_review_ask`, `v2_notifications_ask`, `v2_friend_code`, `v2_fake_analysis`, `v2_results_paywall`, `v2_pro_paywall`, `v2_face_rating`, `v2_protocol_overview`, `v2_shopping`
