"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import TeamLogo from "@/components/team-logo";

interface Team { id: string; name: string; shortName: string; flagUrl: string; }
interface Match { id: string; stage: string; groupName: string | null; kickoffAt: string; homeScore: number | null; awayScore: number | null; homeTeam: Team; awayTeam: Team; }
interface LeagueMatch {
  id: string; status: string; isPredictionEnabled: boolean; pointMultiplier: number; lockAt: string; match: Match;
  myPrediction: { homeScorePred: number; awayScorePred: number; isHopeStar: boolean; points: number; resultType: string; } | null;
}

type TabKey = "live" | "upcoming" | "past";

function MatchesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language, t } = useLanguage();

  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const tabParam = searchParams.get("tab") as TabKey | null;

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

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ matches: LeagueMatch[] }>("/matches");
      setMatches(data.matches);
    } catch (err) { console.error("Error loading matches:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadMatches(); }, []);

  // After first load: if no tab param in URL, pick best default tab
  useEffect(() => {
    if (loading || tabParam) return;
    const hasLive = matches.some(m => m.status === "LIVE");
    const hasUpcoming = matches.some(m => ["OPEN", "SCHEDULED", "LOCKED"].includes(m.status));
    const autoTab: TabKey = hasLive ? "live" : hasUpcoming ? "upcoming" : "past";
    router.replace(`/matches?tab=${autoTab}`);
  }, [loading, matches, tabParam]);

  const setTab = (tab: TabKey) => {
    // replace so tab switches don't pollute browser history — back goes to previous page
    router.replace(`/matches?tab=${tab}`);
  };

  const activeTab: TabKey = tabParam ?? "upcoming";

  const liveCount = matches.filter(m => m.status === "LIVE").length;
  const upcomingCount = matches.filter(m => ["OPEN", "SCHEDULED", "LOCKED"].includes(m.status)).length;
  const pastCount = matches.filter(m => ["FINISHED", "SCORED", "VOID"].includes(m.status)).length;

  const filtered = matches.filter((m) => {
    if (activeTab === "live") return m.status === "LIVE";
    if (activeTab === "upcoming") return ["OPEN", "SCHEDULED", "LOCKED"].includes(m.status);
    if (activeTab === "past") return ["FINISHED", "SCORED", "VOID"].includes(m.status);
    return false;
  });

  // Past matches: newest first (reverse chronological)
  const sorted = activeTab === "past" ? [...filtered].reverse() : filtered;

  // Group by date
  const grouped: { dateKey: string; dayMatches: LeagueMatch[] }[] = [];
  const seenKeys = new Set<string>();
  for (const m of sorted) {
    const dateKey = new Date(m.match.kickoffAt).toLocaleDateString(language === "vi" ? 'vi-VN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!seenKeys.has(dateKey)) { seenKeys.add(dateKey); grouped.push({ dateKey, dayMatches: [] }); }
    grouped[grouped.length - 1].dayMatches.push(m);
  }

  const today = new Date().toLocaleDateString(language === "vi" ? 'vi-VN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <NavigationShell>
      <h1 className="text-[24px] font-bold text-foreground mb-1">{t("matchesTitle")}</h1>
      <p className="text-[14px] text-muted-foreground mb-6">{t("matchesDesc")}</p>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
        <div className="kp-tabs">
          {([
            { key: 'live' as TabKey, label: t("tabLive"), count: liveCount },
            { key: 'upcoming' as TabKey, label: t("tabUpcoming"), count: upcomingCount },
            { key: 'past' as TabKey, label: t("tabPast"), count: pastCount },
          ] as const).map((tItem) => (
            <button
              key={tItem.key}
              onClick={() => setTab(tItem.key)}
              className={`kp-tab ${activeTab === tItem.key ? 'kp-tab-active' : ''}`}
            >
              {tItem.label} <span className="kp-tab-count">{tItem.count}</span>
            </button>
          ))}
        </div>
        <button onClick={loadMatches} className="kp-btn kp-btn-ghost kp-btn-sm self-start sm:self-auto">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {t("refreshBtn")}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>{t("loadingMatches")}</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-dashed border-border bg-muted text-muted-foreground bg-white">
          <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-[14px]">{t("noMatchesFound")}</p>
        </div>
      ) : (
        grouped.map(({ dateKey, dayMatches }) => (
          <div key={dateKey} className="mb-7">
            {/* Date group header */}
            <div className="flex items-center gap-3 mb-3.5">
              <span className="text-[13px] font-bold text-gray-700">{dateKey}</span>
              {dateKey === today && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-primary px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#2F7D5C' }}>
                  {t("todayLabel")}
                </span>
              )}
              <span className="flex-1 h-px bg-border" />
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
              {dayMatches.map((lm) => {
                const isOpen = lm.status === "OPEN" && lm.isPredictionEnabled;
                const isLive = lm.status === "LIVE";
                const isScored = lm.status === "SCORED";
                const isVoid = lm.status === "VOID";
                const isLocked = lm.status === "LOCKED";
                const hasPick = lm.myPrediction !== null;
                const pred = lm.myPrediction;
                const hasHopeStar = pred?.isHopeStar ?? false;
                const hasX2 = lm.pointMultiplier > 1;

                const badgeClass = isLive ? 'kp-badge-live' : isOpen ? 'kp-badge-open' : isScored ? 'kp-badge-scored' : isVoid ? 'kp-badge-void' : 'kp-badge-upcoming';
                const badgeLabel = isLive ? t("matchLive") : isOpen ? "OPEN" : isScored ? t("statusScored") : isVoid ? "VOID" : isLocked ? "LOCKED" : t("statusUpcoming");

                return (
                  <div
                    key={lm.id}
                    className={`kp-card ${isVoid ? 'opacity-60' : ''}`}
                    style={{ borderLeft: isLive ? '3px solid #DC2626' : isScored ? '3px solid #2563EB' : undefined }}
                  >
                    {/* Meta */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        {stageLabel(lm.match.stage, lm.match.groupName)}
                        {hasX2 && (
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            x{lm.pointMultiplier}
                          </span>
                        )}
                      </span>
                      <span className={`kp-badge ${badgeClass}`}>{badgeLabel}</span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <TeamLogo name={lm.match.homeTeam.name} flagUrl={lm.match.homeTeam.flagUrl} className="w-10 h-10" imageClassName="w-8 h-8" fallbackClassName="text-[24px]" />
                        <span className="text-[14px] font-bold text-center">{lm.match.homeTeam.name}</span>
                      </div>
                      <div className="flex flex-col items-center px-3">
                        {lm.match.homeScore !== null && lm.match.awayScore !== null ? (
                          <>
                            <div className="font-black tracking-wider" style={{ fontSize: isLive ? 28 : 26, letterSpacing: isLive ? '4px' : '3px' }}>
                              {lm.match.homeScore} — {lm.match.awayScore}
                            </div>
                            {isLive && <div className="text-[12px] text-destructive font-bold mt-0.5">{t("inProgressStatus")}</div>}
                            {isScored && <div className="text-[11px] text-muted-foreground mt-0.5">FT</div>}
                          </>
                        ) : isLive ? (
                          <div className="px-3 py-1.5 rounded-lg border border-red-100 bg-red-50 text-[11px] font-extrabold uppercase tracking-wide text-destructive text-center">
                            {t("liveScorePending")}
                          </div>
                        ) : (
                          <div className="text-[18px] font-bold text-gray-300">vs</div>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <TeamLogo name={lm.match.awayTeam.name} flagUrl={lm.match.awayTeam.flagUrl} className="w-10 h-10" imageClassName="w-8 h-8" fallbackClassName="text-[24px]" />
                        <span className="text-[14px] font-bold text-center">{lm.match.awayTeam.name}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2.5">
                      <div>
                        <div className="text-[12px] text-muted-foreground">
                          ⏰ {new Date(lm.match.kickoffAt).toLocaleTimeString(language === "vi" ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })} · {new Date(lm.match.kickoffAt).toLocaleDateString(language === "vi" ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        {isOpen && !hasPick && (
                          <div className="text-[13px] text-muted-foreground italic mt-0.5">{t("notPredictedYet")}</div>
                        )}
                        {hasPick && pred && (
                          <div className="text-[13px] mt-0.5 flex items-center gap-1">
                            <span className="text-muted-foreground">{t("yourPickLabel")}</span>
                            <span className="font-bold text-foreground">{pred.homeScorePred}–{pred.awayScorePred}</span>
                            {hasHopeStar && <span className="text-amber-500 text-[12px]">⭐</span>}
                            {isScored && (
                              <span className={`ml-0.5 font-bold ${pred.resultType === 'EXACT_SCORE' ? 'text-success' : pred.resultType === 'CORRECT_RESULT' ? 'text-blue-dark' : 'text-red-400'}`}>
                                {pred.points >= 0 ? '+' : ''}{pred.points} {t("pointsWord")} {pred.resultType === 'EXACT_SCORE' ? '✅' : pred.resultType === 'CORRECT_RESULT' ? '✓' : '✗'}
                              </span>
                            )}
                          </div>
                        )}
                        {isVoid && (
                          <div className="text-[13px] text-muted-foreground italic mt-0.5">{t("matchCancelled")}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {isOpen && !hasPick && (
                          <Link href={`/matches/${lm.id}`}>
                            <button className="kp-btn kp-btn-primary kp-btn-sm" style={{ backgroundColor: '#2F7D5C' }}>{t("predictAction")}</button>
                          </Link>
                        )}
                        {isOpen && hasPick && (
                          <Link href={`/matches/${lm.id}`}>
                            <button className="kp-btn kp-btn-ghost kp-btn-sm">{t("editAction")}</button>
                          </Link>
                        )}
                        {isScored && pred?.resultType === 'EXACT_SCORE' && (
                          <span className="text-[12px] font-bold text-success bg-green-50 px-2.5 py-0.5 rounded-md">{t("exactMatchBadge")}</span>
                        )}
                        {isScored && pred?.resultType === 'CORRECT_RESULT' && (
                          <span className="text-[12px] font-bold text-blue-dark bg-blue-50 px-2.5 py-0.5 rounded-md">{t("correctMatchBadge")}</span>
                        )}
                        {isLive && (
                          <span className="text-[12px] text-destructive font-bold">{t("matchLive")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </NavigationShell>
  );
}

export default function MatchesPage() {
  return (
    <Suspense>
      <MatchesContent />
    </Suspense>
  );
}
