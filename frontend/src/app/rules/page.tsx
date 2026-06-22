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

        {/* Section 7: Knockout */}
        <section className="bg-white border-2 border-amber-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold text-foreground mb-2 flex items-center gap-2">
            ⚡ {t("rulesSection7Title")}
          </h2>
          <p className="text-[13px] text-gray-600 mb-4">{t("rulesSection7Desc")}</p>

          <div className="space-y-4">
            {/* Multiplier */}
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
              <div className="text-[13px] font-extrabold text-amber-900 mb-1 flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold bg-amber-200 text-amber-800 px-2 py-0.5 rounded">x2 / x3</span>
                {t("rulesKnockoutMultiplierTitle")}
              </div>
              <p className="text-[12px] text-amber-800 leading-relaxed mb-2">{t("rulesKnockoutMultiplierDesc")}</p>
              <p className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded">{t("rulesKnockoutMultiplierTable")}</p>
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

          <div className="mb-3">
            <div className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider mb-2">{t("rulesHopeStarTableTitle")}</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { bg: '#E8F5E9', border: '#A5D6A7', color: '#2E7D32', text: t("rulesHopeStarX1Exact") },
                { bg: '#E3F2FD', border: '#90CAF9', color: '#1565C0', text: t("rulesHopeStarX1Correct") },
                { bg: '#FEE2E2', border: '#FCA5A5', color: '#B91C1C', text: t("rulesHopeStarX1Wrong") },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border p-3 text-center text-[12px] font-bold" style={{ background: item.bg, borderColor: item.border, color: item.color }}>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[12px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-2">
            ✨ {t("rulesHopeStarCombo")}
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
