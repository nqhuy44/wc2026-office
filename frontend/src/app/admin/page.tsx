"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { 
  ShieldAlert, 
  RefreshCw, 
  Plus, 
  UserPlus, 
  Play, 
  CheckCircle, 
  Building, 
  Settings, 
  Download, 
  FileText,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Lock,
  Calendar,
  Search,
  Eye
} from "lucide-react";

interface Participant {
  id: string;
  nickname: string;
  role: string;
  confirmationStatus: string;
  username: string;
  displayName: string;
  isActive: boolean;
}

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
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: Team;
  awayTeam: Team;
  status: string;
}

interface LeagueMatch {
  id: string;
  status: string;
  isPredictionEnabled: boolean;
  lockAt: string | null;
  match: Match;
}

interface AdminSettings {
  predictionLockMinutes: number;
}

interface TeamSimple {
  id: string;
  name: string;
  shortName: string | null;
  flagUrl: string | null;
}

interface AdminPrediction {
  id: string;
  homeScorePred: number;
  awayScorePred: number;
  points: number;
  resultType: string;
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    nickname: string;
    username: string;
    displayName: string;
  };
}

interface MissingPredictionMember {
  id: string;
  nickname: string;
  role: string;
  username: string;
  displayName: string;
}

const TEAM_FLAG_FALLBACK: Record<string, string> = {
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  "Bosnia-Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  Czechia: "🇨🇿",
  Curaçao: "🇨🇼",
  Ecuador: "🇪🇨",
  Germany: "🇩🇪",
  Haiti: "🇭🇹",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Paraguay: "🇵🇾",
  Qatar: "🇶🇦",
  Scotland: "🏴",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Switzerland: "🇨🇭",
  Turkey: "🇹🇷",
  "United States": "🇺🇸",
};

