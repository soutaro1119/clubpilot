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

/**
 * Data model (mirrors target Supabase schema):
 *
 *   teams       (id PK, name UNIQUE, password)
 *   profiles    (email PK, team_id FK, name, role, avatar_url)
 *   events      (id PK, team_id FK, ...)
 *   attendance  (event_id, user_email, status, reason)  PK(event_id,user_email)
 *   wakeups     (date, user_email, team_id)
 *   finance_items       (id PK, team_id FK, title, amount, due_date, created_at)
 *   finance_payments    (item_id, user_email, paid, paid_at)  PK(item_id,user_email)
 *
 * In this mock layer, all team-scoped slices are stored under
 * `cp.team:<teamId>.<slice>` so multiple browsers on the same team share data
 * via `localStorage` + `storage` events. Swapping the persistence layer to
 * Supabase later is a one-file change (replace load/save/subscribe).
 */

export type Profile = {
  email: string;
  name: string;
  team: string;        // denormalized team name (for display)
  teamPassword: string; // denormalized (for re-login share)
  teamId: string;      // canonical team key — all data is scoped to this
  role: RoleId;
  avatarUrl?: string;  // dataURL
};

export type Category = { id: string; label: string };

export type AttendanceStatus = "attend" | "absent" | "late" | null;
export type AttendanceResponse = { status: Exclude<AttendanceStatus, null>; reason?: string };

type AttendanceMap = Record<string, Record<string, AttendanceResponse>>;
type WakeMap = Record<string, Record<string, boolean>>;

export type FinanceItem = {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  createdAt: number;
};
export type FinancePayments = Record<string, Record<string, { paid: boolean; paidAt?: number }>>;

export type Announcement = {
  id: string;
  text: string;
  when: string; // today | tomorrow | this-week | general
  authorName: string;
  authorEmail: string;
  createdAt: number;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "top", label: "トップチーム" },
  { id: "b", label: "Bチーム" },
  { id: "c", label: "Cチーム" },
  { id: "manager", label: "マネージャー" },
  { id: "all", label: "全員" },
];
const DEFAULT_EVENT_TYPES = [
  "イベント", "リーグ戦", "カップ戦", "練習試合", "練習", "朝練", "大会", "ミーティング", "その他",
];

// --- localStorage helpers ---
function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}
function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ns(teamId: string | null | undefined, sub: string) {
  if (!teamId) return null;
  return `cp.team:${teamId}.${sub}`;
}

// --- Team registry ---
type TeamRegistryEntry = { id: string; name: string; password: string };
const REGISTRY_KEY = "cp.teamRegistry";
function loadRegistry(): TeamRegistryEntry[] {
  return load<TeamRegistryEntry[]>(REGISTRY_KEY, []);
}
function saveRegistry(list: TeamRegistryEntry[]) { save(REGISTRY_KEY, list); }
function normName(s: string) { return s.trim().toLowerCase(); }

export function teamExists(name: string) {
  return loadRegistry().some((t) => normName(t.name) === normName(name));
}

type AppState = {
  profile: Profile | null;
  isLeader: boolean;

  login: (
    email: string,
    password: string,
  ) => { ok: true } | { ok: false; error: string };
  registerNewTeam: (
    p: Omit<Profile, "teamId">,
    password: string,
  ) => { ok: true } | { ok: false; error: string };
  joinExistingTeam: (
    p: Omit<Profile, "teamId">,
    password: string,
  ) => { ok: true } | { ok: false; error: string };
  updateProfile: (patch: Partial<Profile>) => void;
  signOut: () => void;

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

  financeItems: FinanceItem[];
  financePayments: FinancePayments;
  addFinanceChargeForAll: (input: { title: string; amount: number; dueDate: string }) => void;
  setPaid: (itemId: string, userEmail: string, paid: boolean) => void;
  deleteFinanceItem: (itemId: string) => void;

  announcements: Announcement[];
  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt">) => void;
  deleteAnnouncement: (id: string) => void;

  // Moderation (UGC)
  mutedPostIds: string[];              // per-viewer
  blockedEmails: string[];             // per-viewer
  mutePost: (postId: string) => void;
  blockUser: (email: string) => void;
  unblockUser: (email: string) => void;
  reportPost: (input: { postId: string; authorEmail: string; text: string; kind?: string }) => void;
  reports: Array<{ id: string; postId: string; authorEmail: string; text: string; kind?: string; reporterEmail: string; createdAt: number }>;

  deleteAccount: () => void;
};

const Ctx = createContext<AppState | null>(null);

const PROFILE_KEY = "cp.profile";
const REMEMBER_KEY = "cp.remember";
const ACCOUNTS_KEY = "cp.accounts";

