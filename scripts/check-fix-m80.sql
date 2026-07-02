-- =============================================================================
-- Step 1: Check Belgium-Senegal (M80)
-- =============================================================================
SELECT
  m.id,
  m."externalMatchId",
  ht.name AS home,
  at.name AS away,
  m."homeScore",
  m."awayScore",
  m."regularTimeHome",
  m."regularTimeAway",
  m."extraTimeHome",
  m."extraTimeAway",
  m.duration,
  m.status,
  m.winner
FROM "Match" m
JOIN "Team" ht ON ht.id = m."homeTeamId"
JOIN "Team" at ON at.id = m."awayTeamId"
WHERE ht.name ILIKE '%belgium%' OR at.name ILIKE '%senegal%';

-- If homeScore != regularTimeHome, run this UPDATE then call force-rescore:
-- UPDATE "Match"
-- SET "homeScore" = "regularTimeHome",
--     "awayScore" = "regularTimeAway"
-- WHERE "externalMatchId" = '<value from above>'
--   AND "regularTimeHome" IS NOT NULL;

-- =============================================================================
-- Step 2: R16 slot mapping (paste output to fix KNOCKOUT_TEMPLATES)
-- =============================================================================
SELECT
  m."externalMatchId",
  m."kickoffAt",
  ht.name AS home_team,
  at.name AS away_team,
  m.status
FROM "Match" m
JOIN "Team" ht ON ht.id = m."homeTeamId"
JOIN "Team" at ON at.id = m."awayTeamId"
WHERE m.stage = 'ROUND_OF_16'
ORDER BY CAST(m."externalMatchId" AS BIGINT) ASC;

-- =============================================================================
-- Step 3: Check predictions scored wrong for Belgium-Senegal
-- =============================================================================
-- SELECT
--   mb.name AS member,
--   p."homeScorePred",
--   p."awayScorePred",
--   p."resultType",
--   p.points,
--   p."isHopeStar",
--   lm."isBonus"
-- FROM "Prediction" p
-- JOIN "LeagueMatch" lm ON lm.id = p."leagueMatchId"
-- JOIN "Match" mat ON mat.id = lm."matchId"
-- JOIN "Member" mb ON mb.id = p."memberId"
-- WHERE mat."externalMatchId" = '<value from Step 1>'
-- ORDER BY p."resultType";
