import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CalendarEvent } from "@/components/EventCalendar";

export const ROLE_OPTIONS = [
  { id: "captain", label: "主将・副将", leader: true },
  { id: "manager", label: "マネージャー", leader: true },
  { id: "staff", label: "スタッフ（監督・コーチ）", leader: true },
  { id: "exec", label: "会長・副会長・会計", leader: true },
  { id: "member", label: "一般部員", leader: false },
  { id: "student", label: "一般学生", leader: false },
] as const;

export type RoleId = (typeof ROLE_OPTIONS)[number]["id"];

export type Profile = {
  email: string;
  name: string;
  team: string;
  teamPassword: string;
  role: RoleId;
};

export type Category = { id: string; label: string };

export type AttendanceStatus = "attend" | "absent" | "late" | null;
export type AttendanceResponse = { status: Exclude<AttendanceStatus, null>; reason?: string };

type AttendanceMap = Record<string, Record<string, AttendanceResponse>>; // eventId -> userKey -> response
type WakeMap = Record<string, Record<string, boolean>>; // YYYY-MM-DD -> userKey -> true

const DEFAULT_CATEGORIES: Category[] = [
  { id: "top", label: "トップチーム" },
  { id: "b", label: "Bチーム" },
  { id: "c", label: "Cチーム" },
  { id: "manager", label: "マネージャー" },
  { id: "all", label: "全員" },
];

const DEFAULT_EVENT_TYPES = [
  "イベント",
  "リーグ戦",
  "カップ戦",
  "練習試合",
  "練習",
  "朝練",
  "大会",
  "ミーティング",
  "その他",
];

// --- localStorage helpers ---
function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function teamKey(team: string, password: string) {
  return `${team.trim()}::${password.trim()}`;
}
function ns(profile: Profile | null, sub: string) {
  if (!profile) return null;
  return `cp.team:${teamKey(profile.team, profile.teamPassword)}.${sub}`;
}

// --- Team registry (so we can validate "join existing team") ---
type TeamRegistryEntry = { name: string; password: string };
function loadRegistry(): TeamRegistryEntry[] {
  return load<TeamRegistryEntry[]>("cp.teamRegistry", []);
}
function saveRegistry(list: TeamRegistryEntry[]) {
  save("cp.teamRegistry", list);
}
export function teamExists(name: string) {
  return loadRegistry().some((t) => t.name.trim() === name.trim());
}
export function teamPasswordMatches(name: string, password: string) {
  return loadRegistry().some(
    (t) => t.name.trim() === name.trim() && t.password === password,
  );
}

type AppState = {
  profile: Profile | null;
  isLeader: boolean;

  // auth flows
  registerNewTeam: (p: Omit<Profile, "team" | "teamPassword"> & { team: string; teamPassword: string }) =>
    | { ok: true }
    | { ok: false; error: string };
  joinExistingTeam: (
    p: Omit<Profile, "team" | "teamPassword"> & { team: string; teamPassword: string },
  ) => { ok: true } | { ok: false; error: string };
  socialMockSignIn: (provider: "google" | "apple", remember: boolean) => void;
  signOut: () => void;

  // team-scoped data
  members: Profile[];
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  eventTypes: string[];
  setEventTypes: React.Dispatch<React.SetStateAction<string[]>>;
  attendance: AttendanceMap;
  setAttendance: (eventId: string, userKey: string, response: AttendanceResponse | null) => void;
  wakeups: WakeMap;
  markWake: (date: string, userKey: string) => void;
  preferences: { useItems: boolean; useReactions: boolean };
  setPreferences: React.Dispatch<React.SetStateAction<{ useItems: boolean; useReactions: boolean }>>;
};

const Ctx = createContext<AppState | null>(null);

