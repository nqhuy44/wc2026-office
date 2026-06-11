"use client";

import { useEffect, useMemo, useState } from "react";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { AlertCircle, GitBranch, Trophy } from "lucide-react";

interface Team {
  id: string;
  name: string;
  shortName: string | null;
  flagUrl: string | null;
}

interface Match {
  id: string;
  externalMatchId?: string | null;
  stage: string;
  groupName: string;
  kickoffAt: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: Team;
  awayTeam: Team;
}

interface LeagueMatch {
  id: string;
  status: string;
  match: Match;
}

interface GroupTeamStats {
  team: Team;
  group: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

interface ProviderStandingRow {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface ProviderGroupStanding {
  group: string;
  rows: ProviderStandingRow[];
}

interface ProviderStandingsResponse {
  source: "provider";
  groups: ProviderGroupStanding[];
  fetchedAt: string;
}

type ViewMode = "groups" | "knockout";
type EntrantRef =
  | { kind: "groupRank"; group: string; rank: 1 | 2; label: string }
  | { kind: "thirdPlace"; groups: string[]; label: string }
  | { kind: "winner"; matchNo: number; label: string }
  | { kind: "loser"; matchNo: number; label: string };

interface KnockoutTemplate {
  no: number;
  stage: string;
  label: string;
  shortLabel: string;
  home: EntrantRef;
  away: EntrantRef;
}

interface ResolvedEntrant {
  label: string;
  team?: Team;
}

interface ResolvedKnockoutMatch {
  no: number;
  stage: string;
  label: string;
  shortLabel: string;
  actual?: LeagueMatch;
  home: ResolvedEntrant;
  away: ResolvedEntrant;
  homeScore: number | null;
  awayScore: number | null;
  kickoffAt?: string;
  status: string;
}

const WORLD_CUP_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const KNOCKOUT_ROUNDS = [
  { key: "ROUND_OF_32", label: "Round of 32", shortLabel: "R32" },
  { key: "ROUND_OF_16", label: "Round of 16", shortLabel: "R16" },
  { key: "QUARTER_FINAL", label: "Quarter-final", shortLabel: "QF" },
  { key: "SEMI_FINAL", label: "Semi-final", shortLabel: "SF" },
  { key: "THIRD_PLACE", label: "Third place", shortLabel: "3rd" },
  { key: "FINAL", label: "Final", shortLabel: "Final" }
];

const BRACKET_COLUMNS = [
  {
    labelVi: "Round of 32",
    labelEn: "Round of 32",
    shortLabel: "R32",
    matchNos: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
    paddingTop: 0,
    gap: 8
  },
  {
    labelVi: "Vòng 16 đội",
    labelEn: "Round of 16",
    shortLabel: "R16",
    matchNos: [89, 90, 93, 94, 91, 92, 95, 96],
    paddingTop: 46,
    gap: 102
  },
  {
    labelVi: "Tứ kết",
    labelEn: "Quarter-finals",
    shortLabel: "QF",
    matchNos: [97, 98, 99, 100],
    paddingTop: 142,
    gap: 286
  },
  {
    labelVi: "Bán kết",
    labelEn: "Semi-finals",
    shortLabel: "SF",
    matchNos: [101, 102],
    paddingTop: 330,
    gap: 674
  },
  {
    labelVi: "Chung kết",
    labelEn: "Final",
    shortLabel: "Final",
    matchNos: [104],
    paddingTop: 740,
    gap: 0
  }
];

const groupRank = (rank: 1 | 2, group: string): EntrantRef => ({
  kind: "groupRank",
  group,
  rank,
  label: `${rank}${group}`
});

const thirdPlace = (groups: string[]): EntrantRef => ({
  kind: "thirdPlace",
  groups,
  label: `3${groups.join("/")}`
});

const winner = (matchNo: number): EntrantRef => ({ kind: "winner", matchNo, label: `W${matchNo}` });
const loser = (matchNo: number): EntrantRef => ({ kind: "loser", matchNo, label: `L${matchNo}` });

const KNOCKOUT_TEMPLATES: KnockoutTemplate[] = [
  { no: 73, stage: "ROUND_OF_32", label: "Match 73", shortLabel: "M73", home: groupRank(2, "A"), away: groupRank(2, "B") },
  { no: 74, stage: "ROUND_OF_32", label: "Match 74", shortLabel: "M74", home: groupRank(1, "E"), away: thirdPlace(["A", "B", "C", "D", "F"]) },
  { no: 75, stage: "ROUND_OF_32", label: "Match 75", shortLabel: "M75", home: groupRank(1, "F"), away: groupRank(2, "C") },
  { no: 76, stage: "ROUND_OF_32", label: "Match 76", shortLabel: "M76", home: groupRank(1, "C"), away: groupRank(2, "F") },
  { no: 77, stage: "ROUND_OF_32", label: "Match 77", shortLabel: "M77", home: groupRank(1, "I"), away: thirdPlace(["C", "D", "F", "G", "H"]) },
  { no: 78, stage: "ROUND_OF_32", label: "Match 78", shortLabel: "M78", home: groupRank(2, "E"), away: groupRank(2, "I") },
  { no: 79, stage: "ROUND_OF_32", label: "Match 79", shortLabel: "M79", home: groupRank(1, "A"), away: thirdPlace(["C", "E", "F", "H", "I"]) },
  { no: 80, stage: "ROUND_OF_32", label: "Match 80", shortLabel: "M80", home: groupRank(1, "L"), away: thirdPlace(["E", "H", "I", "J", "K"]) },
  { no: 81, stage: "ROUND_OF_32", label: "Match 81", shortLabel: "M81", home: groupRank(1, "D"), away: thirdPlace(["B", "E", "F", "I", "J"]) },
  { no: 82, stage: "ROUND_OF_32", label: "Match 82", shortLabel: "M82", home: groupRank(1, "G"), away: thirdPlace(["A", "E", "H", "I", "J"]) },
  { no: 83, stage: "ROUND_OF_32", label: "Match 83", shortLabel: "M83", home: groupRank(2, "K"), away: groupRank(2, "L") },
  { no: 84, stage: "ROUND_OF_32", label: "Match 84", shortLabel: "M84", home: groupRank(1, "H"), away: groupRank(2, "J") },
  { no: 85, stage: "ROUND_OF_32", label: "Match 85", shortLabel: "M85", home: groupRank(1, "B"), away: thirdPlace(["E", "F", "G", "I", "J"]) },
  { no: 86, stage: "ROUND_OF_32", label: "Match 86", shortLabel: "M86", home: groupRank(1, "J"), away: groupRank(2, "H") },
  { no: 87, stage: "ROUND_OF_32", label: "Match 87", shortLabel: "M87", home: groupRank(1, "K"), away: thirdPlace(["D", "E", "I", "J", "L"]) },
  { no: 88, stage: "ROUND_OF_32", label: "Match 88", shortLabel: "M88", home: groupRank(2, "D"), away: groupRank(2, "G") },
  { no: 89, stage: "ROUND_OF_16", label: "Match 89", shortLabel: "M89", home: winner(74), away: winner(77) },
  { no: 90, stage: "ROUND_OF_16", label: "Match 90", shortLabel: "M90", home: winner(73), away: winner(75) },
  { no: 91, stage: "ROUND_OF_16", label: "Match 91", shortLabel: "M91", home: winner(76), away: winner(78) },
  { no: 92, stage: "ROUND_OF_16", label: "Match 92", shortLabel: "M92", home: winner(79), away: winner(80) },
  { no: 93, stage: "ROUND_OF_16", label: "Match 93", shortLabel: "M93", home: winner(83), away: winner(84) },
  { no: 94, stage: "ROUND_OF_16", label: "Match 94", shortLabel: "M94", home: winner(81), away: winner(82) },
  { no: 95, stage: "ROUND_OF_16", label: "Match 95", shortLabel: "M95", home: winner(86), away: winner(88) },
  { no: 96, stage: "ROUND_OF_16", label: "Match 96", shortLabel: "M96", home: winner(85), away: winner(87) },
  { no: 97, stage: "QUARTER_FINAL", label: "Match 97", shortLabel: "M97", home: winner(89), away: winner(90) },
  { no: 98, stage: "QUARTER_FINAL", label: "Match 98", shortLabel: "M98", home: winner(93), away: winner(94) },
  { no: 99, stage: "QUARTER_FINAL", label: "Match 99", shortLabel: "M99", home: winner(91), away: winner(92) },
  { no: 100, stage: "QUARTER_FINAL", label: "Match 100", shortLabel: "M100", home: winner(95), away: winner(96) },
  { no: 101, stage: "SEMI_FINAL", label: "Match 101", shortLabel: "M101", home: winner(97), away: winner(98) },
  { no: 102, stage: "SEMI_FINAL", label: "Match 102", shortLabel: "M102", home: winner(99), away: winner(100) },
  { no: 103, stage: "THIRD_PLACE", label: "Match 103", shortLabel: "M103", home: loser(101), away: loser(102) },
  { no: 104, stage: "FINAL", label: "Match 104", shortLabel: "M104", home: winner(101), away: winner(102) }
];

const TEAM_FLAG_FALLBACK: Record<string, string> = {
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  "Bosnia-Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  Czechia: "🇨🇿",
  Curaçao: "🇨🇼",
  Ecuador: "🇪🇨",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Haiti: "🇭🇹",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Paraguay: "🇵🇾",
  Qatar: "🇶🇦",
  Scotland: "🏴",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Switzerland: "🇨🇭",
  Turkey: "🇹🇷",
  "United States": "🇺🇸"
};

function isImageUrl(value?: string | null) {
  return Boolean(value && /^(https?:)?\/\//.test(value));
}

function teamFallback(team: Team) {
  return TEAM_FLAG_FALLBACK[team.name] ?? team.flagUrl ?? team.shortName?.slice(0, 2).toUpperCase() ?? team.name.slice(0, 2).toUpperCase();
}

function TeamMark({ team }: { team: Team }) {
  const flagUrl = team.flagUrl;
  if (flagUrl && isImageUrl(flagUrl)) {
    return (
      <span className="w-7 h-7 rounded-full border border-border bg-white shadow-sm overflow-hidden grid place-items-center shrink-0">
        <img src={flagUrl} alt={`${team.name} logo`} className="w-5 h-5 object-contain" />
      </span>
    );
  }

  return (
    <span
      aria-label={`${team.name} logo`}
      className="w-7 h-7 rounded-full border border-border bg-white shadow-sm grid place-items-center shrink-0 text-[16px] leading-none"
    >
      {teamFallback(team)}
    </span>
  );
}

function TeamCell({ team }: { team: Team }) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 min-w-0">
      <TeamMark team={team} />
      <span className="font-semibold text-[13px] truncate">{team.name}</span>
    </div>
  );
}

function EntrantCell({ entrant }: { entrant: ResolvedEntrant }) {
  if (entrant.team) return <TeamCell team={entrant.team} />;

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 min-w-0">
      <span className="w-7 h-7 rounded-full border border-dashed border-border bg-gray-50 grid place-items-center shrink-0 text-[10px] font-black text-gray-400">
        TBD
      </span>
      <span className="font-semibold text-[13px] truncate text-muted-foreground">{entrant.label}</span>
    </div>
  );
}

