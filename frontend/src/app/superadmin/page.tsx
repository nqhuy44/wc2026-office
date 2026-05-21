"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { 
  ShieldAlert, 
  Plus, 
  UserPlus, 
  Building, 
  Users, 
  Trash2, 
  Key,
  Globe,
  Settings,
  ArrowRight
} from "lucide-react";

interface League {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    members: number;
    leagueMatches: number;
  };
}

interface Participant {
  id: string;
  nickname: string;
  role: string;
  contributionStatus: string;
  username: string;
  displayName: string;
  isActive: boolean;
}

interface GlobalUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    memberships: number;
  };
}

function SuperAdminContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "leagues";
  const { language, t } = useLanguage();
  const router = useRouter();

  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Global Users State
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);
  const [loadingGlobalUsers, setLoadingGlobalUsers] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // Form create league
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newLeagueSlug, setNewLeagueSlug] = useState("");
  const [creatingLeague, setCreatingLeague] = useState(false);

  // Form add member
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberNickname, setNewMemberNickname] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"PLAYER" | "ADMIN">("PLAYER");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const meData = await apiClient<{ user: { role: string } }>("/auth/me");
        if (meData.user.role !== "SUPER_ADMIN") {
          router.push("/dashboard");
          return;
        }
      } catch (err) {
        router.push("/login");
        return;
      }
      setCheckingAuth(false);
      loadLeagues();
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedLeagueId) {
      loadMembers(selectedLeagueId);
    } else {
      setParticipants([]);
    }
  }, [selectedLeagueId]);

  const loadLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const data = await apiClient<{ leagues: League[] }>("/superadmin/leagues");
      setLeagues(data.leagues);
      if (data.leagues.length > 0 && !selectedLeagueId) {
        setSelectedLeagueId(data.leagues[0].id);
      }
    } catch (err) {
      console.error("Failed to load leagues:", err);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const loadMembers = async (leagueId: string) => {
    setLoadingMembers(true);
    try {
      const data = await apiClient<{ participants: Participant[] }>(`/superadmin/leagues/${leagueId}/participants`);
      setParticipants(data.participants);
    } catch (err) {
      console.error("Failed to load league members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim() || !newLeagueSlug.trim()) return;

    setCreatingLeague(true);
    try {
      const slug = newLeagueSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      const data = await apiClient<{ league: League }>("/superadmin/leagues", {
        method: "POST",
        json: { name: newLeagueName.trim(), slug }
      });
      setLeagues((prev) => [data.league, ...prev]);
      if (!selectedLeagueId) {
        setSelectedLeagueId(data.league.id);
      }
      setNewLeagueName("");
      setNewLeagueSlug("");
      alert(t("leagueSuccessCreated"));
    } catch (err: any) {
      alert(err.message || t("failedToCreateLeague"));
    } finally {
      setCreatingLeague(false);
    }
  };

  const handleDeleteLeague = async (leagueId: string, name: string) => {
    if (!confirm(t("deleteLeagueConfirm").replace("{name}", name))) return;

    try {
      await apiClient(`/superadmin/leagues/${leagueId}`, { method: "DELETE" });
      setLeagues((prev) => prev.filter((l) => l.id !== leagueId));
      if (selectedLeagueId === leagueId) {
        setSelectedLeagueId("");
      }
      alert(t("deletedLeagueAlert").replace("{name}", name));
    } catch (err: any) {
      alert(err.message || t("failedToDeleteLeague"));
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeagueId || !newMemberUsername.trim()) return;

    setAddingMember(true);
    try {
      const username = newMemberUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!username) {
        alert(t("invalidUsernameAlert"));
        setAddingMember(false);
        return;
      }
      const data = await apiClient<{ participant: Participant }>(`/superadmin/leagues/${selectedLeagueId}/participants`, {
        method: "POST",
        json: { 
          username, 
          nickname: newMemberNickname.trim() || undefined, 
          role: newMemberRole 
        }
      });
      setParticipants((prev) => [data.participant, ...prev]);
      setNewMemberUsername("");
      setNewMemberNickname("");
      alert(t("memberSuccessAdded"));
    } catch (err: any) {
      alert(err.message || t("failedToCreate"));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string, nickname: string) => {
    if (!confirm(t("confirmRemove").replace("{name}", nickname))) return;

    try {
      await apiClient(`/superadmin/participants/${memberId}`, { method: "DELETE" });
      setParticipants((prev) => prev.filter((p) => p.id !== memberId));
      alert(t("memberRemoved"));
    } catch (err: any) {
      alert(err.message || t("failedToRemoveMember"));
    }
  };

  const handleResetPasscode = async (memberId: string, nickname: string) => {
    if (!confirm(t("resetPasscodeConfirm").replace("{name}", nickname))) return;

    try {
      const data = await apiClient<{ passcode: string }>(`/superadmin/participants/${memberId}/reset-passcode`, {
        method: "POST"
      });
      alert(t("newPasscodeGenerated").replace("{name}", nickname).replace("{passcode}", data.passcode));
    } catch (err: any) {
      alert(err.message || t("failedToResetPasscode"));
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadGlobalUsers();
    }
  }, [activeTab]);

  const loadGlobalUsers = async () => {
    setLoadingGlobalUsers(true);
    try {
      const data = await apiClient<{ users: GlobalUser[] }>("/superadmin/users");
      setGlobalUsers(data.users);
    } catch (err) {
      console.error("Failed to load global users:", err);
    } finally {
      setLoadingGlobalUsers(false);
    }
  };

  const handleResetGlobalPasscode = async (userId: string, displayName: string) => {
    if (!confirm(t("resetPasscodeConfirm").replace("{name}", displayName))) return;

    try {
      const data = await apiClient<{ passcode: string }>(`/superadmin/users/${userId}/reset-passcode`, {
        method: "POST"
      });
      alert(t("newPasscodeGenerated").replace("{name}", displayName).replace("{passcode}", data.passcode));
    } catch (err: any) {
      alert(err.message || t("failedToResetPasscode"));
    }
  };

  const handleDeleteGlobalUser = async (userId: string, displayName: string) => {
    if (!confirm(t("deleteUserConfirm").replace("{name}", displayName))) return;

    try {
      await apiClient(`/superadmin/users/${userId}`, { method: "DELETE" });
      setGlobalUsers((prev) => prev.filter((u) => u.id !== userId));
      alert(t("deletedUserAlert").replace("{name}", displayName));
    } catch (err: any) {
      alert(err.message || t("failedToDeleteUser"));
    }
  };

  const handleChangeGlobalUserRole = async (userId: string, displayName: string, currentRole: string) => {
    const targetRole = currentRole === "SUPER_ADMIN" ? "USER" : "SUPER_ADMIN";
    const confirmKey = targetRole === "SUPER_ADMIN" ? "promoteToSuperAdminConfirm" : "demoteFromSuperAdminConfirm";
    if (!confirm(t(confirmKey).replace("{name}", displayName))) return;

    try {
      const data = await apiClient<{ user: GlobalUser }>(`/superadmin/users/${userId}/role`, {
        method: "PUT",
        json: { role: targetRole }
      });
      setGlobalUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: data.user.role } : u));
      alert(t("roleChangedAlert").replace("{name}", displayName).replace("{role}", data.user.role));
    } catch (err: any) {
      alert(err.message || t("failedToUpdateRole"));
    }
  };

  const filteredGlobalUsers = globalUsers.filter((u) => {
    const q = globalSearchQuery.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  if (checkingAuth) {
    return (
      <NavigationShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "#2F7D5C", borderTopColor: "transparent" }} />
        </div>
      </NavigationShell>
    );
  }

  return (
    <NavigationShell>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex items-center justify-between bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-primary-strong" style={{ color: "#2F7D5C" }}>
              <ShieldAlert size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">{t("superAdminTitle")}</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">{t("platformManagementDesc")}</p>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-border">
          <button
            onClick={() => router.push("/superadmin?tab=leagues")}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "leagues" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ 
              borderColor: activeTab === "leagues" ? "#2F7D5C" : "transparent",
              color: activeTab === "leagues" ? "#2F7D5C" : undefined 
            }}
          >
            <Building size={16} />
            {t("superAdminLeagues")}
          </button>
          <button
            onClick={() => router.push("/superadmin?tab=members")}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "members" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ 
              borderColor: activeTab === "members" ? "#2F7D5C" : "transparent",
              color: activeTab === "members" ? "#2F7D5C" : undefined 
            }}
          >
            <UserPlus size={16} />
            {t("superAdminMembers")}
          </button>
          <button
            onClick={() => router.push("/superadmin?tab=users")}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "users" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ 
              borderColor: activeTab === "users" ? "#2F7D5C" : "transparent",
              color: activeTab === "users" ? "#2F7D5C" : undefined 
            }}
          >
            <Users size={16} />
            {t("globalUsers")}
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "leagues" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left form */}
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-[15px] text-foreground flex items-center gap-2">
                <Plus size={16} className="text-primary-strong" style={{ color: "#2F7D5C" }} />
                {t("createLeagueBtn")}
              </h3>
              <form onSubmit={handleCreateLeague} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    {t("leagueNameLabel")}
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    placeholder="E.g. WC 2026 Internal"
                    className="w-full text-[13px] border border-border rounded-lg px-3.5 py-2.5 bg-white text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    {t("leagueSlugLabel")}
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeagueSlug}
                    onChange={(e) => setNewLeagueSlug(e.target.value)}
                    placeholder="E.g. wc-2026"
                    className="w-full text-[13px] border border-border rounded-lg px-3.5 py-2.5 bg-white text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingLeague}
                  className="w-full py-2.5 text-[13px] font-bold text-white rounded-lg transition-all"
                  style={{ background: "#2F7D5C" }}
                >
                  {creatingLeague ? t("creatingBtn") : t("createLeagueBtn")}
                </button>
              </form>
            </div>

            {/* Right table list */}
            <div className="lg:col-span-2 bg-white border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-extrabold text-[15px] text-foreground mb-4">
                {t("leagues")}
              </h3>

              {loadingLeagues ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" style={{ borderColor: "#2F7D5C", borderTopColor: "transparent" }} />
                </div>
              ) : leagues.length === 0 ? (
                <p className="text-center text-[13px] text-muted-foreground py-10">
                  {t("noLeaguesCreated")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("leagueNameLabel")}</th>
                        <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Slug</th>
                        <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">{t("colMembers")}</th>
                        <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">{t("colActions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leagues.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 text-[13px] font-semibold text-foreground">{l.name}</td>
                          <td className="py-3.5 text-[13px] text-muted-foreground font-mono">{l.slug}</td>
                          <td className="py-3.5 text-[13px] text-center font-bold text-foreground">{l._count?.members ?? 0}</td>
                          <td className="py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteLeague(l.id, l.name)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all inline-flex items-center gap-1 text-[12px] font-bold"
                            >
                              <Trash2 size={14} />
                              {t("deleteBtn")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left management card */}
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  {t("selectLeagueLabel")}
                </label>
                <select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  className="w-full text-[13px] font-semibold border border-border rounded-lg px-3 py-2.5 bg-white text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- {t("selectLeagueToManage")} --</option>
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLeagueId && (
                <div className="border-t border-border pt-4 space-y-4">
                  <h3 className="font-extrabold text-[15px] text-foreground flex items-center gap-2">
                    <UserPlus size={16} className="text-primary-strong" style={{ color: "#2F7D5C" }} />
                    {t("addMemberToLeague")}
                  </h3>
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        {t("usernameGlobalLabel")}
                      </label>
                      <input
                        type="text"
                        required
                        value={newMemberUsername}
                        onChange={(e) => setNewMemberUsername(e.target.value)}
                        placeholder="exact_username"
                        className="w-full text-[13px] border border-border rounded-lg px-3.5 py-2.5 bg-white text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        {t("leagueNicknameOptLabel")}
                      </label>
                      <input
                        type="text"
                        value={newMemberNickname}
                        onChange={(e) => setNewMemberNickname(e.target.value)}
                        placeholder="Leave blank for display name"
                        className="w-full text-[13px] border border-border rounded-lg px-3.5 py-2.5 bg-white text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t("leagueRoleLabel")}
                      </label>
                      <div className="flex gap-4">
                        <label className="inline-flex items-center text-[13px] font-semibold text-foreground cursor-pointer">
                          <input
                            type="radio"
                            name="role"
                            checked={newMemberRole === "PLAYER"}
                            onChange={() => setNewMemberRole("PLAYER")}
                            className="mr-2 accent-[#2F7D5C]"
                          />
                          {t("playerRoleLabel")}
                        </label>
                        <label className="inline-flex items-center text-[13px] font-semibold text-foreground cursor-pointer">
                          <input
                            type="radio"
                            name="role"
                            checked={newMemberRole === "ADMIN"}
                            onChange={() => setNewMemberRole("ADMIN")}
                            className="mr-2 accent-[#2F7D5C]"
                          />
                          {t("leagueAdminRoleLabel")}
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingMember}
                      className="w-full py-2.5 text-[13px] font-bold text-white rounded-lg transition-all"
                      style={{ background: "#2F7D5C" }}
                    >
                      {addingMember ? t("addingBtn") : t("addMemberToLeague")}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Right member list table */}
            <div className="lg:col-span-2 bg-white border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-extrabold text-[15px] text-foreground mb-4">
                {t("leagueMembersTitle")}
              </h3>

              {!selectedLeagueId ? (
                <p className="text-center text-[13px] text-muted-foreground py-10">
                  {t("selectLeaguePlaceholder")}
                </p>
              ) : loadingMembers ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" style={{ borderColor: "#2F7D5C", borderTopColor: "transparent" }} />
                </div>
              ) : participants.length === 0 ? (
                <p className="text-center text-[13px] text-muted-foreground py-10">
                  {t("noLeagueMembersYet")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("colUserInfo")}</th>
                        <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("colLeagueNickname")}</th>
                        <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("colRole")}</th>
                        <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">{t("colActions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {participants.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5">
                            <div className="text-[13px] font-semibold text-foreground">{p.displayName}</div>
                            <div className="text-[10px] text-muted-foreground">@{p.username}</div>
                          </td>
                          <td className="py-3.5 text-[13px] font-medium text-foreground">{p.nickname}</td>
                          <td className="py-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.role === "ADMIN" ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"
                            }`}>
                              {p.role}
                            </span>
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleResetPasscode(p.id, p.nickname)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all inline-flex items-center gap-1 text-[12px] font-bold"
                            >
                              <Key size={13} />
                              {t("resetPasscodeBtn")}
                            </button>
                            <button
                              onClick={() => handleRemoveMember(p.id, p.nickname)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all inline-flex items-center gap-1 text-[12px] font-bold"
                            >
                              <Trash2 size={13} />
                              {t("removeBtn")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
              <h3 className="font-extrabold text-[15px] text-foreground">
                {t("globalUsers") || "Global Users"}
              </h3>
              
              {/* Search Bar */}
              <div className="w-full md:w-80">
                <input
                  type="text"
                  placeholder={t("searchUsersPlaceholder")}
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full text-[13px] border border-border rounded-lg px-3.5 py-2 bg-white text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {loadingGlobalUsers ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" style={{ borderColor: "#2F7D5C", borderTopColor: "transparent" }} />
              </div>
            ) : filteredGlobalUsers.length === 0 ? (
              <p className="text-center text-[13px] text-muted-foreground py-10">
                {t("noUsersFound")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("colAccount")}</th>
                      <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("colSystemRole")}</th>
                      <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("colLeagueCount")}</th>
                      <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("colCreatedAt")}</th>
                      <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">{t("colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredGlobalUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5">
                          <div className="text-[13px] font-semibold text-foreground">{u.displayName}</div>
                          <div className="text-[10px] text-muted-foreground">@{u.username}</div>
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === "SUPER_ADMIN" ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-gray-50 text-gray-700 border border-gray-200"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 text-[13px] text-foreground font-medium">
                          {u._count?.memberships ?? 0}
                        </td>
                        <td className="py-3.5 text-[12px] text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
                        </td>
                        <td className="py-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleChangeGlobalUserRole(u.id, u.displayName, u.role)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-all inline-flex items-center gap-1 text-[12px] font-bold"
                          >
                            {u.role === "SUPER_ADMIN" ? t("setRoleUser") : t("setRoleSuperAdmin")}
                          </button>
                          <button
                            onClick={() => handleResetGlobalPasscode(u.id, u.displayName)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all inline-flex items-center gap-1 text-[12px] font-bold"
                          >
                            <Key size={13} />
                            {t("resetPasscodeBtn")}
                          </button>
                          <button
                            onClick={() => handleDeleteGlobalUser(u.id, u.displayName)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all inline-flex items-center gap-1 text-[12px] font-bold"
                          >
                            <Trash2 size={13} />
                            {t("deletePermBtn")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </NavigationShell>
  );
}

export default function SuperAdminPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2F7D5C] border-t-transparent" />
      </div>
    }>
      <SuperAdminContent />
    </Suspense>
  );
}