type AccountRecord = { password: string; profile: Profile };
function loadAccounts(): Record<string, AccountRecord> {
  return load<Record<string, AccountRecord>>(ACCOUNTS_KEY, {});
}
function saveAccount(email: string, rec: AccountRecord) {
  const all = loadAccounts();
  all[email.trim().toLowerCase()] = rec;
  save(ACCOUNTS_KEY, all);
}

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
  const [financeItems, setFinanceItems] = useState<FinanceItem[]>([]);
  const [financePayments, setFinancePayments] = useState<FinancePayments>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reports, setReports] = useState<AppState["reports"]>([]);
  const [mutedPostIds, setMutedPostIds] = useState<string[]>([]);
  const [blockedEmails, setBlockedEmails] = useState<string[]>([]);

  // Hydrate profile
  useEffect(() => {
    const remember = load<boolean>(REMEMBER_KEY, true);
    if (remember) {
      const p = load<Profile | null>(PROFILE_KEY, null);
      if (p) {
        // Migrate legacy profiles without teamId
        if (!p.teamId && p.team && p.teamPassword) {
          const reg = loadRegistry();
          let entry = reg.find((t) => normName(t.name) === normName(p.team) && t.password === p.teamPassword);
          if (!entry) {
            entry = { id: uid("team"), name: p.team.trim(), password: p.teamPassword };
            saveRegistry([...reg, entry]);
          }
          p.teamId = entry.id;
        }
        if (p.teamId) setProfileState(p);
      }
    } else {
      localStorage.removeItem(PROFILE_KEY);
    }
    setHydrated(true);
  }, []);

  // Load team-scoped slices whenever team changes
  useEffect(() => {
    if (!hydrated) return;
    if (!profile) {
      setEvents([]); setCategories(DEFAULT_CATEGORIES); setEventTypes(DEFAULT_EVENT_TYPES);
      setMembers([]); setAttendanceState({}); setWakeups({});
      setPreferences({ useItems: true, useReactions: true });
      setFinanceItems([]); setFinancePayments({});
      setAnnouncements([]);
      setReports([]);
      setMutedPostIds([]); setBlockedEmails([]);
      return;
    }
    const tid = profile.teamId;
    setEvents(load<CalendarEvent[]>(ns(tid, "events")!, []));
    setCategories(load<Category[]>(ns(tid, "categories")!, DEFAULT_CATEGORIES));
    setEventTypes(load<string[]>(ns(tid, "eventTypes")!, DEFAULT_EVENT_TYPES));
    const storedMembers = load<Profile[]>(ns(tid, "members")!, []);
    const map = new Map<string, Profile>();
    for (const m of storedMembers) map.set(m.email, m);
    map.set(profile.email, profile); // upsert self
    const merged = Array.from(map.values());
    setMembers(merged);
    save(ns(tid, "members")!, merged);
    setAttendanceState(load<AttendanceMap>(ns(tid, "attendance")!, {}));
    setWakeups(load<WakeMap>(ns(tid, "wakeups")!, {}));
    setPreferences(load(ns(tid, "prefs")!, { useItems: true, useReactions: true }));
    setFinanceItems(load<FinanceItem[]>(ns(tid, "financeItems")!, []));
    setFinancePayments(load<FinancePayments>(ns(tid, "financePayments")!, {}));
    setAnnouncements(load<Announcement[]>(ns(tid, "announcements")!, []));
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (profile) save(PROFILE_KEY, profile);
    else localStorage.removeItem(PROFILE_KEY);
  }, [profile, hydrated]);

  const tid = profile?.teamId;
  useEffect(() => { if (hydrated && tid) save(ns(tid, "events")!, events); }, [events, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "categories")!, categories); }, [categories, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "eventTypes")!, eventTypes); }, [eventTypes, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "attendance")!, attendance); }, [attendance, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "wakeups")!, wakeups); }, [wakeups, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "prefs")!, preferences); }, [preferences, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "members")!, members); }, [members, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "financeItems")!, financeItems); }, [financeItems, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "financePayments")!, financePayments); }, [financePayments, tid, hydrated]);
  useEffect(() => { if (hydrated && tid) save(ns(tid, "announcements")!, announcements); }, [announcements, tid, hydrated]);

  // Cross-tab live sync
  useEffect(() => {
    if (!tid) return;
    const prefix = `cp.team:${tid}.`;
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(prefix)) return;
      const sub = e.key.slice(prefix.length);
      try {
        const v = e.newValue ? JSON.parse(e.newValue) : null;
        if (sub === "events") setEvents(v ?? []);
        else if (sub === "attendance") setAttendanceState(v ?? {});
        else if (sub === "wakeups") setWakeups(v ?? {});
        else if (sub === "members") setMembers(v ?? []);
        else if (sub === "categories") setCategories(v ?? DEFAULT_CATEGORIES);
        else if (sub === "eventTypes") setEventTypes(v ?? DEFAULT_EVENT_TYPES);
        else if (sub === "financeItems") setFinanceItems(v ?? []);
        else if (sub === "financePayments") setFinancePayments(v ?? {});
        else if (sub === "announcements") setAnnouncements(v ?? []);
      } catch { /* noop */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [tid]);

  const registerNewTeam: AppState["registerNewTeam"] = useCallback((p, password) => {
    const name = p.team.trim();
    const pwd = p.teamPassword.trim();
    if (!name) return { ok: false, error: "チーム名を入力してください" };
    if (!/^\d{4,6}$/.test(pwd)) return { ok: false, error: "チームパスワードは4〜6桁の数字で設定してください" };
    const reg = loadRegistry();
    if (reg.some((t) => normName(t.name) === normName(name))) {
      return { ok: false, error: "このチーム名は既に登録されています。別のチーム名を入力するか、既存のチームに参加してください" };
    }
    const entry: TeamRegistryEntry = { id: uid("team"), name, password: pwd };
    saveRegistry([...reg, entry]);
    const next: Profile = { ...p, team: name, teamPassword: pwd, teamId: entry.id };
    if (p.email) saveAccount(p.email, { password, profile: next });
    setProfileState(next);
    return { ok: true };
  }, []);

  const joinExistingTeam: AppState["joinExistingTeam"] = useCallback((p, password) => {
    const name = p.team.trim();
    const pwd = p.teamPassword.trim();
    const reg = loadRegistry();
    const entry = reg.find((t) => normName(t.name) === normName(name));
    if (!entry) return { ok: false, error: "そのチームは見つかりません" };
    if (entry.password !== pwd) return { ok: false, error: "チームパスワードが違います" };
    const next: Profile = { ...p, team: entry.name, teamPassword: pwd, teamId: entry.id };
    if (p.email) saveAccount(p.email, { password, profile: next });
    setProfileState(next);
    return { ok: true };
  }, []);

  const login: AppState["login"] = useCallback((email, password) => {
    const key = email.trim().toLowerCase();
    if (!key || !password) return { ok: false, error: "メールとパスワードを入力してください" };
    const accounts = loadAccounts();
    const acc = accounts[key];
    if (!acc) return { ok: false, error: "アカウントが見つかりません。新規登録してください" };
    if (acc.password !== password) return { ok: false, error: "パスワードが違います" };
    setProfileState(acc.profile);
    return { ok: true };
  }, []);

  const updateProfile: AppState["updateProfile"] = useCallback((patch) => {
    setProfileState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setMembers((ms) => {
        const map = new Map(ms.map((m) => [m.email, m]));
        map.set(next.email, next);
        return Array.from(map.values());
      });
      // Sync to account record
      const accounts = loadAccounts();
      const key = next.email.trim().toLowerCase();
      if (accounts[key]) {
        accounts[key] = { ...accounts[key], profile: next };
        save(ACCOUNTS_KEY, accounts);
      }
      return next;
    });
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
    }, []);

  const markWake = useCallback((date: string, userKey: string) => {
    setWakeups((prev) => ({ ...prev, [date]: { ...(prev[date] ?? {}), [userKey]: true } }));
  }, []);

  const addFinanceChargeForAll: AppState["addFinanceChargeForAll"] = useCallback(({ title, amount, dueDate }) => {
    const item: FinanceItem = { id: uid("fin"), title: title.trim(), amount, dueDate, createdAt: Date.now() };
    setFinanceItems((prev) => [...prev, item]);
    setFinancePayments((prev) => {
      const next = { ...prev };
      const row: Record<string, { paid: boolean }> = {};
      for (const m of members) row[m.email] = { paid: false };
      next[item.id] = row;
      return next;
    });
  }, [members]);

  const setPaid: AppState["setPaid"] = useCallback((itemId, userEmail, paid) => {
    setFinancePayments((prev) => {
      const row = { ...(prev[itemId] ?? {}) };
      row[userEmail] = paid ? { paid: true, paidAt: Date.now() } : { paid: false };
      return { ...prev, [itemId]: row };
    });
  }, []);

  const deleteFinanceItem: AppState["deleteFinanceItem"] = useCallback((itemId) => {
    setFinanceItems((prev) => prev.filter((i) => i.id !== itemId));
    setFinancePayments((prev) => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const addAnnouncement: AppState["addAnnouncement"] = useCallback((a) => {
    setAnnouncements((prev) => [
      { ...a, id: uid("ann"), createdAt: Date.now() },
      ...prev,
    ]);
  }, []);

  const deleteAnnouncement: AppState["deleteAnnouncement"] = useCallback((id) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const isLeader = useMemo(() => {
    if (!profile) return false;
    return !!ROLE_OPTIONS.find((r) => r.id === profile.role)?.leader;
  }, [profile]);

  const value: AppState = {
    profile, isLeader,
    login, registerNewTeam, joinExistingTeam, updateProfile, signOut,
    members,
    events, setEvents,
    categories, setCategories,
    eventTypes, setEventTypes,
    attendance, setAttendance,
    wakeups, markWake,
    preferences, setPreferences,
    financeItems, financePayments,
    addFinanceChargeForAll, setPaid, deleteFinanceItem,
    announcements, addAnnouncement, deleteAnnouncement,
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

export function setRemember(value: boolean) { save(REMEMBER_KEY, value); }