function formatStage(stage: string) {
  return stage
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatKickoff(date: string, language: string) {
  return new Date(date).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function scoreText(match: Match) {
  if (match.homeScore === null || match.awayScore === null) return "vs";
  return `${match.homeScore} - ${match.awayScore}`;
}

function knockoutScoreText(match: ResolvedKnockoutMatch) {
  if (match.homeScore === null || match.awayScore === null) return "vs";
  return `${match.homeScore} - ${match.awayScore}`;
}

function sortGroups(groups: string[]) {
  return groups.sort((a, b) => {
    const ai = WORLD_CUP_GROUPS.indexOf(a);
    const bi = WORLD_CUP_GROUPS.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });
}

function scoredMatch(match?: LeagueMatch) {
  return Boolean(match && match.match.homeScore !== null && match.match.awayScore !== null);
}

function hasOfficialGroupFixtures(matches: LeagueMatch[], group: string) {
  return matches.some((lm) => lm.match.stage === "GROUP" && lm.match.groupName === group && lm.match.externalMatchId);
}

function getWinner(match: ResolvedKnockoutMatch): ResolvedEntrant | undefined {
  if (match.homeScore === null || match.awayScore === null || match.homeScore === match.awayScore) return undefined;
  return match.homeScore > match.awayScore ? match.home : match.away;
}

function getLoser(match: ResolvedKnockoutMatch): ResolvedEntrant | undefined {
  if (match.homeScore === null || match.awayScore === null || match.homeScore === match.awayScore) return undefined;
  return match.homeScore > match.awayScore ? match.away : match.home;
}

export default function StandingsPage() {
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [providerStandings, setProviderStandings] = useState<Record<string, GroupTeamStats[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("groups");
  const { language, t } = useLanguage();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [matchesData, standingsData] = await Promise.all([
        apiClient<{ matches: LeagueMatch[] }>("/matches?all=true"),
        apiClient<ProviderStandingsResponse>("/standings").catch(() => null)
      ]);
      setMatches(matchesData.matches);
      setProviderStandings(
        standingsData
          ? Object.fromEntries(
              standingsData.groups.map((standing) => [
                standing.group,
                standing.rows.map((row) => ({
                  team: row.team,
                  group: standing.group,
                  mp: row.playedGames,
                  w: row.won,
                  d: row.draw,
                  l: row.lost,
                  gf: row.goalsFor,
                  ga: row.goalsAgainst,
                  gd: row.goalDifference,
                  pts: row.points
                }))
              ])
            )
          : {}
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const fromData = matches
      .filter((lm) => lm.match.stage === "GROUP" && lm.match.groupName)
      .map((lm) => lm.match.groupName);
    return sortGroups(Array.from(new Set([...WORLD_CUP_GROUPS, ...fromData, ...Object.keys(providerStandings)])));
  }, [matches, providerStandings]);

  const computeGroup = (group: string): GroupTeamStats[] => {
    const statsByTeam: Record<string, GroupTeamStats> = {};
    const shouldUseOfficialOnly = hasOfficialGroupFixtures(matches, group);
    matches
      .filter(
        (lm) =>
          lm.match.stage === "GROUP" &&
          lm.match.groupName === group &&
          (!shouldUseOfficialOnly || Boolean(lm.match.externalMatchId))
      )
      .forEach((lm) => {
        const { homeTeam, awayTeam, homeScore, awayScore } = lm.match;

        if (!statsByTeam[homeTeam.id]) {
          statsByTeam[homeTeam.id] = { team: homeTeam, group, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
        }
        if (!statsByTeam[awayTeam.id]) {
          statsByTeam[awayTeam.id] = { team: awayTeam, group, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
        }

        if (homeScore === null || awayScore === null) return;

        const home = statsByTeam[homeTeam.id];
        const away = statsByTeam[awayTeam.id];

        home.mp += 1;
        away.mp += 1;
        home.gf += homeScore;
        home.ga += awayScore;
        away.gf += awayScore;
        away.ga += homeScore;

        if (homeScore > awayScore) {
          home.w += 1;
          home.pts += 3;
          away.l += 1;
        } else if (homeScore < awayScore) {
          away.w += 1;
          away.pts += 3;
          home.l += 1;
        } else {
          home.d += 1;
          away.d += 1;
          home.pts += 1;
          away.pts += 1;
        }

        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;
      });

    return Object.values(statsByTeam).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.name.localeCompare(b.team.name);
    });
  };

  const groupStandings = useMemo(() => {
    return Object.fromEntries(groups.map((group) => [group, providerStandings[group] ?? computeGroup(group)]));
  }, [groups, matches, providerStandings]);

  const knockoutByRound = useMemo(() => {
    const actualMatchesByStage = KNOCKOUT_ROUNDS.reduce<Record<string, LeagueMatch[]>>((acc, round) => {
      acc[round.key] = matches
        .filter((lm) => lm.match.stage === round.key)
        .sort((a, b) => new Date(a.match.kickoffAt).getTime() - new Date(b.match.kickoffAt).getTime());
      return acc;
    }, {});

    const stageIndexes: Record<string, number> = {};
    const resolvedByMatchNo = new Map<number, ResolvedKnockoutMatch>();

    const groupIsComplete = (group: string) => {
      const providerRows = providerStandings[group];
      if (providerRows) {
        return providerRows.length === 4 && providerRows.every((row) => row.mp >= 3);
      }

      const shouldUseOfficialOnly = hasOfficialGroupFixtures(matches, group);
      const groupMatches = matches.filter(
        (lm) =>
          lm.match.stage === "GROUP" &&
          lm.match.groupName === group &&
          (!shouldUseOfficialOnly || Boolean(lm.match.externalMatchId))
      );
      return groupMatches.length === 6 && groupMatches.every((lm) => scoredMatch(lm)) && (groupStandings[group]?.length ?? 0) === 4;
    };

    const resolveEntrant = (ref: EntrantRef, actualTeam?: Team): ResolvedEntrant => {
      if (ref.kind === "groupRank") {
        return {
          label: ref.label,
          team: (groupIsComplete(ref.group) ? groupStandings[ref.group]?.[ref.rank - 1]?.team : undefined) ?? actualTeam
        };
      }

      if (ref.kind === "thirdPlace") {
        return {
          label: ref.label,
          team: actualTeam
        };
      }

      const source = resolvedByMatchNo.get(ref.matchNo);
      const resolved = ref.kind === "winner" ? (source ? getWinner(source) : undefined) : source ? getLoser(source) : undefined;
      return resolved ?? { label: ref.label, team: actualTeam };
    };

    KNOCKOUT_TEMPLATES.forEach((template) => {
      const nextIndex = stageIndexes[template.stage] ?? 0;
      const actual = actualMatchesByStage[template.stage]?.[nextIndex];
      stageIndexes[template.stage] = nextIndex + 1;

      const resolved: ResolvedKnockoutMatch = {
        ...template,
        actual,
        home: resolveEntrant(template.home, actual?.match.homeTeam),
        away: resolveEntrant(template.away, actual?.match.awayTeam),
        homeScore: actual?.match.homeScore ?? null,
        awayScore: actual?.match.awayScore ?? null,
        kickoffAt: actual?.match.kickoffAt,
        status: actual?.status ?? "TBD"
      };
      resolvedByMatchNo.set(template.no, resolved);
    });

    return KNOCKOUT_ROUNDS.map((round) => ({
      ...round,
      matches: KNOCKOUT_TEMPLATES.filter((template) => template.stage === round.key).map((template) => resolvedByMatchNo.get(template.no)!)
    }));
  }, [matches, groupStandings]);

  const knockoutMatchCount = knockoutByRound.reduce((total, round) => total + round.matches.filter((match) => match.actual).length, 0);
  const knockoutMatchesByNo = useMemo(() => {
    return new Map(knockoutByRound.flatMap((round) => round.matches.map((match) => [match.no, match] as const)));
  }, [knockoutByRound]);

  const renderKnockoutMatch = (match: ResolvedKnockoutMatch, isFinal = false) => (
    <article key={match.no} className={`relative rounded-lg border border-border bg-white p-2.5 shadow-sm ${isFinal ? "ring-2 ring-[#2F7D5C]/15" : ""}`}>
      <div className="absolute -left-4 top-1/2 h-px w-4 bg-border" />
      <div className="absolute -right-4 top-1/2 h-px w-4 bg-border" />
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <span className="text-[11px] font-extrabold text-muted-foreground uppercase">{match.shortLabel}</span>
          <span className="ml-2 text-[11px] font-bold text-gray-400">{formatStage(match.stage)}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{match.kickoffAt ? formatKickoff(match.kickoffAt, language) : "TBD"}</span>
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-2">
          <EntrantCell entrant={match.home} />
          <span className="text-right font-black text-[14px]">{match.homeScore === null ? "—" : match.homeScore}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-2">
          <EntrantCell entrant={match.away} />
          <span className="text-right font-black text-[14px]">{match.awayScore === null ? "—" : match.awayScore}</span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-muted-foreground">{knockoutScoreText(match)}</span>
        <span
          className={`text-[10px] font-extrabold uppercase rounded-full px-2 py-0.5 border ${
            scoredMatch(match.actual) || match.status === "SCORED" || match.status === "FINISHED"
              ? "bg-[#E8F5E9] text-[#2F7D5C] border-[#C8E6C9]"
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}
        >
          {match.status}
        </span>
      </div>
    </article>
  );

  return (
    <NavigationShell>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-foreground mb-1">
            {t("standingsTitle")}
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {t("standingsDesc")}
          </p>
        </div>

        <div className="inline-flex p-1 bg-white border border-border rounded-lg shadow-sm w-fit">
          <button
            onClick={() => setViewMode("groups")}
            className={`min-h-[34px] px-4 rounded-md text-[13px] font-extrabold transition-all ${
              viewMode === "groups" ? "bg-[#2F7D5C] text-white" : "text-muted-foreground hover:bg-gray-50"
            }`}
          >
            {t("groupsViewBtn")}
          </button>
          <button
            onClick={() => setViewMode("knockout")}
            className={`min-h-[34px] px-4 rounded-md text-[13px] font-extrabold transition-all ${
              viewMode === "knockout" ? "bg-[#2F7D5C] text-white" : "text-muted-foreground hover:bg-gray-50"
            }`}
          >
            {t("knockoutViewBtn")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
            style={{ borderColor: "#2F7D5C", borderTopColor: "transparent" }}
          />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: "#2F7D5C" }}>
            {t("loading")}
          </p>
        </div>
      ) : viewMode === "groups" ? (
        <section>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {groups.map((group) => {
              const rows = groupStandings[group] ?? [];
              const shouldUseOfficialOnly = hasOfficialGroupFixtures(matches, group);
              const playedMatches = providerStandings[group]
                ? Math.floor(providerStandings[group].reduce((total, row) => total + row.mp, 0) / 2)
                : matches.filter(
                    (lm) =>
                      lm.match.stage === "GROUP" &&
                      lm.match.groupName === group &&
                      (!shouldUseOfficialOnly || Boolean(lm.match.externalMatchId)) &&
                      lm.match.homeScore !== null &&
                      lm.match.awayScore !== null
                  ).length;

              return (
                <article key={group} className="kp-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-bold">{t("groupStageLabel").replace("{group}", group)}</h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {playedMatches} / 6 {t("matchesScoredSuffix")}
                      </p>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#2F7D5C] bg-[#E8F5E9] border border-[#C8E6C9] rounded-full px-2.5 py-1">
                      {rows.length} {t("teamsCountSuffix")}
                    </span>
                  </div>

                  {rows.length === 0 ? (
                    <div className="py-10 px-5 text-center text-[13px] text-muted-foreground bg-white">
                      <AlertCircle className="mx-auto text-gray-300 mb-2" size={24} />
                      {t("noFixturesForGroup")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="kp-table min-w-[620px]">
                        <thead>
                          <tr>
                            <th className="th-center" style={{ width: 44 }}>
                              #
                            </th>
                            <th>{t("teamTableCol")}</th>
                            <th className="th-center">MP</th>
                            <th className="th-center">W</th>
                            <th className="th-center">D</th>
                            <th className="th-center">L</th>
                            <th className="th-center">GF</th>
                            <th className="th-center">GA</th>
                            <th className="th-center">GD</th>
                            <th className="th-center">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((stat, index) => (
                            <tr
                              key={stat.team.id}
                              style={{ background: index < 2 ? "#F0FDF4" : index === 2 ? "#FFFBEB" : undefined }}
                            >
                              <td className="td-center" style={{ fontWeight: 800, color: index < 2 ? "#16A34A" : "#9CA3AF" }}>
                                {index + 1}
                                {index < 2 && <span className="block text-[10px] font-bold text-success">Q</span>}
                              </td>
                              <td>
                                <TeamCell team={stat.team} />
                              </td>
                              <td className="td-center font-medium">{stat.mp}</td>
                              <td className="td-center">{stat.w}</td>
                              <td className="td-center" style={{ color: "#6B7280" }}>
                                {stat.d}
                              </td>
                              <td className="td-center" style={{ color: "#6B7280" }}>
                                {stat.l}
                              </td>
                              <td className="td-center" style={{ color: "#6B7280" }}>
                                {stat.gf}
                              </td>
                              <td className="td-center" style={{ color: "#6B7280" }}>
                                {stat.ga}
                              </td>
                              <td
                                className="td-center font-bold"
                                style={{ color: stat.gd > 0 ? "#16A34A" : stat.gd < 0 ? "#DC2626" : "#6B7280" }}
                              >
                                {stat.gd > 0 ? `+${stat.gd}` : stat.gd}
                              </td>
                              <td className="td-center" style={{ fontSize: 16, fontWeight: 900 }}>
                                {stat.pts}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-5 px-5 py-3 border border-border rounded-lg flex flex-wrap gap-4 text-[12px] text-muted-foreground bg-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300" />
              {t("statusQualified")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-yellow-100 border border-yellow-300" />
              {t("statusPlayoff")}
            </span>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="kp-card flex items-center justify-between gap-4 flex-wrap" style={{ padding: "16px 20px" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] border border-[#C8E6C9] grid place-items-center text-[#2F7D5C]">
                <GitBranch size={20} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold">
                  {t("knockoutBracketTitle")}
                </h3>
                <p className="text-[13px] text-muted-foreground">
                  {knockoutMatchCount > 0
                    ? t("knockoutFixturesCount").replace("{count}", knockoutMatchCount.toString())
                    : t("knockoutFixturesTBD")}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#2F7D5C] bg-[#E8F5E9] border border-[#C8E6C9] rounded-full px-3 py-1.5">
              <Trophy size={14} />
              {t("finalPathLabel")}
            </span>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
              {t("wc2026Notice")}
            </div>

            <article className="kp-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-bold">{t("onewayBracketTitle")}</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {t("onewayBracketDesc")}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#2F7D5C] bg-[#E8F5E9] border border-[#C8E6C9] rounded-full px-3 py-1.5">
                  <Trophy size={14} />
                  {t("finalPathLabel")}
                </span>
              </div>

              <div className="overflow-auto p-4">
                <div className="grid grid-cols-[300px_300px_300px_300px_300px] gap-5 min-w-[1580px]">
                  {BRACKET_COLUMNS.map((column) => (
                    <div key={column.shortLabel} className="space-y-3">
                      <div className="h-8 flex items-center justify-between bg-[#8A1538] text-white rounded px-3">
                        <h4 className="text-[12px] font-black uppercase">{language === "vi" ? column.labelVi : column.labelEn}</h4>
                        <span className="text-[10px] font-extrabold opacity-80">{column.shortLabel}</span>
                      </div>

                      <div style={{ paddingTop: column.paddingTop, display: "grid", gap: column.gap }}>
                        {column.matchNos.map((matchNo) => {
                          const match = knockoutMatchesByNo.get(matchNo);
                          return match ? renderKnockoutMatch(match, matchNo === 104) : null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="kp-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[16px] font-bold">{t("thirdPlaceTitle")}</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t("thirdPlaceDesc")}
                </p>
              </div>

              <div className="max-w-[360px] p-4">
                {(() => {
                  const match = knockoutMatchesByNo.get(103);
                  return match ? renderKnockoutMatch(match) : null;
                })()}
              </div>
            </article>
          </div>
        </section>
      )}
    </NavigationShell>
  );
}
