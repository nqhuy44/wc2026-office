"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";
import TeamLogo from "@/components/team-logo";

interface Team { id: string; name: string; shortName: string; flagUrl: string; }
interface Match { id: string; stage: string; groupName: string | null; kickoffAt: string; homeScore: number | null; awayScore: number | null; homeTeam: Team; awayTeam: Team; }
interface LeagueMatch {
  id: string; status: string; isPredictionEnabled: boolean; lockAt: string; match: Match;
  myPrediction: { homeScorePred: number; awayScorePred: number; points: number; resultType: string; } | null;
}
interface PeerPrediction {
  id: string; homeScorePred: number; awayScorePred: number; points: number; resultType: string;
  participant: { nickname: string; };
}

export default function MatchDetailPage() {
  const params = useParams();
  const leagueMatchId = params.id as string;
  const { language, t } = useLanguage();

  const [lm, setLm] = useState<LeagueMatch | null>(null);
  const [peers, setPeers] = useState<PeerPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  // Prediction form
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Load all matches and find the one we need
        const data = await apiClient<{ matches: LeagueMatch[] }>("/matches");
        const found = data.matches.find((m) => m.id === leagueMatchId);
        if (found) {
          setLm(found);
          if (found.myPrediction) {
            setHomeScore(found.myPrediction.homeScorePred);
            setAwayScore(found.myPrediction.awayScorePred);
          }
          // Load peer predictions only after the prediction window is closed for active matches.
          if (found.isPredictionEnabled && !["OPEN", "SCHEDULED"].includes(found.status)) {
            try {
              const peerData = await apiClient<{ predictions: PeerPrediction[] }>(`/matches/${leagueMatchId}/predictions`);
              setPeers(peerData.predictions);
            } catch (err) {
              console.error("Failed to load peer predictions:", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load match:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [leagueMatchId]);

  const handleSave = async () => {
    if (!lm) return;
    setSaving(true);
    try {
      await apiClient(`/predictions/${lm.id}`, {
        method: "PUT",
        json: { homeScorePred: homeScore, awayScorePred: awayScore },
      });
      setLm((prev) => prev ? {
        ...prev,
        myPrediction: { homeScorePred: homeScore, awayScorePred: awayScore, points: 0, resultType: "PENDING" },
      } : null);
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    } catch (err: any) {
      alert(err.message || t("failedToSavePrediction"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <NavigationShell>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>
            {t("loadingMatchDetail")}
          </p>
        </div>
      </NavigationShell>
    );
  }

  if (!lm) {
    return (
      <NavigationShell>
        <div className="text-center py-24 text-muted-foreground bg-white border border-border rounded-xl">
          <p className="text-lg font-semibold mb-2">
            {t("matchNotFound")}
          </p>
          <Link href="/matches" className="text-primary font-semibold hover:underline">
            {t("backToMatches")}
          </Link>
        </div>
      </NavigationShell>
    );
  }

  const isOpen = lm.status === "OPEN" && lm.isPredictionEnabled;
  const isScored = lm.status === "SCORED" || lm.status === "FINISHED";
  const hasFinalScore = lm.match.homeScore !== null && lm.match.awayScore !== null;
  const hasValidPrediction = Boolean(lm.myPrediction && lm.myPrediction.resultType !== "VOID");
  
  const stageLabel = (() => {
    const { stage, groupName } = lm.match;
    if (stage === "GROUP") return groupName ? t("groupStageName").replace("{group}", groupName) : t("stageGroupNoLabel");
    if (stage === "ROUND_OF_32") return t("stageRoundOf32");
    if (stage === "ROUND_OF_16") return t("stageRoundOf16");
    if (stage === "QUARTER_FINAL") return t("stageQuarterFinal");
    if (stage === "SEMI_FINAL") return t("stageSemiFinal");
    if (stage === "THIRD_PLACE") return t("stageThirdPlace");
    if (stage === "FINAL") return t("stageFinal");
    return stage;
  })();

  return (
    <NavigationShell>
      {/* Toast */}
      {toast && (
        <div className="kp-toast">
          {t("predictionSavedToast")}
          <span className="ml-3 cursor-pointer opacity-80 text-base" onClick={() => setToast(false)}>×</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <Link href="/matches" className="flex items-center gap-1.5 text-[14px] text-muted-foreground font-medium px-3 py-1.5 rounded-lg border border-border bg-white hover:text-primary hover:border-primary transition-all">
          {t("backToMatches")}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-[13px] text-muted-foreground font-bold">{stageLabel}</span>
      </div>

      <div className="max-w-[900px]">
        {/* ─── SCORED State: Blue gradient header ─── */}
        {isScored && hasFinalScore ? (
          <>
            <div className="rounded-xl p-7 text-white mb-5" style={{
              background: 'linear-gradient(135deg, #1e3a5f, #2563EB)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}>
              <div className="flex items-center justify-between mb-5 opacity-85 text-[13px]">
                <span>{stageLabel} · {lm.match.homeTeam.name} vs {lm.match.awayTeam.name}</span>
                <span className="kp-badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '4px 14px', fontSize: '12px' }}>
                  {t("statusFinal")}
                </span>
              </div>
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <TeamLogo name={lm.match.homeTeam.name} flagUrl={lm.match.homeTeam.flagUrl} className="w-14 h-14" imageClassName="w-11 h-11" fallbackClassName="text-[34px]" />
                  <span className="text-[18px] font-bold">{lm.match.homeTeam.name}</span>
                </div>
                <div className="text-center">
                  <div className="text-[52px] font-black" style={{ letterSpacing: '6px' }}>
                     {lm.match.homeScore} — {lm.match.awayScore}
                  </div>
                  <div className="text-[13px] opacity-70 font-semibold uppercase tracking-widest">
                    {t("fullTimeLabel")}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <TeamLogo name={lm.match.awayTeam.name} flagUrl={lm.match.awayTeam.flagUrl} className="w-14 h-14" imageClassName="w-11 h-11" fallbackClassName="text-[34px]" />
                  <span className="text-[18px] font-bold">{lm.match.awayTeam.name}</span>
                </div>
              </div>
            </div>

            {/* My Result Banner */}
            {hasValidPrediction && lm.myPrediction && (
              <div className="flex items-center justify-between p-5 rounded-xl mb-5" style={{
                background: lm.myPrediction.resultType === 'EXACT_SCORE' ? '#DCFCE7' : lm.myPrediction.resultType === 'CORRECT_RESULT' ? '#DBEAFE' : '#F3F4F6',
                border: `2px solid ${lm.myPrediction.resultType === 'EXACT_SCORE' ? '#16A34A' : lm.myPrediction.resultType === 'CORRECT_RESULT' ? '#2563EB' : '#E5E7EB'}`,
              }}>
                <div>
                  <div className="text-[12px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">
                    {t("yourPredictionTitle")}
                  </div>
                  <div className="text-[28px] font-black text-foreground">{lm.myPrediction.homeScorePred} — {lm.myPrediction.awayScorePred}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">
                    {t("pointsEarnedLabel")}
                  </div>
                  <div className={`text-[28px] font-black ${lm.myPrediction.resultType === 'EXACT_SCORE' ? 'text-success' : lm.myPrediction.resultType === 'CORRECT_RESULT' ? 'text-blue-dark' : 'text-muted-foreground'}`}>
                    +{lm.myPrediction.points} {t("pointsWordLong")}
                  </div>
                  <div className={`text-[13px] font-bold ${lm.myPrediction.resultType === 'EXACT_SCORE' ? 'text-success' : lm.myPrediction.resultType === 'CORRECT_RESULT' ? 'text-blue-dark' : 'text-muted-foreground'}`}>
                    {lm.myPrediction.resultType === 'EXACT_SCORE' 
                      ? t("exactScoreBadge") 
                      : lm.myPrediction.resultType === 'CORRECT_RESULT' 
                        ? t("correctResultBadge") 
                        : t("wrongResultBadge")
                    }
                  </div>
                </div>
              </div>
            )}

            {/* All predictions table (scored) */}
            {peers.length > 0 && (
              <div className="kp-card mb-6">
                <div className="text-[16px] font-bold text-foreground mb-1">
                  {t("participantPredictionsTitle")}
                </div>
                <div className="text-[13px] text-muted-foreground mb-4">
                  {t("peerCountLabel").replace("{count}", peers.length.toString())}
                </div>
                <table className="kp-table">
                  <thead>
                    <tr>
                      <th>{t("nicknameCol")}</th>
                      <th>{t("theirPickCol")}</th>
                      <th>{t("resultCol")}</th>
                      <th style={{ textAlign: 'right' }}>{t("pointsCol")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peers.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.participant.nickname}</td>
                        <td className="font-bold">{p.homeScorePred} – {p.awayScorePred}</td>
                        <td>
                          <span className={`text-[13px] font-bold ${p.resultType === 'EXACT_SCORE' ? 'text-success' : p.resultType === 'CORRECT_RESULT' ? 'text-blue-dark' : 'text-muted-foreground'}`}>
                            {p.resultType === 'EXACT_SCORE' 
                              ? t("exactPeerBadge") 
                              : p.resultType === 'CORRECT_RESULT' 
                                ? t("correctPeerBadge") 
                                : t("wrongPeerBadge")
                            }
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }} className={`font-bold ${p.resultType === 'EXACT_SCORE' ? 'text-success' : p.resultType === 'CORRECT_RESULT' ? 'text-blue-dark' : 'text-muted-foreground'}`}>
                          +{p.points} {t("pointsWord")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* ─── OPEN State ─── */
          <>
            {/* Match Header Card */}
            <div className="kp-card mb-5" style={{ border: isOpen ? '2px solid #DCFCE7' : '1px solid var(--border)', borderRadius: '12px', padding: '28px 32px' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[16px] font-bold text-foreground mb-1">{stageLabel}</div>
                  <div className="text-[13px] text-muted-foreground">
                    {lm.match.stage === "GROUP" ? t("internalGroupStageDesc") : t("internalLeagueDesc")}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {isOpen && (
                    <div className="text-[14px] font-bold text-warning flex items-center gap-1.5">
                      ⏳ {t("closesBeforeKickoffDesc")}
                    </div>
                  )}
                  <span className={`kp-badge ${isOpen ? 'kp-badge-open' : 'kp-badge-locked'}`} style={{ padding: '5px 14px', fontSize: '13px' }}>
                    {isOpen ? 'OPEN' : lm.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-10 mb-5">
                <div className="flex flex-col items-center gap-2 min-w-[120px]">
                  <TeamLogo name={lm.match.homeTeam.name} flagUrl={lm.match.homeTeam.flagUrl} className="w-16 h-16" imageClassName="w-12 h-12" fallbackClassName="text-[38px]" />
                  <span className="text-[18px] font-bold">{lm.match.homeTeam.name}</span>
                </div>
                <div className="text-[24px] font-bold text-gray-300">vs</div>
                <div className="flex flex-col items-center gap-2 min-w-[120px]">
                  <TeamLogo name={lm.match.awayTeam.name} flagUrl={lm.match.awayTeam.flagUrl} className="w-16 h-16" imageClassName="w-12 h-12" fallbackClassName="text-[38px]" />
                  <span className="text-[18px] font-bold">{lm.match.awayTeam.name}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-5 pt-4 border-t border-gray-100 text-[13px] text-muted-foreground">
                <span>⏰ <strong className="text-gray-700">{new Date(lm.match.kickoffAt).toLocaleTimeString(language === "vi" ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                <span className="text-gray-300">|</span>
                <span>📅 <strong className="text-gray-700">{new Date(lm.match.kickoffAt).toLocaleDateString(language === "vi" ? 'vi-VN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></span>
              </div>
            </div>

            {/* Prediction Form */}
            {isOpen && (
              <div className="kp-card mb-5" style={{ borderRadius: '12px', padding: '24px 28px' }}>
                <div className="text-[16px] font-bold text-foreground mb-1">
                  {t("yourPredictionTitle")}
                </div>
                <div className="text-[13px] text-muted-foreground mb-5">
                  {t("enterPredictionInstructions")}
                </div>

                <div className="flex items-center justify-center gap-5 mb-5">
                  {/* Home team stepper */}
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="flex items-center gap-2 text-[15px] font-bold text-gray-700">
                      <TeamLogo name={lm.match.homeTeam.name} flagUrl={lm.match.homeTeam.flagUrl} className="w-8 h-8" imageClassName="w-6 h-6" fallbackClassName="text-[20px]" /> {lm.match.homeTeam.name}
                    </div>
                    <div className="kp-stepper">
                      <button className="kp-stepper-btn" onClick={() => setHomeScore(Math.max(0, homeScore - 1))}>−</button>
                      <div className="kp-stepper-val">{homeScore}</div>
                      <button className="kp-stepper-btn" onClick={() => setHomeScore(Math.min(20, homeScore + 1))}>+</button>
                    </div>
                  </div>

                  <div className="text-[28px] font-extrabold text-gray-300 mt-6">—</div>

                  {/* Away team stepper */}
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="flex items-center gap-2 text-[15px] font-bold text-gray-700">
                      <TeamLogo name={lm.match.awayTeam.name} flagUrl={lm.match.awayTeam.flagUrl} className="w-8 h-8" imageClassName="w-6 h-6" fallbackClassName="text-[20px]" /> {lm.match.awayTeam.name}
                    </div>
                    <div className="kp-stepper">
                      <button className="kp-stepper-btn" onClick={() => setAwayScore(Math.max(0, awayScore - 1))}>−</button>
                      <div className="kp-stepper-val">{awayScore}</div>
                      <button className="kp-stepper-btn" onClick={() => setAwayScore(Math.min(20, awayScore + 1))}>+</button>
                    </div>
                  </div>
                </div>

                {/* Edit note */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg mb-5 text-[13px]" style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E' }}>
                  🖊 {t("editPredictionNotice")}
                </div>

                <button onClick={handleSave} disabled={saving} className="kp-btn-save">
                  {saving ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    t("savePredictionAction")
                  )}
                </button>
                <div className="text-center text-[12px] text-muted-foreground mt-2.5">
                  🔒 {t("autoLockNotice")}
                </div>
              </div>
            )}

            {/* Locked state: show peer predictions */}
            {!isOpen && peers.length > 0 && (
              <div className="kp-card mb-5" style={{ borderRadius: '12px', padding: '24px 28px' }}>
                <div className="text-[16px] font-bold text-foreground mb-1">
                  {t("participantPredictionsTitle")}
                </div>
                <div className="text-[13px] text-muted-foreground mb-4">
                  {t("peerCountOpenLabel").replace("{count}", peers.length.toString())}
                </div>
                <table className="kp-table">
                  <thead>
                    <tr>
                      <th>{t("nicknameCol")}</th>
                      <th>{t("theirPickCol")}</th>
                      <th>{t("statusCol")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peers.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.participant.nickname}</td>
                        <td className="font-bold">{p.homeScorePred} – {p.awayScorePred}</td>
                        <td>
                          {p.resultType === 'PENDING' ? (
                            <span className="text-muted-foreground text-[13px]">
                              {t("pendingStatus")}
                            </span>
                          ) : (
                            <span className={`text-[13px] font-bold ${p.resultType === 'EXACT_SCORE' ? 'text-success' : p.resultType === 'CORRECT_RESULT' ? 'text-blue-dark' : 'text-muted-foreground'}`}>
                              {p.resultType === 'EXACT_SCORE' 
                                ? t("exactPeerBadge") 
                                : p.resultType === 'CORRECT_RESULT' 
                                  ? t("correctPeerBadge") 
                                  : t("wrongPeerBadge")
                              }
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </NavigationShell>
  );
}