const PROFILE_KEY = "cp.profile";
const REMEMBER_KEY = "cp.remember";

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [eventTypes, setEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [members, setMembers] = useState<Profile[]>([]);
  const [attendance, setAttendanceState] = useState<AttendanceMap>({});
  const [wakeups, setWakeups] = useState<WakeMap>({});
  const [preferences, setPreferences] = useState({ useItems: true, useReactions: true });

  // Initial hydration: restore profile if "remember me" was on (default true)
  useEffect(() => {
    const remember = load<boolean>(REMEMBER_KEY, true);
    if (remember) {
      const p = load<Profile | null>(PROFILE_KEY, null);
      if (p && p.team && p.teamPassword) setProfileState(p);
    } else {
      localStorage.removeItem(PROFILE_KEY);
    }
    setHydrated(true);
  }, []);

  // When profile changes (login/team switch), load that team's namespace
  useEffect(() => {
    if (!hydrated) return;
    if (!profile) {
      setEvents([]); setCategories(DEFAULT_CATEGORIES); setEventTypes(DEFAULT_EVENT_TYPES);
      setMembers([]); setAttendanceState({}); setWakeups({}); setPreferences({ useItems: true, useReactions: true });
      return;
    }
    setEvents(load<CalendarEvent[]>(ns(profile, "events")!, []));
    setCategories(load<Category[]>(ns(profile, "categories")!, DEFAULT_CATEGORIES));
    setEventTypes(load<string[]>(ns(profile, "eventTypes")!, DEFAULT_EVENT_TYPES));
    const storedMembers = load<Profile[]>(ns(profile, "members")!, []);
    const map = new Map<string, Profile>();
    for (const m of storedMembers) map.set(m.email, m);
    map.set(profile.email, profile);
    const merged = Array.from(map.values());
    setMembers(merged);
    save(ns(profile, "members")!, merged);
    setAttendanceState(load<AttendanceMap>(ns(profile, "attendance")!, {}));
    setWakeups(load<WakeMap>(ns(profile, "wakeups")!, {}));
    setPreferences(load(ns(profile, "prefs")!, { useItems: true, useReactions: true }));
  }, [profile, hydrated]);

  // Persist profile
  useEffect(() => {
    if (!hydrated) return;
    if (profile) save(PROFILE_KEY, profile);
    else localStorage.removeItem(PROFILE_KEY);
  }, [profile, hydrated]);

  // Persist team-scoped slices
  useEffect(() => { if (hydrated && profile) save(ns(profile, "events")!, events); }, [events, profile, hydrated]);
  useEffect(() => { if (hydrated && profile) save(ns(profile, "categories")!, categories); }, [categories, profile, hydrated]);
  useEffect(() => { if (hydrated && profile) save(ns(profile, "eventTypes")!, eventTypes); }, [eventTypes, profile, hydrated]);
  useEffect(() => { if (hydrated && profile) save(ns(profile, "attendance")!, attendance); }, [attendance, profile, hydrated]);
  useEffect(() => { if (hydrated && profile) save(ns(profile, "wakeups")!, wakeups); }, [wakeups, profile, hydrated]);
  useEffect(() => { if (hydrated && profile) save(ns(profile, "prefs")!, preferences); }, [preferences, profile, hydrated]);
  useEffect(() => { if (hydrated && profile) save(ns(profile, "members")!, members); }, [members, profile, hydrated]);

  // Live sync across tabs/windows (mocks "realtime")
  useEffect(() => {
    if (!profile) return;
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      const prefix = `cp.team:${teamKey(profile.team, profile.teamPassword)}.`;
      if (!e.key.startsWith(prefix)) return;
      const sub = e.key.slice(prefix.length);
      try {
        const v = e.newValue ? JSON.parse(e.newValue) : null;
        if (sub === "events") setEvents(v ?? []);
        else if (sub === "attendance") setAttendanceState(v ?? {});
        else if (sub === "wakeups") setWakeups(v ?? {});
        else if (sub === "members") setMembers(v ?? []);
        else if (sub === "categories") setCategories(v ?? DEFAULT_CATEGORIES);
        else if (sub === "eventTypes") setEventTypes(v ?? DEFAULT_EVENT_TYPES);
      } catch { /* noop */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [profile]);

  const registerNewTeam: AppState["registerNewTeam"] = useCallback((p) => {
    const name = p.team.trim();
    const pwd = p.teamPassword.trim();
    if (!name) return { ok: false, error: "チーム名を入力してください" };
    if (!/^\d{4,6}$/.test(pwd)) return { ok: false, error: "チームパスワードは4〜6桁の数字で設定してください" };
    const reg = loadRegistry();
    if (reg.some((t) => t.name === name)) {
      return { ok: false, error: "同名のチームが既に存在します。別の名前にしてください" };
    }
    saveRegistry([...reg, { name, password: pwd }]);
    setProfileState({ ...p, team: name, teamPassword: pwd });
    return { ok: true };
  }, []);

  const joinExistingTeam: AppState["joinExistingTeam"] = useCallback((p) => {
    const name = p.team.trim();
    const pwd = p.teamPassword.trim();
    if (!teamExists(name)) return { ok: false, error: "そのチームは見つかりません" };
    if (!teamPasswordMatches(name, pwd)) return { ok: false, error: "チームパスワードが違います" };
    setProfileState({ ...p, team: name, teamPassword: pwd });
    return { ok: true };
  }, []);

  const socialMockSignIn = useCallback((provider: "google" | "apple", remember: boolean) => {
    save(REMEMBER_KEY, remember);
    // Mock instant sign-in: caller will then go to profile/team step
    // No profile is set yet — the AuthScreen advances to profile step
    void provider;
  }, []);

  const signOut = useCallback(() => {
    setProfileState(null);
    localStorage.removeItem(PROFILE_KEY);
  }, []);

  const setAttendance = useCallback(
    (eventId: string, userKey: string, response: AttendanceResponse | null) => {
      setAttendanceState((prev) => {
        const cur = { ...(prev[eventId] ?? {}) };
        if (response == null) delete cur[userKey];
        else cur[userKey] = response;
        return { ...prev, [eventId]: cur };
      });
    },
    [],
  );

  const markWake = useCallback((date: string, userKey: string) => {
    setWakeups((prev) => ({
      ...prev,
      [date]: { ...(prev[date] ?? {}), [userKey]: true },
    }));
  }, []);

  const isLeader = useMemo(() => {
    if (!profile) return false;
    return !!ROLE_OPTIONS.find((r) => r.id === profile.role)?.leader;
  }, [profile]);

  const value: AppState = {
    profile,
    isLeader,
    registerNewTeam,
    joinExistingTeam,
    socialMockSignIn,
    signOut,
    members,
    events, setEvents,
    categories, setCategories,
    eventTypes, setEventTypes,
    attendance, setAttendance,
    wakeups, markWake,
    preferences, setPreferences,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function roleLabel(id: RoleId) {
  return ROLE_OPTIONS.find((r) => r.id === id)?.label ?? id;
}

export function setRemember(value: boolean) {
  save(REMEMBER_KEY, value);
}
