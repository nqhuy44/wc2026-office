"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  BarChart3,
  Target,
  LogOut,
  Menu,
  X,
  Users,
  Building,
  Settings,
  FileText,
  ShieldAlert,
  Building2,
  ChevronDown,
  Globe,
  UserPlus,
  KeyRound,
  BookOpen,
} from "lucide-react";

interface Membership {
  id: string;
  leagueId: string;
  nickname: string;
  role: string; // PLAYER or ADMIN
  confirmationStatus: string;
  league: {
    id: string;
    name: string;
    slug: string;
  };
}

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string; // USER or SUPER_ADMIN
  memberships: Membership[];
}

function NavigationShellContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changePasscodeOpen, setChangePasscodeOpen] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpSaving, setCpSaving] = useState(false);
  const [activeLeagueId, setActiveLeagueId] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await apiClient<{ user: User }>("/auth/me");
        const currentUser = data.user;
        setUser(currentUser);

        // Manage active league selection
        if (currentUser.memberships.length > 0) {
          const storedLeagueId = localStorage.getItem("activeLeagueId");
          const hasStored = currentUser.memberships.some(m => m.leagueId === storedLeagueId);
          
          if (storedLeagueId && hasStored) {
            setActiveLeagueId(storedLeagueId);
          } else {
            // Default to first membership league
            const firstLeagueId = currentUser.memberships[0].leagueId;
            localStorage.setItem("activeLeagueId", firstLeagueId);
            setActiveLeagueId(firstLeagueId);
          }
        }
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
      localStorage.removeItem("activeLeagueId");
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      router.push("/login");
    }
  };

  const handleLeagueChange = (leagueId: string) => {
    localStorage.setItem("activeLeagueId", leagueId);
    setActiveLeagueId(leagueId);
    // Reload to refresh all data scopes with the new league
    window.location.reload();
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError("");
    if (cpNew !== cpConfirm) {
      setCpError(t("passcodesMismatch"));
      return;
    }
    setCpSaving(true);
    try {
      await apiClient("/auth/me/change-passcode", {
        method: "POST",
        json: { currentPasscode: cpCurrent, newPasscode: cpNew },
      });
      setChangePasscodeOpen(false);
      setCpCurrent(""); setCpNew(""); setCpConfirm("");
      alert(t("passcodeChanged"));
    } catch (err: any) {
      setCpError(err.code ? t(err.code as any) : t("errUnknown"));
    } finally {
      setCpSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent animate-spin-fast" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }}></div>
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  
  // Find current membership details
  const activeMembership = user.memberships.find(m => m.leagueId === activeLeagueId);
  const isAdmin = activeMembership?.role === "ADMIN" || isSuperAdmin;
  const currentNickname = activeMembership?.nickname || user.displayName;

  const playerMenuItems = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("matches"), href: "/matches", icon: Calendar },
    { name: t("standings"), href: "/standings", icon: Trophy },
    { name: t("leaderboard"), href: "/leaderboard", icon: BarChart3 },
    { name: t("predictions"), href: "/predictions", icon: Target },
    { name: t("rules"), href: "/rules", icon: BookOpen },
  ];

  const adminMenuItems = [
    { name: t("adminDashboard"), href: "/admin?tab=dashboard", tab: "dashboard", icon: ShieldAlert },
    { name: t("players"), href: "/admin?tab=players", tab: "players", icon: Users },
    { name: t("matches"), href: "/admin?tab=matches", tab: "matches", icon: Calendar },
    { name: t("adminPredictions"), href: "/admin?tab=predictions", tab: "predictions", icon: Target },
    { name: t("settings"), href: "/admin?tab=settings", tab: "settings", icon: Settings },
  ];

  const superAdminMenuItems = [
    { name: t("superAdminLeagues"), href: "/superadmin?tab=leagues", tab: "leagues", icon: Building },
    { name: t("superAdminMembers"), href: "/superadmin?tab=members", tab: "members", icon: UserPlus },
    { name: t("globalUsers"), href: "/superadmin?tab=users", tab: "users", icon: Users },
  ];

  const isPlayerItemActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isAdminItemActive = (_href: string, tab?: string) => pathname.startsWith("/admin") && currentTab === tab;
  const isSuperAdminItemActive = (_href: string, tab?: string) => pathname.startsWith("/superadmin") && currentTab === tab;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] bg-background">
      {/* ─── Mobile Top Bar ─── */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-[56px] items-center justify-between border-b border-border bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <div>
            <div className="text-[15px] font-bold text-primary leading-tight">{t("appName")}</div>
            <div className="text-[10px] text-muted-foreground">{t("appSub")}</div>
          </div>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-9 h-9 grid place-items-center border border-border bg-white rounded"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-border bg-white transition-transform duration-150 md:relative md:translate-x-0 md:h-screen md:sticky md:top-0 overflow-y-auto ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <div>
              <div className="text-[16px] font-bold text-primary">{t("appName")}</div>
              <div className="text-[11px] text-muted-foreground">{t("appSub")}</div>
            </div>
          </div>
        </div>

        {/* User context info */}
        <div className="px-5 py-4 border-b border-border bg-gray-50/50">
          <div className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
            {t("yourProfile")}
          </div>
          <div className="text-[14px] font-bold text-foreground truncate">
            {currentNickname}
          </div>
          <div className="text-[11px] text-muted-foreground font-semibold">
            @{user.username}
          </div>
        </div>

        {/* League Selector */}
        <div className="px-5 py-3 border-b border-border">
          <div className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
            {t("activeLeague")}
          </div>
          {user.memberships.length > 0 ? (
            <div className="relative group">
              <select
                value={activeLeagueId}
                onChange={(e) => handleLeagueChange(e.target.value)}
                className="w-full appearance-none bg-white border border-border rounded-lg px-3 py-2 text-[13px] font-semibold text-foreground cursor-pointer focus:outline-none focus:border-primary pr-8"
              >
                {user.memberships.map((m) => (
                  <option key={m.leagueId} value={m.leagueId}>
                    {m.league.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          ) : (
            <p className="text-[11px] text-warning font-semibold">
              {t("noLeagueMsg")}
            </p>
          )}
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5">
          {user.memberships.length > 0 && (
            <>
              {playerMenuItems.map((item) => {
                const active = isPlayerItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-[10px] px-5 py-[10px] text-[14px] transition-all relative ${
                      active
                        ? "bg-sidebar-accent text-primary font-semibold border-r-[3px] border-primary"
                        : "text-foreground/80 hover:bg-sidebar-accent hover:text-primary"
                    }`}
                  >
                    <Icon size={16} />
                    {item.name}
                  </Link>
                );
              })}

              {/* Admin Menu Section */}
              {isAdmin && (
                <>
                  <div className="h-px bg-border mx-5 my-2" />
                  <div className="px-5 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("adminDashboard")}</span>
                  </div>
                  {adminMenuItems.map((item) => {
                    const active = isAdminItemActive(item.href, item.tab);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-[10px] px-5 py-[10px] text-[14px] transition-all relative ${
                          active
                            ? "bg-sidebar-accent text-primary font-semibold border-r-[3px] border-primary"
                            : "text-foreground/80 hover:bg-sidebar-accent hover:text-primary"
                        }`}
                      >
                        <Icon size={16} />
                        {item.name}
                      </Link>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <>
              <div className="h-px bg-border mx-5 my-2" />
              <div className="px-5 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Platform Admin</span>
              </div>
              {superAdminMenuItems.map((item) => {
                const active = isSuperAdminItemActive(item.href, item.tab);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-[10px] px-5 py-[10px] text-[14px] transition-all relative ${
                      active
                        ? "bg-sidebar-accent text-primary font-semibold border-r-[3px] border-primary"
                        : "text-foreground/80 hover:bg-sidebar-accent hover:text-primary"
                    }`}
                  >
                    <Icon size={16} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Language Switcher & Logout */}
        <div className="border-t border-border px-5 py-3.5 flex flex-col gap-3 bg-gray-50/20">
          <div className="flex items-center gap-2 text-[12px] text-gray-500 font-bold">
            <Globe size={13} className="text-gray-400" />
            <button
              onClick={() => setLanguage("vi")}
              className={`hover:text-primary transition-all px-1.5 py-0.5 rounded ${
                language === "vi" ? "text-primary bg-green-50 font-extrabold" : "text-gray-400 font-semibold"
              }`}
              style={{ color: language === "vi" ? "#2F7D5C" : undefined }}
            >
              VIE
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setLanguage("en")}
              className={`hover:text-primary transition-all px-1.5 py-0.5 rounded ${
                language === "en" ? "text-primary bg-green-50 font-extrabold" : "text-gray-400 font-semibold"
              }`}
              style={{ color: language === "en" ? "#2F7D5C" : undefined }}
            >
              EN
            </button>
          </div>
          <button
            onClick={() => { setChangePasscodeOpen(true); setCpError(""); setCpCurrent(""); setCpNew(""); setCpConfirm(""); }}
            className="flex items-center gap-[10px] text-[13px] text-muted-foreground hover:text-primary transition-colors w-full"
          >
            <KeyRound size={14} />
            {t("changePasscodeSidebarBtn")}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-[10px] text-[13px] text-muted-foreground hover:text-destructive transition-colors w-full"
          >
            <LogOut size={14} />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-h-screen pt-[56px] md:pt-0">
        <div className="p-5 md:p-8 w-full">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Change Passcode Modal */}
      {changePasscodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-border">
            <div className="flex items-center gap-2 mb-5">
              <KeyRound size={18} style={{ color: "#2F7D5C" }} />
              <h2 className="text-[17px] font-bold text-foreground">{t("changePasscodeTitle")}</h2>
            </div>
            <form onSubmit={handleChangePasscode} className="space-y-4">
              <div className="grid gap-1.5">
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  {t("currentPasscodeLabel")}
                </label>
                <input
                  type="password"
                  required
                  value={cpCurrent}
                  onChange={(e) => setCpCurrent(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 bg-white border border-border rounded-lg text-foreground outline-none focus:border-primary text-sm transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  {t("newPasscodeLabel")}
                </label>
                <input
                  type="password"
                  required
                  minLength={3}
                  value={cpNew}
                  onChange={(e) => setCpNew(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 bg-white border border-border rounded-lg text-foreground outline-none focus:border-primary text-sm transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  {t("confirmNewPasscodeLabel")}
                </label>
                <input
                  type="password"
                  required
                  minLength={3}
                  value={cpConfirm}
                  onChange={(e) => setCpConfirm(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 bg-white border border-border rounded-lg text-foreground outline-none focus:border-primary text-sm transition-all"
                />
              </div>
              {cpError && (
                <p className="text-[13px] text-red-600 font-semibold">{cpError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setChangePasscodeOpen(false)}
                  className="flex-1 min-h-[38px] px-4 py-2 border border-border bg-white rounded-lg font-bold text-[13px] text-muted-foreground hover:bg-gray-50 transition-all"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={cpSaving}
                  className="flex-1 min-h-[38px] px-4 py-2 text-white font-extrabold rounded-lg text-[13px] transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#2F7D5C" }}
                >
                  {cpSaving ? t("saving") : t("changePasscodeTitle")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent animate-spin-fast" style={{ borderColor: '#2F7D5C', borderTopColor: 'transparent' }}></div>
          <p className="text-sm font-bold text-muted-foreground" style={{ color: '#2F7D5C' }}>{t("loadingWorkspace")}</p>
        </div>
      </div>
    }>
      <NavigationShellContent>{children}</NavigationShellContent>
    </Suspense>
  );
}
