# PostHog Onboarding Events – Reference for Server Fetching

All event names use the **`protocol_`** prefix. Use the exact strings below when querying PostHog from a server.

---

## 1. Event names (triggers)

| Event name (exact string) | When it fires |
|---------------------------|---------------|
| `protocol_onboarding_screen_viewed` | User lands on any onboarding screen (fires on focus for each of the 23 screens). |
| `protocol_trial_started` | User completes trial purchase on the TrialPaywall screen. |

**Trial converted** is not sent from the app; use RevenueCat → PostHog for that.

---

## 2. Property names (exact strings)

Use these exact property names when reading events from the API or building queries.

### For `protocol_onboarding_screen_viewed`

| Property name (exact) | Type | Always present? | Description |
|------------------------|------|------------------|-------------|
| `screen` | string | **Yes** | Which onboarding screen. One of the 23 values in the table below. |
| `selected_problems` | string[] | No (omitted if empty) | Problem/category IDs the user picked (e.g. `["acne", "jawline"]`). |
| `skin_type` | string | No (omitted if not set) | One of: `oily`, `dry`, `combination`, `normal`. |
| `impacts` | string[] | No (omitted if empty) | Impact option IDs they selected. |

### For `protocol_trial_started`

| Property name (exact) | Type | Always present? | Description |
|------------------------|------|------------------|-------------|
| `selected_problems` | string[] | No (omitted if empty) | Same as above. |
| `skin_type` | string | No (omitted if not set) | Same as above. |
| `impacts` | string[] | No (omitted if empty) | Same as above. |

(No `screen` property on `protocol_trial_started`.)

---

## 3. All possible `screen` values (for `protocol_onboarding_screen_viewed`)

The `screen` property is always one of these exact strings:

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

---

## 4. Quick copy-paste reference

**Event names:**
- `protocol_onboarding_screen_viewed`
- `protocol_trial_started`

**Property names:**
- `screen` (string; only on `protocol_onboarding_screen_viewed`)
- `selected_problems` (string[])
- `skin_type` (string)
- `impacts` (string[])

**Screen values:** see table in section 3.
