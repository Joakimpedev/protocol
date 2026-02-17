# PostHog Events – Reference for Server Fetching

All onboarding event names use the **`protocol_`** prefix. Use the exact strings below when querying PostHog from a server.

---

## 1. Event names (triggers)

### Onboarding events

| Event name (exact string) | When it fires |
|---------------------------|---------------|
| `protocol_onboarding_screen_viewed` | User lands on any onboarding screen (fires on every focus). Works for both V1 and V2. |
| `protocol_weekly_purchase` | User completes a purchase (weekly or annual) on any paywall. Despite the name, it fires for **both** plan types — use property `plan_type` to distinguish. |
| `protocol_free_trial_started` | User starts the **7-day free trial** via referral. Use property `referral_source` to distinguish how. |

### AB test events

| Event name (exact string) | When it fires |
|---------------------------|---------------|
| `ab_test_exposure` | User is assigned a variant for an AB test feature flag. Fires once per flag per screen mount. |

### In-app events (post-onboarding)

| Event name (exact string) | When it fires |
|---------------------------|---------------|
| `paywall_viewed` | User sees an in-app paywall modal (not onboarding paywalls). Property `trigger` identifies which one. |
| `purchase_completed` | User completes purchase from an in-app paywall modal. Properties: `plan`, `price`. |
| `progress_screen_viewed` | User views the progress/check-in screen. |
| `progress_photo_taken` | User takes a progress photo. Property: `week_number`. |
| `routine_step_completed` | User completes a step in their routine session. Properties: `step_name`, `routine_type`. |
| `onboarding_completed` | User finishes V1 onboarding (plan screen). |

### App-level events

| Event name (exact string) | When it fires |
|---------------------------|---------------|
| `app_opened` | Every app launch. |
| `app_opened_first_time` | First-ever app launch (once per install). |

**Trial converted** (renewal/cancel) is not sent from the app; use RevenueCat -> PostHog for that.

---

## 2. Property names (exact strings)

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
| `plan_type` | string | **Yes** | Which plan was purchased. One of: `weekly`, `annual`. |
| `ab_variant` | string | No | Present when purchase happened during an AB test variant. Value: `results_paywall_purchase` if user purchased from the results paywall (test variant). |
| `selected_problems` | string[] | No (omitted if empty) | Same as above. |
| `skin_type` | string | No (omitted if not set) | Same as above. |
| `impacts` | string[] | No (omitted if empty) | Same as above. |

### For `protocol_free_trial_started`

| Property name (exact) | Type | Always present? | Description |
|------------------------|------|------------------|-------------|
| `referral_source` | string | **Yes** | How they got the free trial. One of: `entered_friend_code` (user entered a friend's referral code), `friend_used_my_code` (someone used this user's code and started trial). |
| `selected_problems` | string[] | No (omitted if empty) | Same as above. |
| `skin_type` | string | No (omitted if not set) | Same as above. |
| `impacts` | string[] | No (omitted if empty) | Same as above. |

### For `ab_test_exposure`

| Property name (exact) | Type | Always present? | Description |
|------------------------|------|------------------|-------------|
| `flag_key` | string | **Yes** | The PostHog feature flag key (e.g. `results-paywall-purchase`). |
| `variant` | string/boolean | **Yes** | The variant assigned to the user (e.g. `control`, `test`). |

### For `paywall_viewed` (in-app)

| Property name (exact) | Type | Always present? | Description |
|------------------------|------|------------------|-------------|
| `trigger` | string | **Yes** | What triggered the paywall. One of: `general`, `week_5_photo_attempt`, `slider_comparison`. |

---

## 3. V2 Onboarding flow – screen order and `screen` values

The `screen` property on `protocol_onboarding_screen_viewed` is one of the exact strings below.

### Main flow (in actual navigation order)

