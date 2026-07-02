-- =============================================================================
-- Step 1: Check Belgium-Senegal (M80) — verify homeScore vs regularTimeHome
-- =============================================================================
SELECT
  m.id,
  m.external_match_id,
  ht.name AS home_team,
  at.name AS away_team,
  m.home_score        AS "homeScore (used for scoring)",
  m.away_score        AS "awayScore",
  m.regular_time_home AS "regularTimeHome (90-min, authoritative)",
  m.regular_time_away AS "regularTimeAway",
  m.extra_time_home   AS "extraTimeHome (ET cumulative)",
  m.extra_time_away   AS "extraTimeAway",
  m.penalties_home,
  m.penalties_away,
  m.duration,
  m.status,
  m.winner
FROM "Match" m
JOIN "Team" ht ON ht.id = m.home_team_id
JOIN "Team" at ON at.id = m.away_team_id
WHERE ht.name ILIKE '%belgium%' OR at.name ILIKE '%senegal%'
   OR ht.name ILIKE '%belgique%' OR at.name ILIKE '%sénégal%';

-- If homeScore != regularTimeHome, homeScore is wrong (ET score was stored instead of 90-min).
-- Fix it:
-- UPDATE "Match"
-- SET home_score = regular_time_home,
--     away_score = regular_time_away
-- WHERE external_match_id = '<id from above>'
--   AND regular_time_home IS NOT NULL;
-- Then call /admin/matches/<matchId>/force-rescore to re-score predictions.

-- =============================================================================
-- Step 2: Determine correct R16 externalMatchId → template slot mapping
-- Run this to see which actual DB R16 match corresponds to which R16 slot
-- =============================================================================
SELECT
  m.external_match_id,
  m.kickoff_at,
  ht.name AS home_team,
  at.name AS away_team,
  m.status
FROM "Match" m
JOIN "Team" ht ON ht.id = m.home_team_id
JOIN "Team" at ON at.id = m.away_team_id
WHERE m.stage = 'ROUND_OF_16'
ORDER BY CAST(m.external_match_id AS BIGINT) ASC;

-- The output rows (sorted by externalMatchId) map to templates slots 89, 90, 91, 92, 93, 94, 95, 96
-- in that order in the current code. If the teams in a row don't match what the template
-- expects for that slot, the mapping is wrong and needs to be corrected.
--
-- Expected template assignments (based on WC2026 bracket):
--   Slot 89 → winner(M73) vs winner(M74)
--   Slot 90 → winner(M75) vs winner(M76)
--   Slot 91 → winner(M77) vs winner(M78)  [Spain/Austria vs Portugal/Croatia]
--   Slot 92 → winner(M79) vs winner(M80)  [USA vs Belgium ← this is KNOWN correct]
--   Slot 93 → winner(M81) vs winner(M82)  [Brazil vs Norway ← provider puts this at position 2!]
--   Slot 94 → winner(M83) vs winner(M84)
--   Slot 95 → winner(M85) vs winner(M86)
--   Slot 96 → winner(M87) vs winner(M88)
--
-- If row 3 (0-indexed: 2) shows Brazil-Norway (should be slot 93, not 91),
-- and row 4 shows USA-Belgium (slot 92, correct), then the provider order is:
-- [89, 90, 93, 92, 91, ?, ?, ?]
-- Report back the full list so we can fix KNOCKOUT_TEMPLATES ordering.

-- =============================================================================
-- Step 3: Check predictions that were scored wrong for Belgium-Senegal
-- =============================================================================
-- SELECT
--   m2.name AS member,
--   p.home_score_pred,
--   p.away_score_pred,
--   p.result_type,
--   p.points,
--   p.is_hope_star,
--   lm.is_bonus
-- FROM "Prediction" p
-- JOIN "LeagueMatch" lm ON lm.id = p.league_match_id
-- JOIN "Match" mat ON mat.id = lm.match_id
-- JOIN "Member" m2 ON m2.id = p.member_id
-- WHERE mat.external_match_id = '<id from Step 1>'
-- ORDER BY p.result_type;
