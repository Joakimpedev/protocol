In the progress tab, there is a full breakdown section put. We will now make this section, made for premium users. Implement a data tracking system and enhanced weekly/monthly summaries with free vs premium tiers.

  ## PART 1: DATA TRACKING (All Users)

  Track the following data points for ALL users. Store in Firestore under user document.

  ### 1.1 Skip Today Button
  - Add "Skip today" button to each routine step (subtle, below the step, shared next to DONE)
  - When tapped: mark step as skipped (not incomplete, explicitly skipped. Do not add any text, just mark as skipped and it should affect consistency score)
  - Store: { date, step_id, skipped: true, reason: null }
  - This skip button appears for all users, free and premium

  ### 1.2 Timer Skip Tracking
  - When user skips a product wait timer, track it
  - Store: { date, step_id, timer_skipped: true, timer_duration: X }
  - Track every time they skip vs let timer complete. 
- This is tracked but will not affect consitency score.

  ### 1.3 Routine Start Time
  - When user checks first step of morning routine, store timestamp
  - When user checks first step of evening routine, store timestamp
  - Store: { date, morning_start: timestamp, evening_start: timestamp }
  - In the analytic section we will Compare this data against their notification settings to improve notification efficiency.

  ### 1.4 Skin Rating (After Photo)
  - After user takes a progress photo, show 3-option prompt below photo preview
  - "How does  your face feel compared to last week?"
  - Three buttons in a row: [Worse] [Same] [Better]
  - Store: { week_number, photo_date, skin_rating: "worse"|"same"|"better" }
  - Required before saving photo (not optional)
  - Appears for all users

  ### 1.5 Daily Completion Data
  - Already tracking completions, ensure we store:
  - { date, day_of_week, morning_completed: bool, evening_completed: bool, exercises_completed: bool }

  ---

  ## PART 2: WEEKLY SUMMARY MODAL

  ### Free Version
  Just as it is now, with consitency score


  ━━━━━━━━━━━━━━━━━━━━━━━━

  [See detailed breakdown]
      ↓
  (tapping shows premium version for both free and premium. But later we will add a cencoring function for free users. Right now just make it available for both free and premium)

  ### Premium Version
  This Week: 71%

  Morning:   85%  ████████░░
  Evening:   57%  █████░░░░░
  Exercises: 71%  ███████░░░

  ━━━━━━━━━━━━━━━━━━━━━━━━

  Timer skips: 4 this week
  Products need time to work.

  Most skipped step: Retinol (3x)

  ━━━━━━━━━━━━━━━━━━━━━━━━

  Current streak: 12 days
  Best streak: 18 days

  every step should have a vs with last week: ↑ 8%

  Progress bars should be visual (use green #00cc00 for filled portion).

  ---

  ## PART 3: MONTHLY INSIGHTS (Premium as well)

  Add a "Monthly Insights" section accessible from weekly summary or Progress tab.

  Only shows after 4+ weeks of data.

  Your Patterns (last 30 days)

  ━━━━━━━━━━━━━━━━━━━━━━━━

  Hardest day: Saturday (43%)
  Best day: Tuesday (92%)

  ━━━━━━━━━━━━━━━━━━━━━━━━

  Notification timing:
  You start morning routine ~2 hours
  after your reminder on average.

  [Adjust notification time]

  ━━━━━━━━━━━━━━━━━━━━━━━━

  Skin Progress:
  Week 1: Same
  Week 2: Same
  Week 3: Better
  Week 4: Better

  Trend: Improving ↑

  ━━━━━━━━━━━━━━━━━━━━━━━━

  ---

  ## PART 4: DATA STRUCTURE

  Create/update Firestore structure:

  users/{userId}/
    routineData/
      {date}/
        morning_start: timestamp
        evening_start: timestamp
        morning_completed: boolean
        evening_completed: boolean
        exercises_completed: boolean
        steps: [
          { step_id, completed, skipped, timer_skipped }
        ]

    skinRatings/
      {week_number}/
        rating: "worse" | "same" | "better"
        photo_date: timestamp

    stats/
      current_streak: number
      best_streak: number
      total_days_completed: number

  ---

  ## PART 5: CALCULATIONS

  ### Streak Calculation
  - Count consecutive days with at least one routine section completed
  - Reset on a day with zero completions
  - Update best_streak if current exceeds it

  ### Day Pattern Calculation (Monthly)
  - Group last 30 days by day_of_week
  - Calculate completion % per day
  - Identify highest and lowest

  ### Notification Optimization
  - Compare morning_start timestamps to notification setting
  - Calculate average difference
  - If difference > 1 hour consistently, suggest adjustment
- Same with evening

  ---

  ## STYLING
  - Match existing terminal aesthetic
  - Progress bars: dark background, green (#00cc00) fill
  - Monospace for headers/numbers
  - Keep it minimal and clean

  ---

  ## IMPORTANT
  - Track ALL data for ALL users (free and premium)
  - Only DISPLAY detailed insights for premium users
  - Free users see basic summary with upgrade prompt
  - Data collection happens silently in background