# Game Rules

## 1. Game Model

Fan League is a friendly, 100% free prediction game for colleagues. Players predict the scoreline of World Cup 2026 matches. Points are calculated automatically after official match results are scored. The leaderboard tracks standings based on accumulated points, and players earn cosmetic badges.

## 2. No Betting or Gambling

Fan League does not support any real-money transactions, betting, or wagering:
- No entry fees or registration buy-ins.
- No wagering on matches or outcomes.
- No monetary odds or returns.
- No transfer of funds between players.
- Completely free to play, intended purely for fun and office bragging rights.

## 3. Submitting Predictions

For each match, players enter their predicted scoreline:

```text
Home Team [x] - [y] Away Team
```

Example:
```text
Brazil 2 - 1 Japan
```

- Each participant can submit exactly one prediction per fixture.
- Predictions can be modified freely up until the lock time.

## 4. Prediction Lock Mechanism

Each match fixture specifies a kickoff timestamp `kickoff_at` and a locking timestamp `lock_at`.

The default locking rule:
```text
lock_at = kickoff_at - 5 minutes
```

After the `lock_at` deadline passes:
- No new predictions can be submitted.
- Existing predictions cannot be modified or deleted.
- All predictions for the fixture are visible to other players on the match detail page.

This locking policy is enforced on the server side to ensure fair competition.

## 5. Scoring System

Points are awarded based on the accuracy of the prediction against the official match result:

| Outcome | Points | Description |
|---|---:|---|
| **Exact Score** | +3 | Predicting the exact number of goals for both teams (e.g., predicting 2-1 and it ends 2-1). |
| **Correct Outcome** | +1 | Correctly predicting the match winner or draw, but with a different scoreline (e.g., predicting 2-0 and it ends 1-0). |
| **Incorrect Outcome** | 0 | Incorrect prediction of the winning team or draw. |

*Note: An exact score prediction awards 3 points total (not 3 + 1).*

## 6. Scoring Example

Assuming the official match result is:
```text
Brazil 2 - 1 Japan
```

| Prediction | Points Awarded | Explanation |
|---|---:|---|
| Brazil 2 - 1 Japan | 3 | Exact score match |
| Brazil 1 - 0 Japan | 1 | Correct outcome (Brazil win) |
| Brazil 3 - 2 Japan | 1 | Correct outcome (Brazil win) |
| Brazil 1 - 1 Japan | 0 | Incorrect outcome (Draw predicted) |
| Brazil 0 - 1 Japan | 0 | Incorrect outcome (Japan win predicted) |

## 7. Leaderboard & Standings

Rankings on the leaderboard are calculated in the following order of priority:

1. **Total points** (Highest to lowest)
2. **Exact scores count** (Most to least)
3. **Correct outcomes count** (Most to least)
4. **Submitted predictions count** (Most to least)
5. **Alphabetical order** of nicknames (as a fallback)

## 8. Cosmetic Badges

Players can unlock the following achievements based on their predictions:

- 🎯 **The Oracle**: Unlocked by predicting at least one match scoreline exactly (+3 pts).
- 🏆 **Sharp Eye**: Unlocked by guessing the correct match outcome (win/draw/loss) for at least one fixture.
- ⭐ **Master Predictor**: Unlocked by reaching a milestone of 10 or more points on the leaderboard.

These badges are displayed on the player's profile and the main dashboard for fun, friendly status.

## 9. Postponed, Cancelled, and Rescheduled Fixtures

### Postponed Fixtures
- Predictions are preserved if a new fixture time is assigned.
- If a match is moved substantially, the organizer may choose to reopen predictions.

### Cancelled Fixtures
- No points are awarded for the match.
- Predictions for this match are marked as void.

### Rescheduled Fixtures
- The `kickoff_at` and `lock_at` timestamps are updated.
- If the new locking window has not passed, players can modify predictions.
- If the original locking window had already passed, the organizer decides whether to reopen prediction editing.

## 10. Official Results Source

Match scores are scored by administrators using official datasets. Authorized sources include:
- FIFA official publications.
- Google Sports feeds.
- Automated API integrations configured by the super administrator.
