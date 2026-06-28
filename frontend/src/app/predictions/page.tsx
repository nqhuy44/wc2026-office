"use client";

import { useEffect, useState } from "react";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import TeamLogo from "@/components/team-logo";
import { parseScore } from "@/lib/match-score";

interface Team { id: string; name: string; shortName: string; flagUrl: string; }
interface Match { id: string; stage: string; groupName: string | null; kickoffAt: string; homeScore: number | null; awayScore: number | null; extraTimeHome: number | null; extraTimeAway: number | null; penaltiesHome: number | null; penaltiesAway: number | null; duration: string | null; homeTeam: Team; awayTeam: Team; }
interface LeagueMatch {
  id: string; status: string; isPredictionEnabled: boolean; isBonus: boolean; lockAt: string; match: Match;
  myPrediction: { homeScorePred: number; awayScorePred: number; isHopeStar: boolean; points: number; resultType: string; } | null;
}

type Filter = "all" | "exact" | "correct" | "wrong" | "pending";

export default function PredictionsPage() {
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
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
    async function load() {
      try {
        const d = await apiClient<{ matches: LeagueMatch[] }>("/matches");
        setMatches(d.matches);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, []);

  const scoredResultTypes = ["EXACT_SCORE", "CORRECT_RESULT", "WRONG"];
  const predicted = matches.filter(m => m.myPrediction && m.myPrediction.resultType !== "VOID");
  const activeMatches = matches.filter(m => m.isPredictionEnabled);
  const scored = predicted.filter(m => m.myPrediction && scoredResultTypes.includes(m.myPrediction.resultType));
  const exactCount = scored.filter(m => m.myPrediction?.resultType === "EXACT_SCORE").length;
  const correctCount = scored.filter(m => m.myPrediction?.resultType === "CORRECT_RESULT").length;
  const wrongCount = scored.filter(m => m.myPrediction?.resultType === "WRONG").length;
  const pendingCount = predicted.filter(m => m.myPrediction?.resultType === "PENDING").length;
  const totalPts = scored.reduce((s, m) => s + (m.myPrediction?.points ?? 0), 0);

  const filtered = predicted
    .filter(m => {
      if (filter === "exact") return m.myPrediction?.resultType === "EXACT_SCORE";
      if (filter === "correct") return m.myPrediction?.resultType === "CORRECT_RESULT";
      if (filter === "wrong") return m.myPrediction?.resultType === "WRONG";
      if (filter === "pending") return m.myPrediction?.resultType === "PENDING";
      return true;
    })
    .sort((a, b) => new Date(b.match.kickoffAt).getTime() - new Date(a.match.kickoffAt).getTime());

  return (
    <NavigationShell>
      <h1 className="text-[24px] font-bold text-foreground mb-1">
        {t("myPredictions")}
      </h1>
      <p className="text-[14px] text-muted-foreground mb-6">
        {t("trackPicks")}
      </p>

      {/* Stats summary */}
      <div className="kp-card mb-6 flex items-center gap-5 flex-wrap" style={{ padding: '16px 20px' }}>
        {[
          { label: t("totalPoints"), val: totalPts, color: '#2F7D5C' },
          { label: t("predictions"), val: `${predicted.length}/${activeMatches.length}` },
          { label: t("exactBadge"), val: exactCount, color: '#2563EB' },
          { label: t("correctBadge"), val: correctCount, color: '#16A34A' },
          { label: t("wrongBadge"), val: wrongCount, color: '#9CA3AF' },
        ].map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            {i > 0 && <div className="w-px h-5 bg-border" />}
            <div className="ml-2">
              <div className="text-[22px] font-extrabold" style={{ color: s.color || '#1F2937' }}>{s.val}</div>
              <div className="text-[12px] text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="kp-tabs mb-6">
        {[
          { key: 'all' as Filter, label: t("allFilter"), count: predicted.length },
          { key: 'exact' as Filter, label: t("exactFilter"), count: exactCount },
          { key: 'correct' as Filter, label: t("correctFilter"), count: correctCount },
          { key: 'wrong' as Filter, label: t("wrongFilter"), count: wrongCount },
          { key: 'pending' as Filter, label: t("pendingFilter"), count: pendingCount },
        ].map(tObj => (
          <button key={tObj.key} onClick={() => setFilter(tObj.key)} className={`kp-tab ${filter === tObj.key ? 'kp-tab-active' : ''}`}>
            {tObj.label} <span className="kp-tab-count">{tObj.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>{t("loading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-dashed border-border bg-muted text-muted-foreground bg-white">
          <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
          <p>{t("noPredsFound")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(lm => {
            const p = lm.myPrediction!;
            const isScored = scoredResultTypes.includes(p.resultType);
            const isExact = p.resultType === "EXACT_SCORE";
            const isCorrect = p.resultType === "CORRECT_RESULT";
            const hasFinal = lm.match.homeScore !== null;

            return (
              <Link key={lm.id} href={`/matches/${lm.id}`} className="block">
                <div className="kp-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow" style={{ padding: '14px 18px' }}>
                  {/* Teams */}
                  <div className="w-full sm:flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      <TeamLogo name={lm.match.homeTeam.name} flagUrl={lm.match.homeTeam.flagUrl} className="w-7 h-7" imageClassName="w-5 h-5" fallbackClassName="text-[18px]" />
                      <span className="truncate">{lm.match.homeTeam.name} vs {lm.match.awayTeam.name}</span>
                      <TeamLogo name={lm.match.awayTeam.name} flagUrl={lm.match.awayTeam.flagUrl} className="w-7 h-7" imageClassName="w-5 h-5" fallbackClassName="text-[18px]" />
                      {lm.isBonus && <span className="text-[10px] font-extrabold bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded shrink-0">BONUS</span>}
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">
                      {stageLabel(lm.match.stage, lm.match.groupName)} · {new Date(lm.match.kickoffAt).toLocaleDateString(language === "vi" ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  {/* Pick */}
                  <div className="flex items-center justify-between sm:block sm:text-center sm:min-w-[82px]">
                    <div className="text-[11px] text-muted-foreground font-semibold uppercase sm:mb-0">
                      {t("yourPick")}
                    </div>
                    <div className="text-[16px] font-black flex items-center gap-1.5">
                      {p.homeScorePred} – {p.awayScorePred}
                      {p.isHopeStar && <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-yellow-300 bg-yellow-100 text-yellow-800">{t("hopeStarLabel")}</span>}
                    </div>
                  </div>
                  {/* Result */}
                  {isScored && hasFinal && (
                    <>
                      <div className="flex items-center justify-between sm:block sm:text-center sm:min-w-[82px]">
                        <div className="text-[11px] text-muted-foreground font-semibold uppercase">
                          {t("finalResult")}
                        </div>
                        {(() => {
                          const sc = parseScore(lm.match);
                          return (
                            <div className="flex flex-col items-end sm:items-center">
                              <div className="text-[16px] font-black">{sc.homeMain} – {sc.awayMain}</div>
                              {sc.suffix === "pen" && (
                                <span className="text-[10px] font-extrabold text-amber-700">({sc.homePen}-{sc.awayPen}) PEN</span>
                              )}
                              {sc.suffix && (
                                <span className="text-[9px] text-muted-foreground uppercase">AET</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 sm:gap-0.5 sm:min-w-[80px]">
                        <span className={`text-[13px] font-bold px-2.5 py-0.5 rounded-md ${isExact ? 'kp-pts-exact' : isCorrect ? 'kp-pts-correct' : 'kp-pts-wrong'}`}>
                          {p.points >= 0 ? '+' : ''}{p.points} {language === "vi" ? "đ" : "pts"}
                        </span>
                        <span className={`text-[11px] font-semibold ${isExact ? 'text-success' : isCorrect ? 'text-blue-dark' : 'text-muted-foreground'}`}>
                          {isExact 
                            ? t("exactResultText") 
                            : isCorrect 
                              ? t("correctResultText") 
                              : t("wrongResultText")
                          }
                        </span>
                      </div>
                    </>
                  )}
                  {!isScored && (
                    <span className="kp-badge kp-badge-upcoming text-[11px] self-start sm:self-auto">
                      {t("pendingFilter")}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </NavigationShell>
  );
}
