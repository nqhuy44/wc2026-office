"use client";

import { useEffect, useState } from "react";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { Calendar, Clock, ArrowRight, Award, Target, Trophy, Star, Copy, Check, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TeamLogo from "@/components/team-logo";

interface Team {
  id: string;
  name: string;
  shortName: string;
  flagUrl: string;
}

interface Match {
  id: string;
  stage: string;
  groupName: string | null;
  kickoffAt: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
}

interface LeagueMatch {
  id: string;
  status: string;
  isPredictionEnabled: boolean;
  lockAt: string;
  match: Match;
  myPrediction: {
    homeScorePred: number;
    awayScorePred: number;
    points: number;
    resultType: string;
  } | null;
}

interface LeaderboardItem {
  id: string;
  nickname: string;
  totalPoints: number;
  exactMatches: number;
  correctResults: number;
  totalPredictions: number;
}

interface Membership {
  id: string;
  leagueId: string;
  nickname: string;
  role: string;
  league: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
  memberships: Membership[];
}

interface TeamSimple {
  id: string;
  name: string;
  shortName: string | null;
  flagUrl: string | null;
  countryCode: string | null;
}

interface ChampionData {
  isLocked: boolean;
  lockAt: string;
  myPick: { teamId: string; team: TeamSimple } | null;
  championTeam: TeamSimple | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeLeagueName, setActiveLeagueName] = useState("");
  const [champion, setChampion] = useState<ChampionData | null>(null);
  const [allTeams, setAllTeams] = useState<TeamSimple[]>([]);
  const [pickSaving, setPickSaving] = useState(false);
  const [pickTeamId, setPickTeamId] = useState<string>("");
  const { language, t } = useLanguage();

  const stageLabel = (stage: string, groupName: string | null): string => {
    if (stage === "GROUP") return groupName ? t("groupStageName").replace("{group}", groupName) : t("stageGroupNoLabel");
    if (stage === "ROUND_OF_32") return t("stageRoundOf32");
    if (stage === "ROUND_OF_16") return t("stageRoundOf16");
    if (stage === "QUARTER_FINAL") return t("stageQuarterFinal");
    if (stage === "SEMI_FINAL") return t("stageSemiFinal");
    if (stage === "THIRD_PLACE") return t("stageThirdPlace");
    if (stage === "FINAL") return t("stageFinal");
    return stage;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const meData = await apiClient<{ user: User }>("/auth/me");
        if (meData.user.role === "SUPER_ADMIN") {
          router.push("/superadmin");
          return;
        }
        setMe(meData.user);

        const activeLeagueId = localStorage.getItem("activeLeagueId");
        
        if (activeLeagueId) {
          const currentMembership = meData.user.memberships.find(m => m.leagueId === activeLeagueId);
          if (currentMembership) {
            setActiveLeagueName(currentMembership.league.name);
          }

          // Fetch scoped league data
          const [matchData, lbData, champData, teamsData] = await Promise.all([
            apiClient<{ matches: LeagueMatch[] }>("/matches"),
            apiClient<{ leaderboard: LeaderboardItem[] }>("/leaderboard"),
            apiClient<ChampionData>("/champion-pick").catch(() => null),
            apiClient<{ teams: TeamSimple[] }>("/teams").catch(() => ({ teams: [] })),
          ]);
          setMatches(matchData.matches);
          setLeaderboard(lbData.leaderboard);
          setChampion(champData);
          setAllTeams(teamsData.teams);
          setPickTeamId(champData?.myPick?.teamId ?? "");
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveChampionPick = async () => {
    if (!pickTeamId) return;
    setPickSaving(true);
    try {
      const data = await apiClient<{ pick: { teamId: string; team: TeamSimple } }>("/champion-pick", {
        method: "PUT",
        json: { teamId: pickTeamId },
      });
      setChampion(prev => prev ? { ...prev, myPick: data.pick } : prev);
      alert(t("championPickSaved"));
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setPickSaving(false);
    }
  };

  const handleCopyUsername = () => {
    if (!me) return;
    navigator.clipboard.writeText(me.username);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <NavigationShell>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>{t("loading")}</p>
        </div>
      </NavigationShell>
    );
  }

  // ─── EMPTY STATE: User has no leagues ───
  if (me && me.memberships.length === 0) {
    const isSuperAdmin = me.role === "SUPER_ADMIN";
    
    return (
      <NavigationShell>
        <div className="max-w-[600px] mx-auto mt-8 md:mt-16 p-8 bg-white border border-gray-100 rounded-3xl text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2" style={{ background: 'linear-gradient(90deg, #2F7D5C, #1a5c40)' }} />
          
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6 text-primary border border-green-100">
            <Building2 size={32} style={{ color: '#2F7D5C' }} />
          </div>

          <h1 className="text-[24px] font-bold text-gray-900 mb-2">
            {t("welcomeUser").replace("{username}", me.username)}
          </h1>
          
          {isSuperAdmin ? (
            <>
              <p className="text-[14px] text-gray-500 mb-8 max-w-[460px] mx-auto leading-relaxed">
                {t("superAdminWelcomeMsg")}
              </p>
              <Link href="/superadmin?tab=leagues">
                <button className="px-6 py-3 rounded-xl text-white font-bold transition-all shadow-md hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #2F7D5C, #1a5c40)' }}>
                  {t("createFirstLeague")}
                </button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-[14px] text-gray-500 mb-6 max-w-[460px] mx-auto leading-relaxed">
                {t("memberWelcomeMsg")}
              </p>
              
              {/* Copy Username Widget */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-8 max-w-[360px] mx-auto flex flex-col items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  {t("yourUsername")}
                </span>
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 w-full justify-between shadow-sm">
                  <span className="font-bold text-gray-800 text-[15px]" style={{ fontFamily: 'monospace' }}>
                    {me.username}
                  </span>
                  <button 
                    onClick={handleCopyUsername}
                    className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-primary transition-all relative"
                    title={t("copyUsername")}
                  >
                    {copied ? (
                      <Check size={18} className="text-green-600 animate-scale-up" />
                    ) : (
                      <Copy size={18} className="hover:scale-105 transition-transform" />
                    )}
                  </button>
                </div>
                {copied && (
                  <span className="text-[11px] font-semibold text-green-600 mt-2 animate-fade-in">
                    {t("copiedToClipboard")}
                  </span>
                )}
              </div>

              <div className="text-[12px] text-gray-400">
                {t("refreshHelpText")}
              </div>
            </>
          )}
        </div>
      </NavigationShell>
    );
  }

  // Find user's stats in current league
  const activeLeagueId = localStorage.getItem("activeLeagueId");
  const activeMembership = me?.memberships.find(m => m.leagueId === activeLeagueId);
  const myNickname = activeMembership?.nickname || me?.displayName || "Player";

  const scoredResultTypes = ["EXACT_SCORE", "CORRECT_RESULT", "WRONG"];
  const activeMatches = matches.filter((m) => m.isPredictionEnabled);
  const liveMatches = matches.filter((m) => m.status === "LIVE" && m.isPredictionEnabled);
  const openMatches = matches.filter((m) => m.status === "OPEN" && m.isPredictionEnabled);
  const nextMatch = openMatches[0];
  const predictedMatches = matches.filter((m) => m.myPrediction && m.myPrediction.resultType !== "VOID");
  const scoredMatches = matches
    .filter((m) => m.status === "SCORED" && m.myPrediction && scoredResultTypes.includes(m.myPrediction.resultType))
    .slice(0, 3);

  const myRank = leaderboard.findIndex((item) => item.nickname === myNickname) + 1;
  const myScore = leaderboard.find((item) => item.nickname === myNickname);

  return (
    <NavigationShell>
      <h1 className="text-[24px] font-bold text-foreground mb-1">
        {t("dashboardTitle")}
      </h1>
      <p className="text-[14px] text-muted-foreground mb-6">
        {new Date().toLocaleDateString(language === "vi" ? 'vi-VN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start w-full">
        {/* ─── Left Column ─── */}
        <div className="flex flex-col gap-5">

          {/* Welcome Card */}
          <div className="rounded-xl p-6 text-white relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, #2F7D5C 0%, #1a5c40 100%)',
          }}>
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[64px] opacity-[0.12] pointer-events-none">⚽</span>
            <div className="text-[13px] opacity-80 mb-1">
              {t("welcomeBack")}
            </div>
            <div className="text-[22px] font-bold mb-0.5">{myNickname}</div>
            <div className="text-[14px] opacity-80 mb-4 flex items-center gap-1">
              <Building2 size={14} />
              <span>{activeLeagueName}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { val: `#${myRank > 0 ? myRank : '—'}`, label: t("currentRank") },
                { val: myScore?.totalPoints ?? '—', label: t("totalPoints") },
                { val: `${predictedMatches.length}/${activeMatches.length}`, label: t("matchesPredicted") },
                { val: myScore?.exactMatches ?? 0, label: t("exactScores") },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-[22px] font-extrabold">{s.val}</div>
                  <div className="text-[11px] opacity-75 mt-px">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full text-[12px] font-semibold bg-white/[0.18]">
              {t("goodLuck")}
            </div>
          </div>

          {/* ─── Champion Pick Card ─── */}
          {champion && (
            <div className="kp-card" style={{ border: '2px solid #FFD700', boxShadow: '0 2px 8px rgba(255,215,0,0.15)', padding: '20px 24px' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[15px] font-bold text-foreground flex items-center gap-1.5">
                    🏆 {t("championPickTitle")}
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {t("championPickSub")}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 font-semibold">
                    {t("championPickLocksAt").replace(
                      "{time}",
                      new Date(champion.lockAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    )}
                  </p>
                </div>
                {champion.isLocked && (
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                    🔒 {t("championPickLocked")}
                  </span>
                )}
              </div>

              {/* Confirmed champion banner */}
              {champion.championTeam && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-[13px] font-bold" style={{ background: '#FFF8E1', color: '#F57F17', border: '1px solid #FFE082' }}>
                  {champion.championTeam.flagUrl && (
                    <img src={champion.championTeam.flagUrl} alt="" className="w-5 h-5 object-contain" />
                  )}
                  {t("championPickConfirmed")}: <span className="font-extrabold">{champion.championTeam.name}</span>
                  {champion.myPick?.teamId === champion.championTeam.id && (
                    <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80' }}>
                      {t("championBadge")}
                    </span>
                  )}
                </div>
              )}

              {/* My current pick display */}
              {champion.myPick ? (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[12px] text-muted-foreground font-semibold">{t("championPickYourPick")}:</span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
                    {champion.myPick.team.flagUrl && (
                      <img src={champion.myPick.team.flagUrl} alt="" className="w-5 h-5 object-contain rounded-sm" />
                    )}
                    {champion.myPick.team.name}
                  </span>
                </div>
              ) : !champion.isLocked && (
                <p className="text-[12px] text-amber-600 font-semibold mb-3">⚠ {t("championPickNoPick")}</p>
              )}

              {/* Pick selector (only when not locked) */}
              {!champion.isLocked && allTeams.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={pickTeamId}
                    onChange={(e) => setPickTeamId(e.target.value)}
                    className="flex-1 min-h-[36px] px-3 py-1.5 border border-border rounded-lg text-[13px] font-semibold bg-white focus:outline-none focus:border-primary"
                  >
                    <option value="">{t("championPickSelectTeam")}</option>
                    {allTeams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveChampionPick}
                    disabled={!pickTeamId || pickSaving || pickTeamId === champion.myPick?.teamId}
                    className="min-h-[36px] px-4 py-1.5 rounded-lg text-[13px] font-bold text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #2F7D5C, #1a5c40)' }}
                  >
                    {pickSaving ? "..." : t("championPickSave")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Live Match Card(s) */}
          {liveMatches.map((lm) => (
            <div key={lm.id} className="kp-card" style={{ border: '2px solid #DC2626', boxShadow: '0 2px 8px rgba(220,38,38,0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="kp-badge kp-badge-live">
                    {t("matchLive")}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {stageLabel(lm.match.stage, lm.match.groupName)}
                  </span>
                </div>
                <Link href="/matches" className="text-[12px] text-primary font-semibold hover:underline">
                  {t("allMatchesLink")}
                </Link>
              </div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <TeamLogo name={lm.match.homeTeam.name} flagUrl={lm.match.homeTeam.flagUrl} className="w-11 h-11" imageClassName="w-9 h-9" fallbackClassName="text-[28px]" />
                  <span className="text-[14px] font-bold">{lm.match.homeTeam.name}</span>
                </div>
                <div className="text-center">
                  <div className="text-[36px] font-black tracking-wider px-4" style={{ letterSpacing: '3px' }}>
                    {lm.match.homeScore ?? 0} — {lm.match.awayScore ?? 0}
                  </div>
                  <div className="text-[13px] font-semibold text-destructive">
                    {t("inProgressStatus")}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <TeamLogo name={lm.match.awayTeam.name} flagUrl={lm.match.awayTeam.flagUrl} className="w-11 h-11" imageClassName="w-9 h-9" fallbackClassName="text-[28px]" />
                  <span className="text-[14px] font-bold">{lm.match.awayTeam.name}</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <span className="text-[13px] text-muted-foreground">
                  {t("yourPrediction")}
                </span>
                <span className="text-[13px] font-bold text-foreground">
                  {lm.myPrediction 
                    ? `${lm.myPrediction.homeScorePred} — ${lm.myPrediction.awayScorePred} 🤞` 
                    : t("noPrediction")
                  }
                </span>
              </div>
            </div>
          ))}

          {/* Next Match Card */}
          {nextMatch ? (
            <div className="kp-card">
              <div className="flex items-center justify-between mb-4">
                <div className="kp-section-title">
                  {t("nextMatchTitle")}
                </div>
                <span className="kp-badge kp-badge-open">
                  {t("openStatus")}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <TeamLogo name={nextMatch.match.homeTeam.name} flagUrl={nextMatch.match.homeTeam.flagUrl} className="w-11 h-11" imageClassName="w-9 h-9" fallbackClassName="text-[28px]" />
                  <span className="text-[14px] font-bold">{nextMatch.match.homeTeam.name}</span>
                </div>
                <div className="text-[18px] font-bold text-gray-300 px-3">vs</div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <TeamLogo name={nextMatch.match.awayTeam.name} flagUrl={nextMatch.match.awayTeam.flagUrl} className="w-11 h-11" imageClassName="w-9 h-9" fallbackClassName="text-[28px]" />
                  <span className="text-[14px] font-bold">{nextMatch.match.awayTeam.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4 text-[13px] text-muted-foreground">
                <span>
                  📅 {new Date(nextMatch.match.kickoffAt).toLocaleDateString(language === "vi" ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span>
                  ⏰ {new Date(nextMatch.match.kickoffAt).toLocaleTimeString(language === "vi" ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>
                  {stageLabel(nextMatch.match.stage, nextMatch.match.groupName)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold text-amber-600 flex items-center gap-1.5">
                  <Clock size={14} /> {t("locksBeforeKickoff")}
                </div>
                <Link href={`/matches/${nextMatch.id}`}>
                  <button className="kp-btn kp-btn-primary kp-btn-sm" style={{ backgroundColor: '#2F7D5C' }}>
                    {nextMatch.myPrediction ? t("editAction") : t("predictNow")}
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 rounded-lg border border-dashed border-border bg-muted text-muted-foreground bg-white">
              <Calendar className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-[14px]">
                {t("noUpcomingOpen")}
              </p>
            </div>
          )}

          {/* Recent Results */}
          <div className="kp-card">
            <div className="flex items-center justify-between mb-3">
              <div className="kp-section-title">
                {t("recentResults")}
              </div>
              <Link href="/predictions" className="text-[12px] text-primary font-semibold hover:underline">
                {t("predictionHistoryLink")}
              </Link>
            </div>
            <div className="flex flex-col gap-2.5 mt-3">
              {scoredMatches.length > 0 ? scoredMatches.map((lm) => {
                const pts = lm.myPrediction?.points ?? 0;
                const type = lm.myPrediction?.resultType;
                const isExact = type === "EXACT_SCORE";
                const isCorrect = type === "CORRECT_RESULT";
                const scoreStr = `${lm.match.homeScore}–${lm.match.awayScore}`;
                const pickStr = `${lm.myPrediction?.homeScorePred}–${lm.myPrediction?.awayScorePred}`;

                return (
                  <div key={lm.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                    <div>
                      <div className="text-[14px] font-semibold">{lm.match.homeTeam.name} vs {lm.match.awayTeam.name}</div>
                      <div className="text-[13px] text-muted-foreground mt-px">
                        {t("recentResultsScoreAndPick").replace("{score}", scoreStr).replace("{pick}", pickStr)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[13px] font-bold px-2.5 py-0.5 rounded-md ${isExact ? 'kp-pts-exact' : isCorrect ? 'kp-pts-correct' : 'kp-pts-wrong'}`}>
                        +{pts} {t("pointsWord")}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                        {isExact 
                          ? t("exactScoreBadge") 
                          : isCorrect 
                            ? t("correctResultBadge") 
                            : t("wrongScoreBadge")
                        }
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-[12px] text-muted-foreground text-center py-4">
                  {t("noRecentPredictions")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Column ─── */}
        <div className="flex flex-col gap-5">

          {/* Fun Badges & Milestones */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <h3 className="text-[16px] font-bold text-foreground flex items-center gap-1.5">
                <Award size={18} className="text-primary-strong" style={{ color: '#2F7D5C' }} />
                {t("badgesAchievements")}
              </h3>
            </div>
            
            <div className="space-y-3">
              {/* Badge 1: Oracle */}
              <div className={`flex items-center gap-3.5 p-3 rounded-lg border transition-all ${
                myScore && myScore.exactMatches > 0 
                  ? 'bg-amber-50/50 border-amber-200 shadow-[0_4px_12px_rgba(245,158,11,0.05)]' 
                  : 'bg-muted/30 border-border opacity-65'
              }`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  myScore && myScore.exactMatches > 0 
                    ? 'bg-amber-100 text-amber-600 border border-amber-200' 
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  <Target size={20} className={myScore && myScore.exactMatches > 0 ? "animate-pulse" : ""} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="text-[13px] font-bold text-foreground block">
                      {t("badgeOracleTitle")}
                    </strong>
                    {myScore && myScore.exactMatches > 0 ? (
                      <span className="text-[10px] text-amber-700 bg-amber-100 font-extrabold px-1.5 py-0.5 rounded-md border border-amber-200 uppercase tracking-wide">
                        {t("unlocked")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {t("badgeLocked")}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    {t("badgeOracleDesc")}
                  </span>
                </div>
              </div>

              {/* Badge 2: Sharp Eye */}
              <div className={`flex items-center gap-3.5 p-3 rounded-lg border transition-all ${
                myScore && myScore.correctResults > 0 
                  ? 'bg-blue-50/50 border-blue-200 shadow-[0_4px_12px_rgba(59,130,246,0.05)]' 
                  : 'bg-muted/30 border-border opacity-65'
              }`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  myScore && myScore.correctResults > 0 
                    ? 'bg-blue-100 text-blue-600 border border-blue-200' 
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  <Trophy size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="text-[13px] font-bold text-foreground block">
                      {t("badgeSharpEyeTitle")}
                    </strong>
                    {myScore && myScore.correctResults > 0 ? (
                      <span className="text-[10px] text-blue-700 bg-blue-100 font-extrabold px-1.5 py-0.5 rounded-md border border-blue-200 uppercase tracking-wide">
                        {t("unlocked")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {t("badgeLocked")}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    {t("badgeSharpEyeDesc")}
                  </span>
                </div>
              </div>

              {/* Badge 3: Master Predictor */}
              <div className={`flex items-center gap-3.5 p-3 rounded-lg border transition-all ${
                myScore && myScore.totalPoints >= 10 
                  ? 'bg-emerald-50/50 border-emerald-200 shadow-[0_4px_12px_rgba(16,185,129,0.05)]' 
                  : 'bg-muted/30 border-border opacity-65'
              }`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  myScore && myScore.totalPoints >= 10 
                    ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' 
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  <Star size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="text-[13px] font-bold text-foreground block">
                      {t("badgeMasterTitle")}
                    </strong>
                    {myScore && myScore.totalPoints >= 10 ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wide">
                        {t("unlocked")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {t("badgeLocked")}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    {t("badgeMasterDesc")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Leaderboard */}
          <div className="kp-card">
            <div className="flex items-center justify-between">
              <div className="kp-section-title">
                {t("leaderboard")}
              </div>
              <span className="text-[12px] text-muted-foreground">
                {leaderboard.length} {t("playersLabel")}
              </span>
            </div>
            <div className="flex flex-col mt-3">
              {leaderboard.slice(0, 5).map((item, index) => {
                const isMe = item.nickname === myNickname;
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isMe ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'}`}>
                    <span className="text-[16px] w-6 text-center font-black" style={{ color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#cbd5e1' }}>
                      {index + 1}
                    </span>
                    <span className={`flex-1 text-[14px] ${isMe ? 'font-bold' : 'font-medium'}`}>{item.nickname}</span>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        {isMe && <span className="text-[9px] font-bold bg-green-200 text-green-800 px-1.5 py-px rounded uppercase tracking-wider">{t("youLabel")}</span>}
                        <span className={`text-[15px] font-black ${index === 0 ? 'text-[#2F7D5C]' : 'text-foreground'}`}>
                          {item.totalPoints} <span className="text-[11px] font-medium text-muted-foreground">{t("pointsWord")}</span>
                        </span>
                      </div>
                      {index > 0 && leaderboard[0]?.totalPoints > item.totalPoints && (
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {t("behindLeaderText").replace("{diff}", String(leaderboard[0].totalPoints - item.totalPoints))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {leaderboard.length === 0 && (
                <p className="text-[12px] text-muted-foreground py-3 text-center">
                  {t("noLeaderboardRecords")}
                </p>
              )}
            </div>
            <Link href="/leaderboard" className="block text-center mt-3 text-[13px] text-primary font-semibold py-2 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors">
              {t("viewStandings")}
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="kp-card" style={{ padding: '16px 20px' }}>
            <div className="kp-section-title mb-3">
              {t("quickActions")}
            </div>
            <div className="flex flex-col gap-2">
              {[
                { href: '/matches', icon: '📅', label: t("viewMatchList") },
                { href: '/predictions', icon: '🎯', label: t("myPredictionsHistory") },
                { href: '/standings', icon: '🏆', label: t("teamStandingsLink") },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] text-gray-700 transition-colors hover:bg-gray-50" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <span>{a.icon}</span>
                  {a.label}
                  <ArrowRight size={14} className="ml-auto text-gray-400" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </NavigationShell>
  );
}