function toDatetimeLocalValue(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function TeamLogo({ team, align = "left" }: { team: Team; align?: "left" | "right" }) {
  const fallback = TEAM_FLAG_FALLBACK[team.name] ?? team.shortName?.slice(0, 2).toUpperCase() ?? team.name.slice(0, 2).toUpperCase();

  if (team.flagUrl) {
    return (
      <span className="w-7 h-7 rounded-full border border-border bg-white shadow-sm overflow-hidden grid place-items-center shrink-0">
        <img
          src={team.flagUrl}
          alt={`${team.name} logo`}
          className="w-5 h-5 object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-label={`${team.name} logo`}
      className={`w-7 h-7 rounded-full border border-border bg-white shadow-sm grid place-items-center shrink-0 text-[16px] leading-none ${
        align === "right" ? "order-2" : ""
      }`}
    >
      {fallback}
    </span>
  );
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
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

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Create participant form state
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<"PLAYER" | "ADMIN">("PLAYER");
  const [creating, setCreating] = useState(false);

  // Manual score input state
  const [scoreState, setScoreState] = useState<Record<string, { home: number | ""; away: number | "" }>>({});
  const [scoringId, setScoringId] = useState<string | null>(null);

  // Match management state
  const [matchFilter, setMatchFilter] = useState<"all" | "open" | "closed" | "done">("all");
  const [matchSearchQuery, setMatchSearchQuery] = useState("");
  const [togglingMatchId, setTogglingMatchId] = useState<string | null>(null);
  const [predictionLockMinutes, setPredictionLockMinutes] = useState(15);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [allTeams, setAllTeams] = useState<TeamSimple[]>([]);
  const [championTeam, setChampionTeam] = useState<TeamSimple | null>(null);
  const [championTeamId, setChampionTeamId] = useState<string>("");
  const [championSaving, setChampionSaving] = useState(false);
  const [championPickLockAt, setChampionPickLockAt] = useState("");
  const [championPickLocked, setChampionPickLocked] = useState(false);
  const [championPickLockSaving, setChampionPickLockSaving] = useState(false);
  const [selectedPredictionMatch, setSelectedPredictionMatch] = useState<LeagueMatch | null>(null);
  const [adminPredictions, setAdminPredictions] = useState<AdminPrediction[]>([]);
  const [missingPredictionMembers, setMissingPredictionMembers] = useState<MissingPredictionMember[]>([]);
  const [loadingAdminPredictions, setLoadingAdminPredictions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [partsData, matchesData, settingsData, champData, teamsData] = await Promise.all([
        apiClient<{ participants: Participant[] }>("/admin/participants"),
        apiClient<{ matches: LeagueMatch[] }>("/matches?all=true"),
        apiClient<{ settings: AdminSettings }>("/admin/settings"),
        apiClient<{ myPick: null; championTeam: TeamSimple | null; lockAt: string; isLocked: boolean }>("/champion-pick").catch(() => null),
        apiClient<{ teams: TeamSimple[] }>("/teams").catch(() => ({ teams: [] })),
      ]);
      setParticipants(partsData.participants);
      setMatches(matchesData.matches);
      setPredictionLockMinutes(settingsData.settings.predictionLockMinutes);
      setAllTeams(teamsData.teams);
      if (champData?.championTeam) {
        setChampionTeam(champData.championTeam);
        setChampionTeamId(champData.championTeam.id);
      }
      if (champData?.lockAt) {
        setChampionPickLockAt(toDatetimeLocalValue(champData.lockAt));
        setChampionPickLocked(champData.isLocked);
      }

      // Initialize manual score inputs
      const initialScores: Record<string, { home: number | ""; away: number | "" }> = {};
      matchesData.matches.forEach((lm) => {
        initialScores[lm.match.id] = {
          home: lm.match.homeScore ?? "",
          away: lm.match.awayScore ?? "",
        };
      });
      setScoreState(initialScores);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const data = await apiClient<{ message: string }>("/admin/sync-matches", { method: "POST" });
      setSyncMsg(data.message);
      loadData(); // reload to get new matches
    } catch (err: any) {
      setSyncMsg(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setCreating(true);
    try {
      const data = await apiClient<{ participant: Participant; message: string }>("/admin/participants", {
        method: "POST",
        json: { 
          username: username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''), 
          nickname: nickname.trim() || undefined, 
          role 
        },
      });
      setParticipants((prev) => [data.participant, ...prev]);
      setUsername("");
      setNickname("");
      alert(data.message || t("memberSuccessAdded"));
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleConfirmation = async (memberId: string) => {
    try {
      const data = await apiClient<{ participant: { confirmationStatus: string }; message: string }>(
        `/admin/participants/${memberId}/toggle-confirmation`,
        { method: "PUT" }
      );
      setParticipants(prev => prev.map(p => p.id === memberId ? { ...p, confirmationStatus: data.participant.confirmationStatus } : p));
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    }
  };

  const handleChangeMemberRole = async (member: Participant) => {
    const nextRole = member.role === "ADMIN" ? "PLAYER" : "ADMIN";
    const confirmKey = nextRole === "ADMIN" ? "promoteToLeagueAdminConfirm" : "demoteFromLeagueAdminConfirm";
    if (!confirm(t(confirmKey as any).replace("{name}", member.nickname))) return;

    try {
      const data = await apiClient<{ participant: Participant; message: string }>(`/admin/participants/${member.id}/role`, {
        method: "PUT",
        json: { role: nextRole }
      });
      setParticipants((prev) => prev.map((p) => p.id === member.id ? { ...p, role: data.participant.role } : p));
      alert(t("leagueRoleChangedAlert").replace("{name}", member.nickname).replace("{role}", data.participant.role));
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    }
  };

  const handleResetPasscode = async (memberId: string, name: string) => {
    if (!confirm(t("resetPasscodeConfirm").replace("{name}", name))) return;
    try {
      const data = await apiClient<{ passcode: string; nickname: string }>(`/admin/participants/${memberId}/reset-passcode`, { method: "POST" });
      alert(t("newPasscodeGenerated").replace("{name}", data.nickname).replace("{passcode}", data.passcode));
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    }
  };

  const handleRemoveParticipant = async (memberId: string, name: string) => {
    const confirmation = t("confirmRemove").replace("{name}", name);
      
    if (!confirm(confirmation)) return;
    try {
      const data = await apiClient<{ message: string }>(`/admin/participants/${memberId}`, { method: "DELETE" });
      setParticipants(prev => prev.filter(p => p.id !== memberId));
      alert(data.message || t("memberRemoved"));
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    }
  };

  const handleScoreChange = (matchId: string, side: "home" | "away", value: string) => {
    setScoreState((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: value === "" ? "" : Number(value),
      },
    }));
  };

  const handleManualScoreSubmit = async (matchId: string) => {
    const vals = scoreState[matchId];
    if (!vals || vals.home === "" || vals.away === "") return;

    setScoringId(matchId);
    try {
      await apiClient<{ message: string }>(`/admin/matches/${matchId}/score`, {
        method: "PUT",
        json: {
          homeScore: Number(vals.home),
          awayScore: Number(vals.away),
        },
      });
      alert(t("scoreSubmitted"));
      loadData(); // Reload to refresh statuses
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setScoringId(null);
    }
  };

  const handleSaveChampionTeam = async () => {
    setChampionSaving(true);
    try {
      const data = await apiClient<{ championTeam: TeamSimple | null }>("/admin/champion-team", {
        method: "PUT",
        json: { teamId: championTeamId || null }
      });
      setChampionTeam(data.championTeam);
      alert(t("adminChampionSaved"));
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setChampionSaving(false);
    }
  };

  const handleSaveChampionPickLock = async (lockAtInput = championPickLockAt) => {
    if (!lockAtInput) return;
    setChampionPickLockSaving(true);
    try {
      const data = await apiClient<{ lockAt: string; isLocked: boolean; message: string }>("/admin/champion-pick-lock", {
        method: "PUT",
        json: { lockAt: new Date(lockAtInput).toISOString() }
      });
      setChampionPickLockAt(toDatetimeLocalValue(data.lockAt));
      setChampionPickLocked(data.isLocked);
      alert(data.message || t("adminChampionPickLockSaved"));
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setChampionPickLockSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const data = await apiClient<{ settings: AdminSettings; message: string }>("/admin/settings", {
        method: "PUT",
        json: {
          predictionLockMinutes: Number(predictionLockMinutes)
        }
      });
      setPredictionLockMinutes(data.settings.predictionLockMinutes);
      alert(data.message || t("settingsSaved"));
      await loadData();
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleOpenAdminPredictions = async (leagueMatch: LeagueMatch) => {
    setSelectedPredictionMatch(leagueMatch);
    setLoadingAdminPredictions(true);
    setAdminPredictions([]);
    setMissingPredictionMembers([]);
    try {
      const data = await apiClient<{ predictions: AdminPrediction[]; missingMembers: MissingPredictionMember[] }>(`/admin/matches/${leagueMatch.id}/predictions`);
      setAdminPredictions(data.predictions);
      setMissingPredictionMembers(data.missingMembers);
    } catch (err: any) {
      alert(err.code ? t(err.code as any) : t("errUnknown"));
      setSelectedPredictionMatch(null);
    } finally {
      setLoadingAdminPredictions(false);
    }
  };

  const resultBadgeText = (resultType: string) => {
    if (resultType === "EXACT_SCORE") return t("exactPeerBadge");
    if (resultType === "CORRECT_RESULT") return t("correctPeerBadge");
    if (resultType === "WRONG") return t("wrongPeerBadge");
    return t("pendingStatus");
  };

  const now = Date.now();
  const fallbackLiveWindowMs = 3 * 60 * 60 * 1000;
  const isManualScoreEligible = (lm: LeagueMatch) => {
    const hasProviderFinalState = ["FINISHED", "SCORED"].includes(lm.match.status);
    const fallbackEnded = new Date(lm.match.kickoffAt).getTime() + fallbackLiveWindowMs <= now;
    const hasMissingScore = lm.match.homeScore === null || lm.match.awayScore === null;

    return (
      lm.isPredictionEnabled &&
      lm.status !== "LIVE" &&
      lm.status !== "SCORED" &&
      lm.status !== "VOID" &&
      hasMissingScore &&
      (hasProviderFinalState || fallbackEnded)
    );
  };
  const needingScoring = matches.filter(
    (lm) => isManualScoreEligible(lm)
  );
  const scoreRows = matches.filter(
    (lm) => isManualScoreEligible(lm)
  );
  const predictionReviewMatches = matches.filter(
    (lm) => lm.isPredictionEnabled && !["SCHEDULED", "VOID"].includes(lm.status)
  );
  const selectedPredictionMatchHasStarted = selectedPredictionMatch
    ? ["LIVE", "FINISHED", "SCORED", "VOID"].includes(selectedPredictionMatch.status) ||
      new Date(selectedPredictionMatch.match.kickoffAt).getTime() <= now
    : false;
  const missingPredictionStatusLabel = selectedPredictionMatchHasStarted
    ? t("didNotPredictStatus")
    : t("notPredictedStatus");

  if (loading) {
    return (
      <NavigationShell>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>
            {t("loadingAdminSettings")}
          </p>
        </div>
      </NavigationShell>
    );
  }

  return (
    <NavigationShell>
      <div className="space-y-6">
        
        {/* Render content based on activeTab */}
        
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <article className="bg-card border border-border rounded-lg p-5 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
                <span className="text-muted-foreground text-[13px] block">
                  {t("players")}
                </span>
                <strong className="text-[28px] font-black block mt-1">{participants.length}</strong>
              </article>
              <article className="bg-card border border-border rounded-lg p-5 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
                <span className="text-muted-foreground text-[13px] block">
                  {t("needResult")}
                </span>
                <strong className="text-[28px] font-black block mt-1 text-accent" style={{ color: '#E65100' }}>{needingScoring.length}</strong>
              </article>
              <article className="bg-card border border-border rounded-lg p-5 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
                <span className="text-muted-foreground text-[13px] block">
                  {t("totalFixtures")}
                </span>
                <strong className="text-[28px] font-black block mt-1">{matches.length}</strong>
              </article>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <article className="bg-card border border-border rounded-lg p-6 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
                <h3 className="text-[17px] font-bold text-foreground mb-4">
                  {t("adminChecklist")}
                </h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-foreground">
                      {t("setupCompany")}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-primary/20 bg-[#e7f2eb] text-primary-strong text-[11px] font-extrabold uppercase">
                      {t("done")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-foreground">
                      {t("generatePlayerCodes")}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-primary/20 bg-[#e7f2eb] text-primary-strong text-[11px] font-extrabold uppercase">
                      {t("done")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-foreground">
                      {t("importFixtures")}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-primary/20 bg-[#e7f2eb] text-primary-strong text-[11px] font-extrabold uppercase">
                      {t("done")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-foreground">
                      {t("reviewLockTimes")}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-extrabold uppercase">
                      {t("review")}
                    </span>
                  </div>
                </div>
              </article>

              <article className="bg-card border border-border rounded-lg p-6 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
                <h3 className="text-[17px] font-bold text-foreground mb-4">
                  {t("matchesNeedingResult")}
                </h3>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {needingScoring.map((lm) => (
                    <div key={lm.id} className="flex justify-between items-center p-3 bg-muted border border-border rounded text-[13px] bg-gray-50">
                      <strong>{lm.match.homeTeam.name} vs {lm.match.awayTeam.name}</strong>
                      <span className="text-muted-foreground text-[11px] font-extrabold uppercase bg-amber-100 px-2 py-0.5 rounded border border-amber-200 text-amber-800">
                        {t("inputScore")}
                      </span>
                    </div>
                  ))}
                  {needingScoring.length === 0 && (
                    <p className="text-[13px] text-muted-foreground text-center py-6">
                      {t("allMatchesScored")}
                    </p>
                  )}
                </div>
              </article>
            </div>
          </div>
        )}

        {activeTab === "players" && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <article className="bg-card border border-border rounded-lg p-6 shadow-[0_12px_30px_rgba(31,41,55,0.08)] h-fit bg-white">
              <h3 className="text-[17px] font-bold text-foreground mb-4 flex items-center gap-1.5 border-b border-border pb-3">
                <UserPlus size={18} />
                {t("addMember")}
              </h3>
              <form onSubmit={handleCreateParticipant} className="space-y-4">
                <div className="grid gap-1.5">
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    {t("usernameRequired")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. huy_devo"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-border rounded-lg text-foreground outline-none focus:border-primary transition-all text-xs"
                  />
                  <span className="text-[10px] text-gray-400">
                    {t("addMemberHelp")}
                  </span>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    {t("memberNickname")}
                  </label>
                  <input
                    type="text"
                    placeholder="Nick name"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-border rounded-lg text-foreground outline-none focus:border-primary transition-all text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    {t("memberRole")}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-border rounded-lg text-foreground outline-none focus:border-primary transition-all text-xs"
                  >
                    <option value="PLAYER">{t("rolePlayer")}</option>
                    <option value="ADMIN">{t("roleAdmin")}</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-primary hover:bg-primary-strong text-white font-extrabold py-2.5 rounded-lg transition-all text-[13px] flex items-center justify-center gap-1.5 shadow-sm"
                  style={{ backgroundColor: '#2F7D5C' }}
                >
                  <Plus size={14} />
                  {creating ? t("memberLoading") : t("memberBtn")}
                </button>
              </form>
            </article>

            <article className="bg-card border border-border rounded-lg shadow-[0_12px_30px_rgba(31,41,55,0.08)] overflow-hidden bg-white">
              <div className="p-6 border-b border-border bg-[linear-gradient(180deg,rgba(47,125,92,0.02),transparent)]">
                <h3 className="text-[17px] font-bold text-foreground">
                  {t("membersDir")}
                </h3>
                <p className="text-muted-foreground text-[13px] mt-0.5">
                  {t("membersSub")}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/65 text-muted-foreground font-extrabold uppercase tracking-wider text-[11px] bg-gray-50">
                      <th className="px-6 py-4">{t("colNickname")}</th>
                      <th className="px-6 py-4">{t("colAccount")}</th>
                      <th className="px-6 py-4">{t("colRole")}</th>
                      <th className="px-6 py-4">{t("colConfirmation")}</th>
                      <th className="px-6 py-4 text-right pr-8">{t("colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {participants.map((p) => (
                      <tr key={p.id} className="hover:bg-[#fcfbf7] transition-all">
                        <td className="px-6 py-4 font-bold text-foreground">{p.nickname}</td>
                        <td className="px-6 py-4">
                          <div className="text-[13px] font-semibold text-gray-800">@{p.username}</div>
                          <div className="text-[11px] text-gray-400">{p.displayName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            p.role === "ADMIN" 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                              : "bg-gray-100 border-gray-200 text-muted-foreground"
                          }`}>
                            {p.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleConfirmation(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all ${
                              p.confirmationStatus === "CONFIRMED"
                                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            {p.confirmationStatus === "CONFIRMED" 
                              ? t("btnConfirmed") 
                              : t("btnUnconfirmed")
                            }
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right pr-8">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleChangeMemberRole(p)}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors py-1 px-2 hover:bg-emerald-50 rounded"
                            >
                              {p.role === "ADMIN" ? t("demoteLeagueAdminBtn") : t("promoteLeagueAdminBtn")}
                            </button>
                            <button
                              onClick={() => handleResetPasscode(p.id, p.nickname)}
                              className="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors py-1 px-2 hover:bg-amber-50 rounded"
                            >
                              {t("resetPasscodeBtn")}
                            </button>
                            <button
                              onClick={() => handleRemoveParticipant(p.id, p.nickname)}
                              className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors py-1 px-2 hover:bg-red-50 rounded"
                            >
                              {t("btnRemove")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {participants.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t("noMembers")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activeTab === "companies" && (
          <article className="bg-card border border-border rounded-lg p-6 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
            <h3 className="text-[17px] font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Building size={18} className="text-primary-strong" />
              {t("companyProfilesTitle")}
            </h3>
            <p className="text-muted-foreground text-[13px] mb-4">{t("companyProfilesDesc")}</p>
            <div className="p-4 bg-muted border border-border rounded text-[13px] leading-relaxed text-muted-foreground">
              {t("companyProfileActive").replace("{company}", "Acme VN")}
            </div>
          </article>
        )}

        {activeTab === "matches" && (
          <div className="space-y-6">
            {/* Sync Section */}
            <article className="bg-card border border-border rounded-lg p-6 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
              <h3 className="text-[17px] font-bold text-foreground mb-2 flex items-center gap-1.5">
                <RefreshCw size={18} className="text-primary-strong" style={{ color: '#2F7D5C' }} />
                {t("syncData")}
              </h3>
              <p className="text-muted-foreground text-[13px] mb-4">
                {t("syncSub")}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="min-h-[38px] px-4 py-2 bg-primary hover:bg-primary-strong text-white font-extrabold rounded transition-all text-[13px] flex items-center gap-1.5"
                  style={{ backgroundColor: '#2F7D5C' }}
                >
                  <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                  {syncing ? t("syncing") : t("syncBtn")}
                </button>
                {syncMsg && (
                  <span className="text-[13px] text-primary-strong bg-[#e7f2eb] border border-[#c9e3d2] px-3 py-1.5 rounded font-bold" style={{ color: '#2F7D5C', backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }}>
                    {syncMsg}
                  </span>
                )}
              </div>
            </article>

            {/* Match Management Table */}
            <article className="bg-card border border-border rounded-lg shadow-[0_12px_30px_rgba(31,41,55,0.08)] overflow-hidden bg-white">
              <div className="p-6 border-b border-border bg-[linear-gradient(180deg,rgba(47,125,92,0.02),transparent)]">
                <h3 className="text-[17px] font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <Calendar size={18} className="text-primary-strong" style={{ color: '#2F7D5C' }} />
                  {t("adminMatchManagement")}
                </h3>
                <p className="text-muted-foreground text-[13px] mt-0.5">
                  {t("adminMatchManagementSub")}
                </p>
              </div>

              {/* Filters */}
              <div className="px-6 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex gap-1.5 max-w-full overflow-x-auto pb-1">
                  {(["all", "open", "closed", "done"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setMatchFilter(f)}
                      className={`flex-none whitespace-nowrap px-3 py-1.5 text-[12px] font-bold rounded-lg border transition-all ${
                        matchFilter === f
                          ? "border-[#2F7D5C] bg-[#E8F5E9] text-[#2F7D5C]"
                          : "border-border bg-white text-muted-foreground hover:bg-gray-50"
                      }`}
                    >
                      {f === "all"
                        ? t("allMatchesFilter")
                        : f === "open"
                          ? t("openOnlyFilter")
                          : f === "done"
                            ? t("done")
                            : t("closedOnlyFilter")}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={matchSearchQuery}
                    onChange={(e) => setMatchSearchQuery(e.target.value)}
                    placeholder="Search teams..."
                    className="w-full text-[12px] border border-border rounded-lg pl-8 pr-3 py-2 bg-white text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold ml-auto">
                  {t("matchCount").replace("{count}", String(matches.filter((lm) => {
                    if (matchFilter === "open") return lm.isPredictionEnabled && !["LIVE", "FINISHED", "SCORED", "VOID"].includes(lm.status);
                    if (matchFilter === "closed") return !lm.isPredictionEnabled && !["LIVE", "FINISHED", "SCORED", "VOID"].includes(lm.status);
                    if (matchFilter === "done") return ["LIVE", "FINISHED", "SCORED", "VOID"].includes(lm.status);
                    return true;
                  }).filter((lm) => {
                    if (!matchSearchQuery) return true;
                    const q = matchSearchQuery.toLowerCase();
                    return lm.match.homeTeam.name.toLowerCase().includes(q) || lm.match.awayTeam.name.toLowerCase().includes(q);
                  }).length))}
                </span>
              </div>

              {matches.length === 0 ? (
                <p className="text-center text-[13px] text-muted-foreground py-12">
                  {t("noMatchesInLeague")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-left border-collapse text-[13px]">
                    <colgroup>
                      <col className="w-[160px]" />
                      <col />
                      <col className="w-[160px]" />
                      <col className="w-[180px]" />
                      <col className="w-[210px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border bg-muted/65 text-muted-foreground font-extrabold uppercase tracking-wider text-[11px] bg-gray-50">
                        <th className="px-6 py-4">{t("stage")}</th>
                        <th className="px-6 py-4">{t("matchInfo")}</th>
                        <th className="px-6 py-4 text-center">{t("kickoff")}</th>
                        <th className="px-6 py-4 text-center">{t("predictionStatus")}</th>
                        <th className="px-6 py-4 text-right pr-8">{t("colActions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {matches
                        .filter((lm) => {
                          if (matchFilter === "open") return lm.isPredictionEnabled && !["LIVE", "FINISHED", "SCORED", "VOID"].includes(lm.status);
                          if (matchFilter === "closed") return !lm.isPredictionEnabled && !["LIVE", "FINISHED", "SCORED", "VOID"].includes(lm.status);
                          if (matchFilter === "done") return ["LIVE", "FINISHED", "SCORED", "VOID"].includes(lm.status);
                          return true;
                        })
                        .filter((lm) => {
                          if (!matchSearchQuery) return true;
                          const q = matchSearchQuery.toLowerCase();
                          return lm.match.homeTeam.name.toLowerCase().includes(q) || lm.match.awayTeam.name.toLowerCase().includes(q);
                        })
                        .map((lm) => {
                          const kickoff = new Date(lm.match.kickoffAt);
                          const isTerminal = ["LIVE", "FINISHED", "SCORED", "VOID"].includes(lm.status);
                          const isLocked = lm.status === "LOCKED";
                          const nowMs = Date.now();
                          const defaultLockMs = kickoff.getTime() - predictionLockMinutes * 60_000;
                          const canTogglePrediction = !isTerminal && !isLocked && defaultLockMs > nowMs && kickoff.getTime() > nowMs;
                          const canUnlockPrediction = isLocked && kickoff.getTime() > nowMs;

                          return (
                            <tr key={lm.id} className="hover:bg-[#fcfbf7] transition-all">
                              <td className="px-6 py-4 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                                {stageLabel(lm.match.stage, lm.match.groupName)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)_auto] items-center gap-3 min-w-[520px]">
                                  <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 min-w-0">
                                    <TeamLogo team={lm.match.homeTeam} />
                                    <span className="font-bold text-foreground truncate">{lm.match.homeTeam.name}</span>
                                  </div>
                                  <span className="text-muted-foreground text-[11px] font-extrabold uppercase text-center">vs</span>
                                  <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 min-w-0">
                                    <TeamLogo team={lm.match.awayTeam} />
                                    <span className="font-bold text-foreground truncate">{lm.match.awayTeam.name}</span>
                                  </div>
                                  {lm.match.homeScore !== null && (
                                    <span className="text-[11px] font-extrabold text-muted-foreground bg-gray-100 px-2 py-1 rounded justify-self-end whitespace-nowrap">
                                      {lm.match.homeScore} - {lm.match.awayScore}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="text-[12px] font-medium text-foreground">
                                  {kickoff.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit" })}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {kickoff.toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {lm.status === "SCORED" ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-primary/20 bg-[#e7f2eb] text-[11px] font-extrabold uppercase" style={{ color: '#2F7D5C', backgroundColor: '#E8F5E9' }}>
                                      {t("processed")}
                                    </span>
                                  ) : isLocked ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-extrabold uppercase">
                                      <Lock size={11} />
                                      LOCKED
                                    </span>
                                  ) : isTerminal ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 text-[11px] font-extrabold uppercase">
                                      {lm.status}
                                    </span>
                                  ) : lm.isPredictionEnabled ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-[11px] font-extrabold uppercase">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                      {t("predictionOpen")}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 text-[11px] font-extrabold uppercase">
                                      {t("predictionClosed")}
                                    </span>
                                  )}
                                  {lm.lockAt && lm.isPredictionEnabled && !isTerminal && (
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                      {t("locksAt")} {new Date(lm.lockAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right pr-8">
                                {isTerminal || (!canTogglePrediction && !canUnlockPrediction) ? (
                                  <span className="text-[11px] text-muted-foreground font-medium">—</span>
                                ) : (
                                  <div className="inline-flex items-center justify-end gap-2">
                                    {isLocked && canUnlockPrediction ? (
                                      <button
                                        onClick={async () => {
                                          setTogglingMatchId(lm.id);
                                          try {
                                            const data = await apiClient<{ leagueMatch: LeagueMatch }>(`/admin/matches/${lm.id}/unlock-prediction`, {
                                              method: "PUT"
                                            });
                                            setMatches((prev) =>
                                              prev.map((m) =>
                                                m.id === lm.id ? { ...m, status: data.leagueMatch.status, lockAt: data.leagueMatch.lockAt } : m
                                              )
                                            );
                                          } catch (err: any) {
                                            alert(err.code ? t(err.code as any) : t("errUnknown"));
                                          } finally {
                                            setTogglingMatchId(null);
                                          }
                                        }}
                                        disabled={togglingMatchId === lm.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                                      >
                                        <ToggleLeft size={14} /> Unlock
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={async () => {
                                            setTogglingMatchId(lm.id);
                                            try {
                                              const newState = !lm.isPredictionEnabled;
                                              const data = await apiClient<{ leagueMatch: LeagueMatch }>(`/admin/matches/${lm.id}/toggle-prediction`, {
                                                method: "PUT",
                                                json: { isPredictionEnabled: newState }
                                              });
                                              setMatches((prev) =>
                                                prev.map((m) =>
                                                  m.id === lm.id
                                                    ? { ...m, isPredictionEnabled: newState, status: data.leagueMatch.status, lockAt: data.leagueMatch.lockAt }
                                                    : m
                                                )
                                              );
                                            } catch (err: any) {
                                              alert(err.code ? t(err.code as any) : t("errUnknown"));
                                            } finally {
                                              setTogglingMatchId(null);
                                            }
                                          }}
                                          disabled={togglingMatchId === lm.id}
                                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                                            lm.isPredictionEnabled
                                              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                              : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                          }`}
                                        >
                                          {lm.isPredictionEnabled ? (
                                            <><ToggleRight size={14} /> {t("closePrediction")}</>
                                          ) : (
                                            <><ToggleLeft size={14} /> {t("openPrediction")}</>
                                          )}
                                        </button>
                                        {lm.isPredictionEnabled && lm.status === "OPEN" && (
                                          <button
                                            onClick={async () => {
                                              setTogglingMatchId(lm.id);
                                              try {
                                                const data = await apiClient<{ leagueMatch: LeagueMatch }>(`/admin/matches/${lm.id}/lock-prediction`, {
                                                  method: "PUT"
                                                });
                                                setMatches((prev) =>
                                                  prev.map((m) =>
                                                    m.id === lm.id ? { ...m, status: data.leagueMatch.status, lockAt: data.leagueMatch.lockAt } : m
                                                  )
                                                );
                                              } catch (err: any) {
                                                alert(err.code ? t(err.code as any) : t("errUnknown"));
                                              } finally {
                                                setTogglingMatchId(null);
                                              }
                                            }}
                                            disabled={togglingMatchId === lm.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                                          >
                                            <Lock size={14} /> Lock
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </div>
        )}

        {activeTab === "predictions" && (
          <div className="space-y-6">
            <article className="bg-card border border-border rounded-lg shadow-[0_12px_30px_rgba(31,41,55,0.08)] overflow-hidden bg-white">
              <div className="p-6 border-b border-border bg-[linear-gradient(180deg,rgba(47,125,92,0.02),transparent)]">
                <h3 className="text-[17px] font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <Eye size={18} className="text-primary-strong" style={{ color: '#2F7D5C' }} />
                  {t("adminPredictionsTitle")}
                </h3>
                <p className="text-muted-foreground text-[13px] mt-0.5">
                  {t("adminPredictionsSub")}
                </p>
              </div>

              {predictionReviewMatches.length === 0 ? (
                <p className="text-center text-[13px] text-muted-foreground py-12">
                  {t("noAdminPredictionMatches")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/65 text-muted-foreground font-extrabold uppercase tracking-wider text-[11px] bg-gray-50">
                        <th className="px-6 py-4">{t("stage")}</th>
                        <th className="px-6 py-4">{t("matchInfo")}</th>
                        <th className="px-6 py-4 text-center">{t("kickoff")}</th>
                        <th className="px-6 py-4 text-center">{t("predictionStatus")}</th>
                        <th className="px-6 py-4 text-right pr-8">{t("colActions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {predictionReviewMatches.map((lm) => {
                        const kickoff = new Date(lm.match.kickoffAt);
                        return (
                          <tr key={lm.id} className="hover:bg-[#fcfbf7] transition-all">
                            <td className="px-6 py-4 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                              {stageLabel(lm.match.stage, lm.match.groupName)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="grid grid-cols-[28px_minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 min-w-[420px]">
                                <TeamLogo team={lm.match.homeTeam} />
                                <span className="font-bold text-foreground truncate">{lm.match.homeTeam.name}</span>
                                <TeamLogo team={lm.match.awayTeam} />
                                <span className="font-bold text-foreground truncate">{lm.match.awayTeam.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="text-[12px] font-medium text-foreground">
                                {kickoff.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit" })}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {kickoff.toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold uppercase ${
                                lm.status === "OPEN"
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : lm.status === "LOCKED"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-gray-200 bg-gray-50 text-gray-600"
                              }`}>
                                {lm.status === "OPEN" ? t("predictionOpen") : lm.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right pr-8">
                              <button
                                onClick={() => handleOpenAdminPredictions(lm)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-border bg-white text-foreground hover:bg-gray-50 transition-all"
                              >
                                <Eye size={13} />
                                {t("viewPredictions")}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            {selectedPredictionMatch && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
                <div className="w-full max-w-[860px] bg-white border border-border rounded-lg p-6 shadow-[0_24px_50px_rgba(31,41,55,0.16)] flex flex-col max-h-[90vh]">
                  <div className="flex items-start justify-between border-b border-border pb-3 mb-4 gap-4">
                    <div>
                      <h3 className="text-[17px] font-bold text-foreground">
                        {t("adminPredictionModalTitle")}
                      </h3>
                      <p className="text-muted-foreground text-[13px] mt-0.5">
                        {selectedPredictionMatch.match.homeTeam.name} vs {selectedPredictionMatch.match.awayTeam.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPredictionMatch(null)}
                      className="min-h-[36px] px-3 py-1.5 border border-border rounded font-extrabold hover:bg-gray-50 text-[13px]"
                    >
                      {t("closeModalAction")}
                    </button>
                  </div>

                  {loadingAdminPredictions ? (
                    <div className="flex justify-center py-12">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
                    </div>
                  ) : (
                    <div className="overflow-y-auto flex-1 pr-1 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-green-700">
                            {t("adminPredictedCount")}
                          </div>
                          <div className="text-[24px] font-black text-foreground mt-1">
                            {adminPredictions.length}
                          </div>
                        </div>
                        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                            {t("adminMissingPredictionCount")}
                          </div>
                          <div className="text-[24px] font-black text-foreground mt-1">
                            {missingPredictionMembers.length}
                          </div>
                        </div>
                      </div>

                      <section>
                        <h4 className="text-[13px] font-extrabold text-foreground mb-2">
                          {t("membersPredictedTitle")}
                        </h4>
                        {adminPredictions.length === 0 ? (
                          <p className="text-[13px] text-muted-foreground text-center py-6 border border-border rounded-lg bg-gray-50">
                            {t("noPredictionsFoundForMatch")}
                          </p>
                        ) : (
                          <div className="border border-border rounded-lg overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left border-collapse text-[13px]">
                              <thead>
                                <tr className="border-b border-border bg-gray-50 text-muted-foreground font-extrabold uppercase tracking-wider text-[11px]">
                                  <th className="px-4 py-3">{t("colAccount")}</th>
                                  <th className="px-4 py-3 text-center">{t("theirPickCol")}</th>
                                  <th className="px-4 py-3 text-center">{t("statusCol")}</th>
                                  <th className="px-4 py-3 text-right">{t("pointsCol")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {adminPredictions.map((prediction) => (
                                  <tr key={prediction.id} className="hover:bg-[#fcfbf7]">
                                    <td className="px-4 py-3">
                                      <div className="font-bold text-foreground">{prediction.member.nickname}</div>
                                      <div className="text-[11px] text-muted-foreground">@{prediction.member.username} · {prediction.member.displayName}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-black text-foreground">
                                      {prediction.homeScorePred} - {prediction.awayScorePred}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                        prediction.resultType === "EXACT_SCORE"
                                          ? "bg-amber-50 border-amber-200 text-amber-800"
                                          : prediction.resultType === "CORRECT_RESULT"
                                            ? "bg-green-50 border-green-200 text-green-700"
                                            : prediction.resultType === "WRONG"
                                              ? "bg-gray-100 border-gray-200 text-muted-foreground"
                                              : "bg-blue-50 border-blue-200 text-blue-700"
                                      }`}>
                                        {resultBadgeText(prediction.resultType)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold">
                                      {prediction.resultType === "PENDING" ? "-" : `+${prediction.points}`}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      <section>
                        <h4 className="text-[13px] font-extrabold text-foreground mb-2">
                          {t("membersMissingPredictionTitle")}
                        </h4>
                        {missingPredictionMembers.length === 0 ? (
                          <p className="text-[13px] text-green-700 text-center py-6 border border-green-100 rounded-lg bg-green-50">
                            {t("allMembersPredicted")}
                          </p>
                        ) : (
                          <div className="border border-border rounded-lg overflow-x-auto">
                            <table className="w-full min-w-[560px] text-left border-collapse text-[13px]">
                              <thead>
                                <tr className="border-b border-border bg-gray-50 text-muted-foreground font-extrabold uppercase tracking-wider text-[11px]">
                                  <th className="px-4 py-3">{t("colAccount")}</th>
                                  <th className="px-4 py-3">{t("colRole")}</th>
                                  <th className="px-4 py-3 text-right">{t("statusCol")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {missingPredictionMembers.map((member) => (
                                  <tr key={member.id} className="hover:bg-[#fcfbf7]">
                                    <td className="px-4 py-3">
                                      <div className="font-bold text-foreground">{member.nickname}</div>
                                      <div className="text-[11px] text-muted-foreground">@{member.username} · {member.displayName}</div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground font-bold">
                                      {member.role}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-amber-200 bg-amber-50 text-amber-800">
                                        {missingPredictionStatusLabel}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "results" && (
          <article className="bg-card border border-border rounded-lg shadow-[0_12px_30px_rgba(31,41,55,0.08)] overflow-hidden bg-white">
            <div className="p-6 border-b border-border bg-[linear-gradient(180deg,rgba(47,125,92,0.02),transparent)]">
              <h3 className="text-[17px] font-bold text-foreground mb-1">
                {t("manualScoreTitle")}
              </h3>
              <p className="text-muted-foreground text-[13px] mt-0.5">
                {t("manualScoreSub")}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/65 text-muted-foreground font-extrabold uppercase tracking-wider text-[11px] bg-gray-50">
                    <th className="px-6 py-4">{t("stage")}</th>
                    <th className="px-6 py-4 text-center">{t("teamsAndScoreInputs")}</th>
                    <th className="px-6 py-4 text-right pr-8">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scoreRows.map((lm) => {
                    const homeVal = scoreState[lm.match.id]?.home ?? "";
                    const awayVal = scoreState[lm.match.id]?.away ?? "";
                    const isScored = lm.status === "SCORED";

                    return (
                      <tr key={lm.id} className="hover:bg-[#fcfbf7] transition-all">
                        <td className="px-6 py-4 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                          {stageLabel(lm.match.stage, lm.match.groupName)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-4">
                            <span className="font-extrabold text-foreground w-36 text-right truncate">
                              {lm.match.homeTeam.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                disabled={scoringId === lm.match.id || isScored}
                                value={homeVal}
                                onChange={(e) => handleScoreChange(lm.match.id, "home", e.target.value)}
                                className="w-10 px-2 py-1 bg-white border border-border rounded text-center font-bold text-xs outline-none focus:border-primary"
                              />
                              <span className="text-muted-foreground">-</span>
                              <input
                                type="number"
                                min="0"
                                disabled={scoringId === lm.match.id || isScored}
                                value={awayVal}
                                onChange={(e) => handleScoreChange(lm.match.id, "away", e.target.value)}
                                className="w-10 px-2 py-1 bg-white border border-border rounded text-center font-bold text-xs outline-none focus:border-primary"
                              />
                            </div>
                            <span className="font-extrabold text-foreground w-36 text-left truncate">
                              {lm.match.awayTeam.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right pr-8">
                          {isScored ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-primary/20 bg-[#e7f2eb] text-primary-strong text-[11px] font-extrabold uppercase" style={{ color: '#2F7D5C', backgroundColor: '#E8F5E9' }}>
                              {t("processed")}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleManualScoreSubmit(lm.match.id)}
                              disabled={scoringId === lm.match.id || homeVal === "" || awayVal === ""}
                              className="min-h-[32px] px-3.5 py-1 bg-primary hover:bg-primary-strong text-white font-extrabold rounded transition-all text-xs disabled:opacity-50"
                              style={{ backgroundColor: '#2F7D5C' }}
                            >
                              {scoringId === lm.match.id ? t("saving") : t("saveAndScore")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {scoreRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-muted-foreground">
                        {t("allMatchesScored")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        )}

        {activeTab === "settings" && (
          <article className="bg-card border border-border rounded-lg p-6 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
            <h3 className="text-[17px] font-bold text-foreground mb-4 flex items-center gap-1.5">
              <Settings size={18} className="text-primary-strong" style={{ color: '#2F7D5C' }} />
              {t("generalSettings")}
            </h3>
            <div className="space-y-4 text-[13px]">
              <div className="grid gap-1.5 max-w-sm">
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  {t("lockTimingOffset")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={predictionLockMinutes}
                  onChange={(e) => setPredictionLockMinutes(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 py-2 bg-white border border-border rounded text-foreground outline-none text-xs focus:border-primary"
                />
              </div>
              <p className="text-muted-foreground text-[12px]">
                {t("lockTimingHelpText")}
              </p>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={settingsSaving || !Number.isFinite(predictionLockMinutes) || predictionLockMinutes < 0}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-2 bg-primary hover:bg-primary-strong text-white font-extrabold rounded transition-all text-[13px] disabled:opacity-50"
                style={{ backgroundColor: '#2F7D5C' }}
              >
                <CheckCircle size={14} />
                {settingsSaving ? t("saving") : t("saveSettings")}
              </button>

              {/* ─── Champion Pick Lock ─── */}
              <div className="border-t border-border pt-5 mt-2">
                <h4 className="text-[13px] font-extrabold text-foreground mb-1 flex items-center gap-1.5">
                  🔒 {t("adminChampionPickLockTitle")}
                </h4>
                <p className="text-[12px] text-muted-foreground mb-3">{t("adminChampionPickLockSub")}</p>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="grid gap-1.5 max-w-sm flex-1">
                    <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t("adminChampionPickLockAt")}
                    </label>
                    <input
                      type="datetime-local"
                      value={championPickLockAt}
                      onChange={(e) => setChampionPickLockAt(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-2 bg-white border border-border rounded text-foreground outline-none text-xs focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveChampionPickLock()}
                      disabled={championPickLockSaving || !championPickLockAt}
                      className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-2 bg-primary hover:bg-primary-strong text-white font-extrabold rounded transition-all text-[13px] disabled:opacity-50"
                      style={{ backgroundColor: '#2F7D5C' }}
                    >
                      <CheckCircle size={14} />
                      {championPickLockSaving ? t("saving") : t("adminChampionPickLockSave")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveChampionPickLock(toDatetimeLocalValue(new Date()))}
                      disabled={championPickLockSaving}
                      className="min-h-[38px] px-4 py-2 rounded border border-amber-200 bg-amber-50 text-amber-700 text-[13px] font-extrabold disabled:opacity-50"
                    >
                      {t("adminChampionPickLockNow")}
                    </button>
                  </div>
                </div>
                <div className={`mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold uppercase ${
                  championPickLocked
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-green-50 border-green-200 text-green-700"
                }`}>
                  {championPickLocked ? t("championPickLocked") : t("predictionOpen")}
                </div>
              </div>

              {/* ─── Champion Team ─── */}
              <div className="border-t border-border pt-5 mt-2">
                <h4 className="text-[13px] font-extrabold text-foreground mb-1 flex items-center gap-1.5">
                  🏆 {t("adminSetChampion")}
                </h4>
                <p className="text-[12px] text-muted-foreground mb-3">{t("adminSetChampionSub")}</p>
                {championTeam && (
                  <div className="flex items-center gap-2 mb-3 text-[13px] font-bold" style={{ color: '#F57F17' }}>
                    {championTeam.flagUrl && <img src={championTeam.flagUrl} alt="" className="w-5 h-5 object-contain" />}
                    {t("championPickConfirmed")}: {championTeam.name}
                  </div>
                )}
                <div className="flex items-center gap-2 max-w-sm">
                  <select
                    value={championTeamId}
                    onChange={(e) => setChampionTeamId(e.target.value)}
                    className="flex-1 min-h-[36px] px-3 py-1.5 border border-border rounded-lg text-[13px] font-semibold bg-white focus:outline-none focus:border-primary"
                  >
                    <option value="">{t("adminChampionNone")}</option>
                    {allTeams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSaveChampionTeam}
                    disabled={championSaving}
                    className="min-h-[36px] px-4 py-1.5 rounded-lg text-[13px] font-bold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #F57F17, #E65100)' }}
                  >
                    {championSaving ? t("saving") : t("adminChampionSave")}
                  </button>
                </div>
              </div>
            </div>
          </article>
        )}

        {activeTab === "exports" && (
          <article className="bg-card border border-border rounded-lg p-6 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
            <h3 className="text-[17px] font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Download size={18} className="text-primary-strong" style={{ color: '#2F7D5C' }} />
              {t("exportRecords")}
            </h3>
            <p className="text-muted-foreground text-[13px] mb-4">
              {t("exportRecordsSub")}
            </p>
            <button className="min-h-[38px] px-4 py-2 border border-border bg-white rounded font-extrabold hover:bg-gray-50 text-[13px]">
              {t("exportLedgerBtn")}
            </button>
          </article>
        )}

        {activeTab === "audit" && (
          <article className="bg-card border border-border rounded-lg p-6 shadow-[0_12px_30px_rgba(31,41,55,0.08)] bg-white">
            <h3 className="text-[17px] font-bold text-foreground mb-2 flex items-center gap-1.5">
              <FileText size={18} className="text-primary-strong" style={{ color: '#2F7D5C' }} />
              {t("auditLogs")}
            </h3>
            <p className="text-muted-foreground text-[13px] mb-4">
              {t("auditLogsSub")}
            </p>
            <div className="divide-y divide-border text-[12px] font-medium text-muted-foreground">
              <div className="py-2.5 flex justify-between">
                <span>{t("auditSyncMsg")}</span>
                <span className="text-foreground">19/05 · 17:30</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span>{t("auditAddPlayerMsg")}</span>
                <span className="text-foreground">19/05 · 17:15</span>
              </div>
            </div>
          </article>
        )}

      </div>
    </NavigationShell>
  );
}

export default function AdminPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>{t("loadingAdminPanel")}</p>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