| # | Value (exact string) | Screen description |
|---|----------------------|--------------------|
| 1 | `v2_hero` | Landing / hero screen |
| 2 | `v2_friend_code` | Friend/referral code entry |
| 3 | `v2_aspiration` | Aspiration / goal selection |
| 4 | `v2_face_scan` | Face scan intro |
| 5 | `v2_personalized_routine` | Personalized routine teaser |
| 6 | `v2_notifications_ask` | Push notification permission |
| 7 | `v2_gender` | Gender selection |
| 8 | `v2_concerns` | Broad concern categories (Skin Quality, Facial Structure, etc.) |
| 9 | `v2_skin_concerns` | Skin sub-concerns (acne, oily skin, etc.) |
| 10 | `v2_self_rating` | Self-rating slider (1-10) |
| 11 | `v2_social_proof` | Social proof / stats |
| 12 | `v2_life_impact` | Life impact goals (dates, career, photos, etc.) |
| 13 | `v2_before_after` | Before/after comparison |
| 14 | `v2_transformation_story` | User transformation story |
| 15 | `v2_journey` | Journey chart |
| 16 | `v2_growth_chart` | Growth/milestone chart |
| 17 | `v2_review_ask` | App Store review prompt |
| 18 | `v2_selfie` | Selfie capture (front + side) |
| 19 | `v2_fake_analysis` | Fake face analysis animation |
| 20 | `v2_results_paywall` | Results paywall (blurred scores, CTA) |

### Post-paywall screens (reached after purchase or branching)

| # | Value (exact string) | Screen description |
|---|----------------------|--------------------|
| 21 | `v2_pro_paywall` | Pro subscription paywall (weekly/annual purchase) — **control** flow only |
| 22 | `v2_face_rating` | AI face rating results (reached after purchase) |
| 23 | `v2_protocol_overview` | Protocol overview |
| 24 | `v2_shopping` | Product shopping |
| 25 | `v2_abandoned_cart_offer` | Abandoned cart lifetime offer (reached via notification/quick action) |

---

## 4. AB test: `results-paywall-purchase`

This experiment tests whether putting purchase buttons directly on the results paywall (skipping the separate Pro Paywall) improves conversion.

| Detail | Value |
|--------|-------|
| **Feature flag key** | `results-paywall-purchase` |
| **Variants** | `control` (50%), `test` (50%) |
| **Primary metric** | `protocol_weekly_purchase` |

### Control flow (default)

```
v2_results_paywall  ->  "See Your Full Results"  ->  v2_pro_paywall  ->  purchase  ->  v2_face_rating
```

### Test flow (variant = `test`)

```
v2_results_paywall (with purchase buttons)  ->  purchase  ->  v2_face_rating
```

In the **test** variant, `protocol_weekly_purchase` events include property `ab_variant: 'results_paywall_purchase'` so you can filter them.

---

## 5. Quick copy-paste reference

**Event names:**
- `protocol_onboarding_screen_viewed`
- `protocol_weekly_purchase`
- `protocol_free_trial_started`
- `ab_test_exposure`
- `paywall_viewed`
- `purchase_completed`
- `progress_screen_viewed`
- `progress_photo_taken`
- `routine_step_completed`
- `app_opened`
- `app_opened_first_time`

**Property names:**
- `screen` (string; on `protocol_onboarding_screen_viewed`)
- `plan_type` (string; on `protocol_weekly_purchase`; values: `weekly`, `annual`)
- `ab_variant` (string; on `protocol_weekly_purchase` in test variant; value: `results_paywall_purchase`)
- `referral_source` (string; on `protocol_free_trial_started`; values: `entered_friend_code`, `friend_used_my_code`)
- `flag_key` (string; on `ab_test_exposure`)
- `variant` (string; on `ab_test_exposure`)
- `trigger` (string; on `paywall_viewed`; values: `general`, `week_5_photo_attempt`, `slider_comparison`)
- `selected_problems` (string[])
- `skin_type` (string)
- `impacts` (string[])

**V2 main flow screen values (in order):** `v2_hero`, `v2_friend_code`, `v2_aspiration`, `v2_face_scan`, `v2_personalized_routine`, `v2_notifications_ask`, `v2_gender`, `v2_concerns`, `v2_skin_concerns`, `v2_self_rating`, `v2_social_proof`, `v2_life_impact`, `v2_before_after`, `v2_transformation_story`, `v2_journey`, `v2_growth_chart`, `v2_review_ask`, `v2_selfie`, `v2_fake_analysis`, `v2_results_paywall`

**V2 post-paywall screen values:** `v2_pro_paywall`, `v2_face_rating`, `v2_protocol_overview`, `v2_shopping`, `v2_abandoned_cart_offer`
