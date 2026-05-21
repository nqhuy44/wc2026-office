"use client";

import { useEffect, useState } from "react";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { Award, Eye, AlertCircle, RefreshCw } from "lucide-react";

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
}

interface LeagueMatch {
  id: string;
  status: string;
  match: Match;
}

interface PeerPrediction {
  id: string;
  homeScorePred: number;
  awayScorePred: number;
  points: number;
  resultType: string;
  participant: {
    nickname: string;
  };
}

export default function ResultsPage() {
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Colleague predictions modal
  const [selectedMatch, setSelectedMatch] = useState<LeagueMatch | null>(null);
  const [peerPredictions, setPeerPredictions] = useState<PeerPrediction[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ matches: LeagueMatch[] }>("/matches");
      // Filter finished/scored matches
      const finished = data.matches.filter(
        (m) => m.status === "FINISHED" || m.status === "SCORED"
      );
      setMatches(finished);
    } catch (err) {
      console.error("Error loading results:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPeers = async (leagueMatch: LeagueMatch) => {
    setSelectedMatch(leagueMatch);
    setLoadingPeers(true);
    try {
      const data = await apiClient<{ predictions: PeerPrediction[] }>(`/matches/${leagueMatch.id}/predictions`);
      setPeerPredictions(data.predictions);
    } catch (err) {
      console.error("Failed to load peer predictions:", err);
    } finally {
      setLoadingPeers(false);
    }
  };

  // Get exact score winners list helper
  const getExactWinnersString = (preds: PeerPrediction[]) => {
    const winners = preds.filter((p) => p.resultType === "EXACT_SCORE").map((p) => p.participant.nickname);
    return winners.length > 0 ? winners.join(", ") : t("exactWinnersNone");
  };

  const getCorrectResultCount = (preds: PeerPrediction[]) => {
    return preds.filter((p) => p.resultType === "CORRECT_RESULT").length;
  };

  return (
    <NavigationShell>
      <div className="space-y-6">
        
        <div className="flex justify-end pb-3 border-b border-border">
          <button 
            onClick={loadResults} 
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-2 border border-border bg-white rounded font-extrabold hover:bg-gray-50 text-[13px]"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {t("refreshBtn")}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
            <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>
              {t("loadingResults")}
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 rounded-lg border border-dashed border-[#cfd7d3] bg-white text-muted-foreground shadow-sm">
            <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-[14px]">
              {t("noFinishedMatches")}
            </p>
          </div>
        ) : (
          <article className="bg-card border border-border rounded-lg shadow-[0_12px_30px_rgba(31,41,55,0.08)] overflow-hidden bg-white">
            <div className="p-6 border-b border-border bg-[linear-gradient(180deg,rgba(47,125,92,0.02),transparent)]">
              <h3 className="text-[17px] font-bold text-foreground">
                {t("resultsBoardTitle")}
              </h3>
              <p className="text-muted-foreground text-[13px] mt-0.5">
                {t("resultsBoardDesc")}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/65 text-muted-foreground font-extrabold uppercase tracking-wider text-[11px] bg-gray-50">
                    <th className="px-6 py-4">{t("matchTableHeader")}</th>
                    <th className="px-6 py-4 text-center">{t("finalScoreTableHeader")}</th>
                    <th className="px-6 py-4 text-center">{t("statusCol")}</th>
                    <th className="px-6 py-4 text-center">{t("colleaguePredictionsCol")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matches.map((lm) => (
                    <tr key={lm.id} className="hover:bg-[#fcfbf7] transition-all">
                      <td className="px-6 py-4">
                        <div className="leading-tight">
                          <strong className="text-foreground font-bold block text-[14px]">
                            {lm.match.homeTeam.name} vs {lm.match.awayTeam.name}
                          </strong>
                          <span className="text-muted-foreground text-[11px] mt-0.5 block">
                            {stageLabel(lm.match.stage, lm.match.groupName)} · {new Date(lm.match.kickoffAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-foreground text-[15px]">
                        <span className="px-2.5 py-1 bg-muted border border-border rounded">
                          {lm.match.homeScore} - {lm.match.awayScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold uppercase ${
                          lm.status === "SCORED"
                            ? "bg-[#e7f2eb] border-primary/20 text-primary-strong"
                            : "bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]"
                        }`}>
                          {lm.status === "SCORED" 
                            ? t("statusScoredPast") 
                            : t("statusFinishedPast")
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenPeers(lm)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-white rounded font-extrabold hover:bg-gray-50 text-[12px]"
                        >
                          <Eye size={12} />
                          {t("detailsAction")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}

        {/* Modal Peer Predictions */}
        {selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
            <div className="w-full max-w-[480px] bg-card border border-border rounded-lg p-6 shadow-[0_24px_50px_rgba(31,41,55,0.16)] flex flex-col max-h-[90vh] bg-white">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div>
                  <h3 className="text-[17px] font-bold text-foreground">
                    {t("colleagueScoresModalTitle")}
                  </h3>
                  <p className="text-muted-foreground text-[13px] mt-0.5">
                    {selectedMatch.match.homeTeam.name} vs {selectedMatch.match.awayTeam.name} {t("modalFinalScoreLabel").replace("{score}", `${selectedMatch.match.homeScore} - ${selectedMatch.match.awayScore}`)}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedMatch(null)}
                  className="min-h-[36px] px-3 py-1.5 border border-border rounded font-extrabold hover:bg-gray-50 text-[13px]"
                >
                  {t("closeModalAction")}
                </button>
              </div>

              {loadingPeers ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }}></div>
                </div>
              ) : peerPredictions.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-8">
                  {t("noPredictionsFoundForMatch")}
                </p>
              ) : (
                <div className="overflow-y-auto space-y-2.5 flex-1 pr-1.5">
                  <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-muted rounded border border-border text-[12px] bg-gray-50">
                    <div>
                      <strong className="block text-primary-strong" style={{ color: '#2F7D5C' }}>
                        {t("exactScoreWinnersLabel")}
                      </strong>
                      <span className="text-muted-foreground">{getExactWinnersString(peerPredictions)}</span>
                    </div>
                    <div>
                      <strong className="block text-foreground">
                        {t("correctResultOnlyLabel")}
                      </strong>
                      <span className="text-muted-foreground">
                        {getCorrectResultCount(peerPredictions)} {t("playersLabel")}
                      </span>
                    </div>
                  </div>

                  {peerPredictions.map((peer) => (
                    <div key={peer.id} className="flex items-center justify-between p-3 bg-muted border border-border rounded text-[13px] bg-gray-50">
                      <span className="font-bold text-foreground">{peer.participant.nickname}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-foreground px-2 py-0.5 bg-white border border-border rounded">
                          {peer.homeScorePred} - {peer.awayScorePred}
                        </span>
                        {peer.resultType !== "PENDING" && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            peer.resultType === "EXACT_SCORE" 
                              ? "bg-amber-50 border-amber-200 text-amber-800" 
                              : peer.resultType === "CORRECT_RESULT" 
                              ? "bg-primary/5 border-primary/20 text-primary-strong" 
                              : "bg-gray-100 border-gray-200 text-muted-foreground"
                          }`}>
                            +{peer.points} {t("pointsWordLong")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </NavigationShell>
  );
}
