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
  role: RoleId;
};

export type Category = { id: string; label: string };

export type AttendanceStatus = "attend" | "absent" | "late" | null;

type AttendanceMap = Record<string, Record<string, AttendanceStatus>>; // eventId -> userKey -> status
type WakeMap = Record<string, Record<string, boolean>>; // date(YYYY-MM-DD) -> userKey -> true

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

// Mock roster so 幹部 can see attendance/wake-ups visually
const MOCK_MEMBERS: Profile[] = [
  { email: "tanaka@example.com", name: "田中 翔太", team: "サンプル部", role: "member" },
  { email: "sato@example.com", name: "佐藤 大輔", team: "サンプル部", role: "member" },
  { email: "yamada@example.com", name: "山田 蓮", team: "サンプル部", role: "member" },
  { email: "suzuki@example.com", name: "鈴木 健", team: "サンプル部", role: "member" },
  { email: "kobayashi@example.com", name: "小林 ゆうき", team: "サンプル部", role: "student" },
  { email: "watanabe@example.com", name: "渡辺 楓", team: "サンプル部", role: "member" },
  { email: "ito@example.com", name: "伊藤 直樹", team: "サンプル部", role: "member" },
];

type AppState = {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  signOut: () => void;
  isLeader: boolean;

  members: Profile[]; // includes current user if leader/member
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;

  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  eventTypes: string[];
  setEventTypes: React.Dispatch<React.SetStateAction<string[]>>;

  attendance: AttendanceMap;
  setAttendance: (eventId: string, userKey: string, status: AttendanceStatus) => void;

  wakeups: WakeMap;
  markWake: (date: string, userKey: string) => void;

  preferences: { useItems: boolean; useReactions: boolean };
  setPreferences: React.Dispatch<
    React.SetStateAction<{ useItems: boolean; useReactions: boolean }>
  >;
};

const Ctx = createContext<AppState | null>(null);

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [eventTypes, setEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [attendance, setAttendanceState] = useState<AttendanceMap>({});
  const [wakeups, setWakeups] = useState<WakeMap>({});
  const [preferences, setPreferences] = useState({ useItems: true, useReactions: true });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    setProfileState(load<Profile | null>("cp.profile", null));
    setEvents(load<CalendarEvent[]>("cp.events", []));
    setCategories(load<Category[]>("cp.categories", DEFAULT_CATEGORIES));
    setEventTypes(load<string[]>("cp.eventTypes", DEFAULT_EVENT_TYPES));
    setAttendanceState(load<AttendanceMap>("cp.attendance", {}));
    setWakeups(load<WakeMap>("cp.wakeups", {}));
    setPreferences(load("cp.prefs", { useItems: true, useReactions: true }));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) save("cp.profile", profile); }, [profile, hydrated]);
  useEffect(() => { if (hydrated) save("cp.events", events); }, [events, hydrated]);
  useEffect(() => { if (hydrated) save("cp.categories", categories); }, [categories, hydrated]);
  useEffect(() => { if (hydrated) save("cp.eventTypes", eventTypes); }, [eventTypes, hydrated]);
  useEffect(() => { if (hydrated) save("cp.attendance", attendance); }, [attendance, hydrated]);
  useEffect(() => { if (hydrated) save("cp.wakeups", wakeups); }, [wakeups, hydrated]);
  useEffect(() => { if (hydrated) save("cp.prefs", preferences); }, [preferences, hydrated]);

  const setProfile = useCallback((p: Profile | null) => setProfileState(p), []);
  const signOut = useCallback(() => setProfileState(null), []);

  const setAttendance = useCallback(
    (eventId: string, userKey: string, status: AttendanceStatus) => {
      setAttendanceState((prev) => ({
        ...prev,
        [eventId]: { ...(prev[eventId] ?? {}), [userKey]: status },
      }));
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

  // Combine mock members with current user (if a 一般 user); ensure unique by email
  const members = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const m of MOCK_MEMBERS) map.set(m.email, m);
    if (profile) map.set(profile.email, profile);
    return Array.from(map.values());
  }, [profile]);

  const value: AppState = {
    profile,
    setProfile,
    signOut,
    isLeader,
    members,
    events,
    setEvents,
    categories,
    setCategories,
    eventTypes,
    setEventTypes,
    attendance,
    setAttendance,
    wakeups,
    markWake,
    preferences,
    setPreferences,
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
