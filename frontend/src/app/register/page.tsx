"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { Globe } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim() || !passcode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await apiClient("/auth/register", {
        method: "POST",
        json: { 
          username: username.trim(), 
          displayName: displayName.trim(),
          passcode: passcode.trim() 
        }
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: '#F8F7F2' }}>
      {/* Language Switcher Widget */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-white border border-border px-3 py-1.5 rounded-full shadow-sm">
        <Globe size={14} className="text-gray-400 mr-1" />
        <button
          onClick={() => setLanguage("vi")}
          className={`text-[12px] font-extrabold px-1.5 py-0.5 rounded transition-all ${
            language === "vi" ? "text-primary-strong bg-green-50" : "text-gray-400 hover:text-gray-600"
          }`}
          style={{ color: language === "vi" ? "#2F7D5C" : undefined }}
        >
          VIE
        </button>
        <span className="text-[11px] text-gray-300">|</span>
        <button
          onClick={() => setLanguage("en")}
          className={`text-[12px] font-extrabold px-1.5 py-0.5 rounded transition-all ${
            language === "en" ? "text-primary-strong bg-green-50" : "text-gray-400 hover:text-gray-600"
          }`}
          style={{ color: language === "en" ? "#2F7D5C" : undefined }}
        >
          EN
        </button>
      </div>

      {/* Background pattern */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse at 20% 20%, rgba(47,125,92,0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(244,162,97,0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 60% 10%, rgba(47,125,92,0.06) 0%, transparent 40%)
        `
      }} />

      {/* Floating background emojis */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {['⚽','🏆','🥅','📋','⚽'].map((emoji, i) => (
          <span
            key={i}
            className="absolute opacity-[0.04]"
            style={{
              fontSize: [100, 70, 60, 90, 50][i] + 'px',
              top: ['5%','20%','85%','30%','50%'][i],
              left: i % 2 === 0 ? ['8%','','15%','','3%'][i] : undefined,
              right: i % 2 !== 0 ? ['10%','','','8%',''][i] : undefined,
              animation: `float 20s ease-in-out infinite`,
              animationDelay: `${-i * 5}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-[20px] text-4xl mb-5" style={{
            background: 'linear-gradient(135deg, #2F7D5C, #1a5c40)',
            boxShadow: '0 8px 24px rgba(47,125,92,0.3)',
          }}>
            ⚽
          </div>
          <div className="text-[28px] font-extrabold text-foreground" style={{ letterSpacing: '-0.5px' }}>{t("appName")}</div>
          <div className="text-[14px] text-muted-foreground mt-1.5">{t("createAccount")}</div>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl p-8" style={{
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255,255,255,0.8)',
        }}>
          <form onSubmit={handleRegister}>
            {/* Username field */}
            <div className="mb-4">
              <label htmlFor="username" className="block text-[13px] font-semibold text-gray-700 mb-2">
                {t("username")}
              </label>
              <input
                id="username"
                type="text"
                required
                disabled={loading}
                placeholder="Enter Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                  setError(null);
                }}
                autoComplete="username"
                spellCheck={false}
                className={`w-full px-[16px] py-[12px] rounded-xl text-[15px] font-semibold text-center transition-all ${
                  error
                    ? 'border-2 border-destructive bg-red-50 shadow-[0_0_0_4px_rgba(220,38,38,0.08)]'
                    : 'border-2 border-border bg-gray-50 focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(47,125,92,0.1)]'
                }`}
                style={{ outline: 'none' }}
              />
              <div className="text-[11px] text-gray-400 mt-1">
                {t("usernameHelp")}
              </div>
            </div>

            {/* Display Name field */}
            <div className="mb-4">
              <label htmlFor="displayName" className="block text-[13px] font-semibold text-gray-700 mb-2">
                {t("displayName")}
              </label>
              <input
                id="displayName"
                type="text"
                required
                disabled={loading}
                placeholder="Enter Display Name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError(null);
                }}
                spellCheck={false}
                className={`w-full px-[16px] py-[12px] rounded-xl text-[15px] font-semibold text-center transition-all ${
                  error
                    ? 'border-2 border-destructive bg-red-50 shadow-[0_0_0_4px_rgba(220,38,38,0.08)]'
                    : 'border-2 border-border bg-gray-50 focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(47,125,92,0.1)]'
                }`}
                style={{ outline: 'none' }}
              />
            </div>

            {/* Passcode field */}
            <div className="mb-5">
              <label htmlFor="passcode" className="block text-[13px] font-semibold text-gray-700 mb-2">
                {t("passcode")}
              </label>
              <input
                id="passcode"
                type="password"
                required
                disabled={loading}
                placeholder={t("enterPasscode")}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(null);
                }}
                autoComplete="new-password"
                spellCheck={false}
                className={`w-full px-[16px] py-[12px] rounded-xl text-[18px] font-bold text-center transition-all ${
                  error
                    ? 'border-2 border-destructive bg-red-50 shadow-[0_0_0_4px_rgba(220,38,38,0.08)]'
                    : 'border-2 border-border bg-gray-50 focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(47,125,92,0.1)]'
                }`}
                style={{ outline: 'none' }}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-lg text-[13px] font-medium" style={{
                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
              }}>
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[14px] rounded-xl text-[16px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #2F7D5C, #245F46)',
                boxShadow: '0 4px 12px rgba(47,125,92,0.3)',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.01em',
              }}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                t("register")
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5 text-gray-400 text-[12px]">
            <span className="flex-1 h-px bg-border" />
            {t("alreadyHaveAccount")}
            <span className="flex-1 h-px bg-border" />
          </div>

          {/* Login Link */}
          <a
            href="/login"
            className="block text-center text-[14px] font-semibold py-2.5 rounded-lg transition-all"
            style={{
              color: '#2F7D5C', border: '1.5px solid #BBF7D0', background: '#F0FDF4',
            }}
          >
            {t("loginBack")}
          </a>
        </div>
      </div>
    </div>
  );
}
