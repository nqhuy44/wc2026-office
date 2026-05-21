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

interface Participant {
  id: string;
  nickname: string;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [me, setMe] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  useEffect(() => {
    async function load() {
      try {
        const [lbData, meData] = await Promise.all([
          apiClient<{ leaderboard: LeaderboardItem[] }>("/leaderboard"),
          apiClient<{ participant: Participant }>("/auth/me"),
        ]);
        setLeaderboard(lbData.leaderboard);
        setMe(meData.participant);
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxPts = leaderboard.length > 0 ? leaderboard[0].totalPoints : 1;
  const myRank = leaderboard.findIndex((item) => item.nickname === me?.nickname) + 1;
  const myItem = leaderboard.find((item) => item.nickname === me?.nickname);
  const leader = leaderboard[0];

  return (
    <NavigationShell>
      <h1 className="text-[24px] font-bold text-foreground mb-1">
        {t("leaderboardTitle")}
      </h1>
      <p className="text-[14px] text-muted-foreground mb-6">
        {t("leaderboardSub").replace("{count}", leaderboard.length.toString())}
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>
            {t("loadingLeaderboard")}
          </p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-dashed border-border bg-muted text-muted-foreground bg-white">
          <p className="text-[14px]">
            {t("noLeaderboardPlayers")}
          </p>
        </div>
      ) : (
        <>
          {/* Stat Summary Bar */}
          <div className="kp-card flex items-center gap-4 flex-wrap mb-6" style={{ padding: '14px 20px' }}>
            {[
              { icon: '📋', label: t("statScoredLabel"), val: leaderboard[0]?.totalPredictions ?? 0 },
              { icon: '👥', label: t("statPlayersLabel"), val: leaderboard.length },
              { icon: '🏆', label: t("statLeaderLabel"), val: leader?.nickname ?? '—' },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-2">
                {i > 0 && <div className="w-px h-5 bg-border" />}
                <span className="text-[13px] text-gray-600 flex items-center gap-1.5 ml-2">
                  {stat.icon} {stat.label}: <strong className="text-foreground">{stat.val}</strong>
                </span>
              </div>
            ))}
          </div>

          {/* Leaderboard Table */}
          <div className="kp-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="kp-table">
              <thead>
                <tr>
                  <th style={{ width: '44px' }}>#</th>
                  <th style={{ width: '40px' }}></th>
                  <th>{t("colDisplayName")}</th>
                  <th className="th-center">{t("colPoints")}</th>
                  <th className="th-center" style={{ minWidth: '80px' }}>{t("colGap")}</th>
                  <th className="th-center">{t("colExact")}</th>
                  <th className="th-center">{t("colCorrect")}</th>
                  <th className="th-center">{t("colWrong")}</th>
                  <th className="th-center">{t("colPlayed")}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item, index) => {
                  const rank = index + 1;
                  const isMe = item.nickname === me?.nickname;
                  const wrongCount = item.totalPredictions - item.exactMatches - item.correctResults;

                  return (
                    <tr key={item.id} className={`${isMe ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                      <td style={{ fontWeight: rank <= 3 ? 800 : 600, fontSize: '14px', color: rank <= 3 ? '#111827' : '#6B7280', borderLeft: rank <= 3 ? '3px solid #2F7D5C' : '3px solid transparent' }}>
                        {rank}
                      </td>
                      <td style={{ fontSize: '18px', textAlign: 'center' }}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''}
                      </td>
                      <td style={{ fontWeight: isMe ? 700 : 500, fontSize: '14px', color: isMe ? '#2F7D5C' : '#1f2937' }}>
                        {item.nickname}
                        {isMe && (
                          <span className="inline-flex items-center gap-1 ml-2 text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ color: '#2F7D5C', backgroundColor: '#E8F5E9' }}>
                            {t("youLabel")}
                          </span>
                        )}
                      </td>
                      <td className="td-center" style={{ fontSize: '16px', fontWeight: rank <= 3 ? 800 : 700, color: '#111827' }}>
                        {item.totalPoints}
                      </td>
                      <td className="td-center">
                        <span className="text-[12px] font-medium text-gray-500">
                          {rank > 1 ? `-${leaderboard[0].totalPoints - item.totalPoints}` : '—'}
                        </span>
                      </td>
                      <td className="td-center" style={{ color: '#4B5563', fontWeight: 600 }}>{item.exactMatches}</td>
                      <td className="td-center" style={{ color: '#6B7280', fontWeight: 500 }}>{item.correctResults}</td>
                      <td className="td-center" style={{ color: '#9CA3AF' }}>{wrongCount > 0 ? wrongCount : 0}</td>
                      <td className="td-center" style={{ color: '#9CA3AF' }}>{item.totalPredictions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>

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
        </>
      )}
    </NavigationShell>
  );
}
