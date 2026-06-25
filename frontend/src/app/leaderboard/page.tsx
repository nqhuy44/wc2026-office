"use client";

import { useEffect, useState } from "react";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";

interface LeaderboardItem {
  id: string;
  nickname: string;
  totalPoints: number;
  exactMatches: number;
  correctResults: number;
  totalPredictions: number;
}

interface Team {
  id: string;
  name: string;
  shortName: string | null;
  flagUrl: string | null;
}

interface ChampionPickRow {
  memberId: string;
  nickname: string;
  team: Team;
  isCorrect: boolean | null;
}

interface ChampionData {
  isLocked: boolean;
  myPick: { teamId: string; team: Team } | null;
  championTeam: Team | null;
  allPicks: ChampionPickRow[];
}

type LbTab = "overall" | "group" | "knockout";

function LeaderboardTable({
  items,
  myNickname,
  champion,
}: {
  items: LeaderboardItem[];
  myNickname: string;
  champion: ChampionData | null;
}) {
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-[13px] text-muted-foreground">
        {t("lbEmptyTab")}
      </div>
    );
  }

  return (
    <div className="kp-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="overflow-x-auto">
        <table className="kp-table min-w-[760px]">
          <thead>
            <tr>
              <th style={{ width: "44px" }}>#</th>
              <th style={{ width: "40px" }}></th>
              <th>{t("colDisplayName")}</th>
              <th className="th-center">{t("colPoints")}</th>
              <th className="th-center" style={{ minWidth: "80px" }}>{t("colGap")}</th>
              <th className="th-center">{t("colExact")}</th>
              <th className="th-center">{t("colCorrect")}</th>
              <th className="th-center">{t("colWrong")}</th>
              <th className="th-center">{t("colPlayed")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const rank = index + 1;
              const isMe = item.nickname === myNickname;
              const wrongCount = item.totalPredictions - item.exactMatches - item.correctResults;

              return (
                <tr key={item.id} className={`${isMe ? "bg-green-50/50" : "hover:bg-gray-50"}`}>
                  <td style={{ fontWeight: rank <= 3 ? 800 : 600, fontSize: "14px", color: rank <= 3 ? "#111827" : "#6B7280", borderLeft: rank <= 3 ? "3px solid #2F7D5C" : "3px solid transparent" }}>
                    {rank}
                  </td>
                  <td style={{ fontSize: "18px", textAlign: "center" }}>
                    {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : ""}
                  </td>
                  <td style={{ fontWeight: isMe ? 700 : 500, fontSize: "14px", color: isMe ? "#2F7D5C" : "#1f2937" }}>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {item.nickname}
                      {isMe && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ color: "#2F7D5C", backgroundColor: "#E8F5E9" }}>
                          {t("youLabel")}
                        </span>
                      )}
                      {champion?.championTeam && champion.allPicks.find(p => p.nickname === item.nickname && p.isCorrect) && (
                        <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: "#FFF8E1", color: "#F57F17", border: "1px solid #FFE082" }}>
                          {t("championBadge")}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="td-center" style={{ fontSize: "16px", fontWeight: rank <= 3 ? 800 : 700, color: "#111827" }}>
                    {item.totalPoints}
                  </td>
                  <td className="td-center">
                    <span className="text-[12px] font-medium text-gray-500">
                      {rank > 1 ? `-${items[0].totalPoints - item.totalPoints}` : "—"}
                    </span>
                  </td>
                  <td className="td-center" style={{ color: "#4B5563", fontWeight: 600 }}>{item.exactMatches}</td>
                  <td className="td-center" style={{ color: "#6B7280", fontWeight: 500 }}>{item.correctResults}</td>
                  <td className="td-center" style={{ color: "#9CA3AF" }}>{wrongCount > 0 ? wrongCount : 0}</td>
                  <td className="td-center" style={{ color: "#9CA3AF" }}>{item.totalPredictions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [overall, setOverall] = useState<LeaderboardItem[]>([]);
  const [group, setGroup] = useState<LeaderboardItem[]>([]);
  const [knockout, setKnockout] = useState<LeaderboardItem[]>([]);
  const [activeTab, setActiveTab] = useState<LbTab>("group");
  const [myNickname, setMyNickname] = useState<string>("");
  const [champion, setChampion] = useState<ChampionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    async function load() {
      try {
        const [lbData, meData, champData] = await Promise.all([
          apiClient<{ leaderboard: LeaderboardItem[]; group: LeaderboardItem[]; knockout: LeaderboardItem[] }>("/leaderboard"),
          apiClient<{ user: { memberships: { nickname: string; leagueId: string }[] } }>("/auth/me"),
          apiClient<ChampionData>("/champion-pick").catch(() => null),
        ]);
        setOverall(lbData.leaderboard);
        setGroup(lbData.group);
        setKnockout(lbData.knockout);
        // Auto-select tab based on tournament phase
        const knockoutActive = lbData.knockout.some(p => p.totalPredictions > 0);
        setActiveTab(knockoutActive ? "knockout" : "group");
        const activeLeagueId = typeof window !== "undefined" ? localStorage.getItem("activeLeagueId") : null;
        const activeMembership = meData.user.memberships.find(m => m.leagueId === activeLeagueId);
        setMyNickname(activeMembership?.nickname ?? "");
        setChampion(champData);
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeItems = activeTab === "overall" ? overall : activeTab === "group" ? group : knockout;
  const leader = activeItems[0];

  const tabs: { key: LbTab; label: string }[] = [
    { key: "overall", label: t("lbTabOverall") },
    { key: "group", label: t("lbTabGroup") },
    { key: "knockout", label: t("lbTabKnockout") },
  ];

  return (
    <NavigationShell>
      <h1 className="text-[24px] font-bold text-foreground mb-1">
        {t("leaderboardTitle")}
      </h1>
      <p className="text-[14px] text-muted-foreground mb-4">
        {t("leaderboardSub").replace("{count}", overall.length.toString())}
      </p>

      {/* Tab bar */}
      <div className="kp-tabs mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`kp-tab ${activeTab === tab.key ? "kp-tab-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: "#2F7D5C", borderTopColor: "transparent" }} />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: "#2F7D5C" }}>
            {t("loadingLeaderboard")}
          </p>
        </div>
      ) : overall.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-dashed border-border bg-muted text-muted-foreground bg-white">
          <p className="text-[14px]">
            {t("noLeaderboardPlayers")}
          </p>
        </div>
      ) : (
        <>
          {/* Stat Summary Bar */}
          <div className="kp-card flex items-center gap-4 flex-wrap mb-6" style={{ padding: "14px 20px" }}>
            {[
              { icon: "📋", label: t("statScoredLabel"), val: activeItems[0]?.totalPredictions ?? 0 },
              { icon: "👥", label: t("statPlayersLabel"), val: overall.length },
              { icon: "🏆", label: t("statLeaderLabel"), val: leader?.nickname ?? "—" },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-2">
                {i > 0 && <div className="w-px h-5 bg-border" />}
                <span className="text-[13px] text-gray-600 flex items-center gap-1.5 ml-2">
                  {stat.icon} {stat.label}: <strong className="text-foreground">{stat.val}</strong>
                </span>
              </div>
            ))}
          </div>

          <LeaderboardTable items={activeItems} myNickname={myNickname} champion={champion} />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 gap-4 border-t border-gray-100 pt-4">
            <div className="text-[12px] text-gray-500 max-w-lg">
              <span className="font-semibold text-gray-700">
                {t("tiebreakerTitleText")}
              </span>{" "}
              {t("tiebreakerRulesText")}
            </div>
            <div className="flex gap-4 text-[12px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
              <span>🎯 {t("ptsRuleExact")}</span>
              <span>✓ {t("ptsRuleCorrect")}</span>
              <span>✗ {t("ptsRuleWrong")}</span>
            </div>
          </div>

          {/* Champion Pick Table */}
          {champion && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2">
                  🏆 {t("championPickTableTitle")}
                </h2>
                {champion.championTeam && (
                  <span className="flex items-center gap-2 text-[13px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "#FFF8E1", color: "#F57F17", border: "1px solid #FFE082" }}>
                    {champion.championTeam.flagUrl && (
                      <img src={champion.championTeam.flagUrl} alt="" className="w-5 h-5 object-contain" />
                    )}
                    {t("championPickConfirmed")}: {champion.championTeam.name}
                  </span>
                )}
              </div>

              <div className="kp-card" style={{ padding: 0, overflow: "hidden" }}>
                {!champion.isLocked && champion.allPicks.length === 0 ? (
                  <p className="text-center text-[13px] text-muted-foreground py-10">
                    {t("championPickNotRevealed")}
                  </p>
                ) : champion.allPicks.length === 0 ? (
                  <p className="text-center text-[13px] text-muted-foreground py-10">
                    {t("championPickNoData")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="kp-table min-w-[560px]">
                      <thead>
                        <tr>
                          <th>{t("championPickColMember")}</th>
                          <th>{t("championPickColTeam")}</th>
                          <th className="th-center">{t("championPickColResult")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {champion.allPicks.map((row) => {
                          const isMe = row.nickname === myNickname;
                          return (
                            <tr key={row.memberId} className={isMe ? "bg-green-50/50" : "hover:bg-gray-50"}>
                              <td style={{ fontWeight: isMe ? 700 : 500, fontSize: "14px", color: isMe ? "#2F7D5C" : "#1f2937" }}>
                                {row.nickname}
                                {isMe && (
                                  <span className="inline-flex items-center gap-1 ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ color: "#2F7D5C", backgroundColor: "#E8F5E9" }}>
                                    {t("youLabel")}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className="flex items-center gap-2 text-[13px] font-semibold">
                                  {row.team.flagUrl ? (
                                    <img src={row.team.flagUrl} alt="" className="w-5 h-5 object-contain rounded-sm" />
                                  ) : (
                                    <span className="w-5 h-5 rounded-sm bg-gray-100 flex items-center justify-center text-[10px]">
                                      {row.team.shortName?.slice(0, 2) ?? row.team.name.slice(0, 2)}
                                    </span>
                                  )}
                                  {row.team.name}
                                </span>
                              </td>
                              <td className="td-center">
                                {row.isCorrect === null ? (
                                  <span className="text-[11px] font-semibold text-gray-400">
                                    {t("championPickPending")}
                                  </span>
                                ) : row.isCorrect ? (
                                  <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFF8E1", color: "#F57F17", border: "1px solid #FFE082" }}>
                                    {t("championBadge")}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-gray-400">✗</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </NavigationShell>
  );
}
