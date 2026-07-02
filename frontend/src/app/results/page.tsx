"use client";

import { useEffect, useState } from "react";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { AlertCircle, RefreshCw } from "lucide-react";
import { scoreText } from "@/lib/match-score";

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
  regularTimeHome: number | null;
  regularTimeAway: number | null;
  extraTimeHome: number | null;
  extraTimeAway: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
  duration: string | null;
  homeTeam: Team;
  awayTeam: Team;
}

interface LeagueMatch {
  id: string;
  status: string;
  match: Match;
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

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ matches: LeagueMatch[] }>("/matches");
      setMatches(data.matches.filter((m) => m.status === "FINISHED" || m.status === "SCORED"));
    } catch (err) {
      console.error("Error loading results:", err);
    } finally {
      setLoading(false);
    }
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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: "#2F7D5C", borderTopColor: "transparent" }} />
            <p className="text-sm font-bold text-muted-foreground" style={{ color: "#2F7D5C" }}>
              {t("loadingResults")}
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 rounded-lg border border-dashed border-[#cfd7d3] bg-white text-muted-foreground shadow-sm">
            <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-[14px]">{t("noFinishedMatches")}</p>
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
              <table className="w-full min-w-[640px] text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/65 text-muted-foreground font-extrabold uppercase tracking-wider text-[11px] bg-gray-50">
                    <th className="px-6 py-4">{t("matchTableHeader")}</th>
                    <th className="px-6 py-4 text-center">{t("finalScoreTableHeader")}</th>
                    <th className="px-6 py-4 text-center">{t("statusCol")}</th>
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
                        <span className="px-2.5 py-1 bg-muted border border-border rounded whitespace-nowrap">
                          {scoreText(lm.match, "-")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold uppercase ${
                          lm.status === "SCORED"
                            ? "bg-[#e7f2eb] border-primary/20 text-primary-strong"
                            : "bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]"
                        }`}>
                          {lm.status === "SCORED" ? t("statusScoredPast") : t("statusFinishedPast")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </div>
    </NavigationShell>
  );
}
