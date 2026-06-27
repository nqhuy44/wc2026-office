"use client";

import NavigationShell from "@/components/navigation-shell";
import { useLanguage } from "@/context/language-context";

export default function RulesPage() {
  const { t } = useLanguage();

  return (
    <NavigationShell>
      <h1 className="text-[24px] font-bold text-foreground mb-1">{t("rulesTitle")}</h1>
      <p className="text-[14px] text-muted-foreground mb-8">{t("rulesSub")}</p>

      <div className="space-y-6 max-w-2xl">

        {/* Quick summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: "🎯", pts: t("rulesExactPts"), label: t("rulesExact") },
            { emoji: "✓",  pts: t("rulesCorrectPts"), label: t("rulesCorrect") },
            { emoji: "✗",  pts: t("rulesWrongPts"), label: t("rulesWrong") },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-border rounded-xl p-4 text-center shadow-sm">
              <div className="text-[28px] mb-1">{item.emoji}</div>
              <div className="text-[20px] font-extrabold" style={{ color: '#2F7D5C' }}>{item.pts}</div>
              <div className="text-[11px] text-muted-foreground font-semibold mt-0.5 leading-snug">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Section 1 */}
        <section className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold text-foreground mb-2 flex items-center gap-2">
            ⚽ {t("rulesSection1Title")}
          </h2>
          <p className="text-[13px] text-gray-600 leading-relaxed">{t("rulesSection1Desc")}</p>
        </section>

        {/* Section 2: Scoring */}
        <section className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold text-foreground mb-4 flex items-center gap-2">
            📊 {t("rulesSection2Title")}
          </h2>
          <div className="space-y-3">
            {[
              { color: "#2F7D5C", bg: "#E8F5E9", border: "#C8E6C9", emoji: "🎯", pts: t("rulesExactPts"),   label: t("rulesExact"),   desc: t("rulesExactDesc") },
              { color: "#1565C0", bg: "#E3F2FD", border: "#BBDEFB", emoji: "✓",  pts: t("rulesCorrectPts"), label: t("rulesCorrect"), desc: t("rulesCorrectDesc") },
              { color: "#9E9E9E", bg: "#F5F5F5", border: "#E0E0E0", emoji: "✗",  pts: t("rulesWrongPts"),   label: t("rulesWrong"),   desc: t("rulesWrongDesc") },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3 p-3 rounded-lg border" style={{ background: row.bg, borderColor: row.border }}>
                <span className="text-[20px] leading-none mt-0.5">{row.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-extrabold" style={{ color: row.color }}>{row.pts}</span>
                    <span className="text-[13px] font-semibold text-gray-700">{row.label}</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mt-0.5">{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Lock */}
        <section className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
            🔒 {t("rulesSection3Title")}
          </h2>
          <div className="space-y-2 text-[13px] text-gray-600 leading-relaxed">
            <p>{t("rulesLockDesc")}</p>
            <p>{t("rulesChangeDesc")}</p>
          </div>
        </section>

        {/* Section 4: Champion pick */}
        <section className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: '#FFD700' }}>
          <h2 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
            🏆 {t("rulesSection4Title")}
          </h2>
          <div className="space-y-2 text-[13px] text-gray-600 leading-relaxed">
            <p>{t("rulesChampionDesc")}</p>
            <p className="font-semibold text-gray-800">{t("rulesChampionLock")}</p>
            <p>{t("rulesChampionBadge")}</p>
            <p className="text-[12px] text-gray-400 italic">{t("rulesChampionNote")}</p>
          </div>
        </section>

        {/* Section 5: Rankings */}
        <section className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
            🏅 {t("rulesSection5Title")}
          </h2>
          <p className="text-[13px] text-gray-600 mb-3">{t("rulesTiebreakerList")}</p>
          <ol className="space-y-1.5 text-[13px] text-gray-700">
            {[t("rulesTiebreakerStep1"), t("rulesTiebreakerStep2"), t("rulesTiebreakerStep3"), t("rulesTiebreakerStep4")].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-extrabold grid place-items-center text-white" style={{ background: '#2F7D5C' }}>
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        {/* Section 6: Void */}
        <section className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold text-foreground mb-2 flex items-center gap-2">
            🚫 {t("rulesSection6Title")}
          </h2>
          <p className="text-[13px] text-gray-600 leading-relaxed">{t("rulesVoidDesc")}</p>
        </section>

        {/* Section 7: Knockout Bonus */}
        <section className="bg-white border-2 border-amber-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold text-foreground mb-2 flex items-center gap-2">
            ⚡ {t("rulesSection7Title")}
          </h2>
          <p className="text-[13px] text-gray-600 mb-4">{t("rulesSection7Desc")}</p>

          <div className="space-y-4">
            {/* Bonus table */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-extrabold bg-amber-300 text-amber-900 px-2 py-0.5 rounded">BONUS</span>
                <span className="text-[13px] font-extrabold text-amber-900">{t("rulesKnockoutBonusHow")}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-1.5 pr-4 text-gray-500 font-semibold"></th>
                      <th className="text-center py-1.5 px-3 text-gray-600 font-extrabold">{t("rulesColNormal")}</th>
                      <th className="text-center py-1.5 px-3 text-amber-800 font-extrabold border-l-2 border-amber-300">BONUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "🎯 " + t("rulesRowExact"),   normal: "+3", bonus: "+3+3 = +6", bonusColor: "#92400e" },
                      { label: "✓ " + t("rulesRowCorrect"), normal: "+1", bonus: "+1+2 = +3", bonusColor: "#92400e" },
                      { label: "✗ " + t("rulesRowWrong"),   normal: "0",  bonus: "0",         bonusColor: "#9ca3af" },
                    ].map((row) => (
                      <tr key={row.label} className="border-t border-amber-100">
                        <td className="py-2 pr-4 text-gray-700 font-semibold whitespace-nowrap">{row.label}</td>
                        <td className="text-center py-2 px-3 font-extrabold text-gray-700">{row.normal}</td>
                        <td className="text-center py-2 px-3 font-extrabold border-l-2 border-amber-300" style={{ color: row.bonusColor }}>{row.bonus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ET scoring */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="text-[13px] font-extrabold text-blue-900 mb-1">⏱ {t("rulesKnockoutETTitle")}</div>
              <p className="text-[12px] text-blue-800 leading-relaxed">{t("rulesKnockoutETDesc")}</p>
            </div>
          </div>
        </section>

        {/* Section 8: Hope Star */}
        <section className="bg-white border-2 border-yellow-300 rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold text-foreground mb-2 flex items-center gap-2">
            {t("rulesSection8Title")}
          </h2>
          <p className="text-[13px] text-gray-600 leading-relaxed mb-4">{t("rulesHopeStarDesc")}</p>

          {/* Full combo table */}
          <div className="mb-4">
            <div className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider mb-2">{t("rulesAllCombosTitle")}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold border-b border-gray-200"></th>
                    <th className="text-center py-2 px-3 text-gray-700 font-extrabold border-b border-l border-gray-200">{t("rulesColNormal")}</th>
                    <th className="text-center py-2 px-3 font-extrabold border-b border-l border-gray-200" style={{ color: "#d97706" }}>{t("rulesColBonus")}</th>
                    <th className="text-center py-2 px-3 font-extrabold border-b border-l border-gray-200" style={{ color: "#854d0e" }}>⭐ {t("rulesColHopeStar")}</th>
                    <th className="text-center py-2 px-3 font-extrabold border-b border-l border-gray-200 bg-yellow-50" style={{ color: "#713f12" }}>⭐ + BONUS</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "🎯 " + t("rulesRowExact"),   n: "+3", b: "+6", hs: "+6", hsb: "+9", hsColor: "#15803d", nColor: "#374151" },
                    { label: "✓ " + t("rulesRowCorrect"), n: "+1", b: "+3", hs: "+2", hsb: "+4", hsColor: "#1d4ed8", nColor: "#374151" },
                    { label: "✗ " + t("rulesRowWrong"),   n: "0",  b: "0",  hs: "−2", hsb: "−2", hsColor: "#b91c1c", nColor: "#9ca3af" },
                  ].map((row) => (
                    <tr key={row.label} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-gray-700 font-semibold whitespace-nowrap">{row.label}</td>
                      <td className="text-center py-2.5 px-3 font-extrabold border-l border-gray-200" style={{ color: row.nColor }}>{row.n}</td>
                      <td className="text-center py-2.5 px-3 font-extrabold border-l border-gray-200 text-amber-700">{row.b}</td>
                      <td className="text-center py-2.5 px-3 font-extrabold border-l border-gray-200" style={{ color: row.hsColor }}>{row.hs}</td>
                      <td className="text-center py-2.5 px-3 font-extrabold border-l border-gray-200 bg-yellow-50" style={{ color: row.hsColor }}>{row.hsb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-3">
            💡 {t("rulesHopeStarFormula")}
          </div>
          <div className="space-y-1 text-[12px] text-gray-500">
            <p>• {t("rulesHopeStarNote")}</p>
            <p>• {t("rulesHopeStarDisabled")}</p>
          </div>
        </section>

      </div>
    </NavigationShell>
  );
}
