import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CalendarEvent } from "@/components/EventCalendar";
import { supabase } from "@/integrations/supabase/client";

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
  id: string;           // auth.users.id (UUID)
  email: string;
  name: string;
  team: string;         // team name (display)
  teamPassword: string; // known only on this device (create/join)
  teamId: string;       // teams.id (UUID) — canonical scope
  role: RoleId;
  avatarUrl?: string;
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
  dueDate: string;
  createdAt: number;
};
export type FinancePayments = Record<string, Record<string, { paid: boolean; paidAt?: number }>>;

export type Announcement = {
  id: string;
  text: string;
  when: string;
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

// --- local prefs (per-device) ---
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
const REMEMBER_KEY = "cp.remember";

// Team password known on this device (creator/joiner) — never leaves this browser.
function tpKey(userId: string) { return `cp.teamPassword.${userId}`; }

type AppState = {
  profile: Profile | null;
  isLeader: boolean;

  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  registerNewTeam: (
    p: Omit<Profile, "teamId" | "id">,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  joinExistingTeam: (
    p: Omit<Profile, "teamId" | "id">,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  signInWithGoogle: () => Promise<void>;
  setupTeam: (
    mode: "create" | "join",
    teamName: string,
    teamPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;

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

  mutedPostIds: string[];
  blockedEmails: string[];
  mutePost: (postId: string) => void;
  blockUser: (email: string) => void;
  unblockUser: (email: string) => void;
  reportPost: (input: { postId: string; authorEmail: string; text: string; kind?: string }) => void;
  reports: Array<{ id: string; postId: string; authorEmail: string; text: string; kind?: string; reporterEmail: string; createdAt: number }>;

  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

// ============ Row → domain mappers ============
type EventRow = {
  id: string; team_id: string; title: string; event_type: string;
  categories: string[]; opponent: string | null; event_date: string;
  meeting_time: string | null; warmup_time: string | null; start_time: string | null;
  location: string | null; items: string | null; notes: string | null;
  rain_cancel: boolean; attendance_deadline: string | null;
  created_by: string | null; created_at: string; updated_at: string;
};
function eventFromRow(r: EventRow, catLabels: Record<string, string>): CalendarEvent {
  const labels: Record<string, string> = {};
  for (const c of r.categories) labels[c] = catLabels[c] ?? c;
  return {
    id: r.id,
    date: r.event_date,
    title: r.title,
    eventType: r.event_type,
    categories: r.categories,
    categoryLabels: labels,
    meetingTime: r.meeting_time ?? undefined,
    warmupTime: r.warmup_time ?? undefined,
    startTime: r.start_time ?? undefined,
    location: r.location ?? undefined,
    opponent: r.opponent ?? undefined,
    items: r.items ?? undefined,
    notes: r.notes ?? undefined,
    attendanceDeadline: r.attendance_deadline ?? undefined,
    rainCancel: r.rain_cancel,
  };
}
function eventToInsert(e: CalendarEvent, teamId: string, userId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.id);
  return {
    ...(isUuid ? { id: e.id } : {}),
    team_id: teamId,
    title: e.title,
    event_type: e.eventType,
    categories: e.categories,
    opponent: e.opponent ?? null,
    event_date: e.date,
    meeting_time: e.meetingTime ?? null,
    warmup_time: e.warmupTime ?? null,
    start_time: e.startTime ?? null,
    location: e.location ?? null,
    items: e.items ?? null,
    notes: e.notes ?? null,
    rain_cancel: !!e.rainCancel,
    attendance_deadline: e.attendanceDeadline ?? null,
    created_by: userId,
  };
}

// ============ Provider ============
export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [events, setEventsState] = useState<CalendarEvent[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [eventTypes, setEventTypesState] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [members, setMembers] = useState<Profile[]>([]);
  const [attendance, setAttendanceState] = useState<AttendanceMap>({});
  const [wakeups, setWakeups] = useState<WakeMap>({});
  const [preferences, setPreferences] = useState(() =>
    load("cp.prefs", { useItems: true, useReactions: true })
  );
  const [financeItems, setFinanceItems] = useState<FinanceItem[]>([]);
  const [financePayments, setFinancePayments] = useState<FinancePayments>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reports, setReports] = useState<AppState["reports"]>([]);
  const [mutedPostIds, setMutedPostIds] = useState<string[]>([]);
  const [blockedEmails, setBlockedEmails] = useState<string[]>([]);

  // Refs for stable closures in event handlers/subscriptions
  const membersRef = useRef(members);
  membersRef.current = members;
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const eventTypesRef = useRef(eventTypes);
  eventTypesRef.current = eventTypes;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const catLabelMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.label])), [categories]);
  const emailToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of members) m.set(p.email.trim().toLowerCase(), p.id);
    return m;
  }, [members]);
  const idToEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of members) m.set(p.id, p.email);
    return m;
  }, [members]);

  // ---------- Load profile from session ----------
  const loadProfileFromUser = useCallback(async (userId: string) => {
    const { data: prow } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!prow) return null;
    let teamName = "";
    if (prow.team_id) {
      const { data: t } = await supabase.from("teams").select("name").eq("id", prow.team_id).maybeSingle();
      teamName = t?.name ?? "";
    }
    const teamPassword = load<string>(tpKey(userId), "");
    const p: Profile = {
      id: prow.id,
      email: prow.email,
      name: prow.name || prow.email.split("@")[0],
      role: prow.role as RoleId,
      avatarUrl: prow.avatar_url ?? undefined,
      teamId: prow.team_id ?? "",
      team: teamName,
      teamPassword,
    };
    return p;
  }, []);

  // ---------- Auth listener ----------
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const p = await loadProfileFromUser(session.user.id);
        setProfileState(p);
      }
      setHydrated(true);
      const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
        if (event === "SIGNED_OUT" || !sess?.user) {
          setProfileState(null);
          return;
        }
        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
          // Load profile without blocking listener
          setTimeout(() => {
            loadProfileFromUser(sess.user.id).then((p) => { if (p) setProfileState(p); });
          }, 0);
        }
      });
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => unsub();
  }, [loadProfileFromUser]);

  // Save prefs locally
  useEffect(() => { save("cp.prefs", preferences); }, [preferences]);

  // ---------- Reset when profile changes / clears ----------
  const tid = profile?.teamId || null;
  const uid = profile?.id || null;

  useEffect(() => {
    if (!profile) {
      setEventsState([]); setCategoriesState(DEFAULT_CATEGORIES); setEventTypesState(DEFAULT_EVENT_TYPES);
      setMembers([]); setAttendanceState({}); setWakeups({});
      setFinanceItems([]); setFinancePayments({});
      setAnnouncements([]); setReports([]);
      setMutedPostIds([]); setBlockedEmails([]);
    }
  }, [profile]);

  // ---------- Load muted/blocked (per-user, from Supabase) ----------
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const [m, b] = await Promise.all([
        supabase.from("muted_posts").select("post_id").eq("user_id", uid),
        supabase.from("blocked_users").select("blocked_email").eq("user_id", uid),
      ]);
      setMutedPostIds((m.data ?? []).map((r) => r.post_id));
      setBlockedEmails((b.data ?? []).map((r) => r.blocked_email.trim().toLowerCase()));
    })();
  }, [uid]);

  // ---------- Load team-scoped data ----------
  useEffect(() => {
    if (!tid) return;
    let cancelled = false;

    const loadAll = async () => {
      const [cats, ets, mems, evs, anns, fitems, fpays] = await Promise.all([
        supabase.from("team_categories").select("*").eq("team_id", tid).order("sort_order"),
        supabase.from("team_event_types").select("*").eq("team_id", tid).order("sort_order"),
        supabase.from("profiles").select("*").eq("team_id", tid),
        supabase.from("events").select("*").eq("team_id", tid).order("event_date"),
        supabase.from("announcements").select("*").eq("team_id", tid).order("created_at", { ascending: false }),
        supabase.from("finance_items").select("*").eq("team_id", tid).order("created_at", { ascending: false }),
        supabase.from("finance_payments").select("*"),
      ]);
      if (cancelled) return;

      const catList: Category[] = (cats.data ?? []).map((c: any) => ({ id: c.slug, label: c.label }));
      setCategoriesState(catList.length ? catList : DEFAULT_CATEGORIES);
      setEventTypesState((ets.data ?? []).map((e: any) => e.label));

      const memList: Profile[] = (mems.data ?? []).map((m: any) => ({
        id: m.id, email: m.email, name: m.name || m.email.split("@")[0],
        role: m.role as RoleId, avatarUrl: m.avatar_url ?? undefined,
        teamId: m.team_id, team: profile?.team ?? "", teamPassword: "",
      }));
      setMembers(memList);

      const labelMap: Record<string, string> = Object.fromEntries((cats.data ?? []).map((c: any) => [c.slug, c.label]));
      setEventsState((evs.data ?? []).map((r: any) => eventFromRow(r as EventRow, labelMap)));

      setAnnouncements((anns.data ?? []).map((a: any) => ({
        id: a.id, text: a.text, when: a.when, authorName: a.author_name,
        authorEmail: a.author_email, createdAt: new Date(a.created_at).getTime(),
      })));

      setFinanceItems((fitems.data ?? []).map((f: any) => ({
        id: f.id, title: f.title, amount: f.amount, dueDate: f.due_date,
        createdAt: new Date(f.created_at).getTime(),
      })));

      // Load attendance for these events
      const eventIds = (evs.data ?? []).map((e: any) => e.id);
      if (eventIds.length) {
        const { data: att } = await supabase.from("attendance").select("*").in("event_id", eventIds);
        const map: AttendanceMap = {};
        for (const row of att ?? []) {
          const email = memList.find((m) => m.id === row.user_id)?.email;
          if (!email) continue;
          map[row.event_id] ??= {};
          map[row.event_id][email] = { status: row.status as AttendanceResponse["status"], reason: row.reason ?? undefined };
        }
        setAttendanceState(map);
      } else {
        setAttendanceState({});
      }

      // Wakeups
      const { data: wks } = await supabase.from("wakeups").select("*").eq("team_id", tid);
      const wmap: WakeMap = {};
      for (const w of wks ?? []) {
        const email = memList.find((m) => m.id === w.user_id)?.email;
        if (!email) continue;
        wmap[w.wake_date] ??= {};
        wmap[w.wake_date][email] = true;
      }
      setWakeups(wmap);

      // Finance payments (filtered by our items)
      const itemIds = new Set((fitems.data ?? []).map((i: any) => i.id));
      const pMap: FinancePayments = {};
      for (const row of fpays.data ?? []) {
        if (!itemIds.has(row.item_id)) continue;
        const email = memList.find((m) => m.id === row.user_id)?.email;
        if (!email) continue;
        pMap[row.item_id] ??= {};
        pMap[row.item_id][email] = {
          paid: row.paid,
          paidAt: row.paid_at ? new Date(row.paid_at).getTime() : undefined,
        };
      }
      setFinancePayments(pMap);
    };

    loadAll();

    // ---------- Realtime subscriptions ----------
    const channel = supabase.channel(`team-${tid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `team_id=eq.${tid}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "wakeups", filter: `team_id=eq.${tid}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements", filter: `team_id=eq.${tid}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_items", filter: `team_id=eq.${tid}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_payments" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_categories", filter: `team_id=eq.${tid}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_event_types", filter: `team_id=eq.${tid}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `team_id=eq.${tid}` }, () => loadAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tid, profile?.team]);

  // ============ Auth actions ============
  const login: AppState["login"] = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: error.message === "Invalid login credentials" ? "メールまたはパスワードが違います" : error.message };
    return { ok: true };
  }, []);

  const signUpAndSetup = useCallback(async (
    p: Omit<Profile, "teamId" | "id">,
    password: string,
    teamOp: () => Promise<string>,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const email = p.email.trim();
    const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    let userId: string | undefined;

    const { data: signUp, error: suErr } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo, data: { name: p.name } },
    });
    if (suErr) {
      if (suErr.message.toLowerCase().includes("already")) {
        // Try sign-in with provided password (returning user)
        const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr || !si.user) return { ok: false, error: "このメールは登録済みです。パスワードをご確認ください" };
        userId = si.user.id;
      } else {
        return { ok: false, error: suErr.message };
      }
    } else {
      userId = signUp.user?.id;
    }
    if (!userId) return { ok: false, error: "サインアップに失敗しました" };

    // Wait briefly for profile trigger + session
    for (let i = 0; i < 20; i++) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    // Update profile fields
    const { error: upErr } = await supabase.from("profiles").update({
      name: p.name, role: p.role, avatar_url: p.avatarUrl ?? null,
    }).eq("id", userId);
    if (upErr) return { ok: false, error: upErr.message };

    // Team operation
    try {
      const teamId = await teamOp();
      save(tpKey(userId), p.teamPassword); // remember on this device
      const fresh = await loadProfileFromUser(userId);
      if (fresh) {
        fresh.teamPassword = p.teamPassword;
        setProfileState(fresh);
      }
      void teamId;
      return { ok: true };
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const map: Record<string, string> = {
        team_exists: "このチーム名は既に登録されています。別のチーム名を入力するか、既存のチームに参加してください",
        team_not_found: "そのチーム名は見つかりません。主将が作成したチーム名を再確認してください",
        invalid_password: "パスワードが違います / 4〜6桁の数字で入力してください",
        invalid_name: "チーム名を入力してください",
        not_authenticated: "認証エラーが発生しました。再度お試しください",
      };
      const shortErr = Object.keys(map).find((k) => msg.includes(k));
      return { ok: false, error: shortErr ? map[shortErr] : msg };
    }
  }, [loadProfileFromUser]);

  const registerNewTeam: AppState["registerNewTeam"] = useCallback((p, password) => {
    return signUpAndSetup(p, password, async () => {
      const { data, error } = await supabase.rpc("create_team", { _name: p.team, _password: p.teamPassword });
      if (error) throw new Error(error.message);
      return data as string;
    });
  }, [signUpAndSetup]);

  const joinExistingTeam: AppState["joinExistingTeam"] = useCallback((p, password) => {
    return signUpAndSetup(p, password, async () => {
      const { data, error } = await supabase.rpc("join_team", { _name: p.team, _password: p.teamPassword });
      if (error) throw new Error(error.message);
      return data as string;
    });
  }, [signUpAndSetup]);

  const signInWithGoogle: AppState["signInWithGoogle"] = useCallback(async () => {
    const { lovable } = await import("@/integrations/lovable/index");
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
    });
  }, []);

  const updateProfile: AppState["updateProfile"] = useCallback(async (patch) => {
    if (!profile) return;
    const row: any = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.role !== undefined) row.role = patch.role;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl ?? null;
    if (Object.keys(row).length) {
      await supabase.from("profiles").update(row).eq("id", profile.id);
    }
    setProfileState({ ...profile, ...patch });
  }, [profile]);

  const signOut: AppState["signOut"] = useCallback(async () => {
    await supabase.auth.signOut();
    setProfileState(null);
  }, []);

  // ============ Data setters (with Supabase writes) ============

  // events: diff-based add/remove
  const setEvents: AppState["setEvents"] = useCallback((updater) => {
    const prev = eventsRef.current;
    const next = typeof updater === "function" ? (updater as (p: CalendarEvent[]) => CalendarEvent[])(prev) : updater;
    setEventsState(next);
    if (!tid || !uid) return;
    const prevIds = new Set(prev.map((e) => e.id));
    const nextIds = new Set(next.map((e) => e.id));
    const added = next.filter((e) => !prevIds.has(e.id));
    const removed = prev.filter((e) => !nextIds.has(e.id));
    (async () => {
      for (const e of added) {
        await supabase.from("events").insert(eventToInsert(e, tid, uid));
      }
      for (const e of removed) {
        await supabase.from("events").delete().eq("id", e.id);
      }
    })();
  }, [tid, uid]);

  // categories: diff-based
  const setCategories: AppState["setCategories"] = useCallback((updater) => {
    const prev = categoriesRef.current;
    const next = typeof updater === "function" ? (updater as (p: Category[]) => Category[])(prev) : updater;
    setCategoriesState(next);
    if (!tid) return;
    const prevIds = new Set(prev.map((c) => c.id));
    const nextIds = new Set(next.map((c) => c.id));
    (async () => {
      for (const c of next) {
        if (!prevIds.has(c.id)) {
          await supabase.from("team_categories").insert({ team_id: tid, slug: c.id, label: c.label, sort_order: next.indexOf(c) });
        } else {
          const old = prev.find((x) => x.id === c.id);
          if (old && old.label !== c.label) {
            await supabase.from("team_categories").update({ label: c.label }).eq("team_id", tid).eq("slug", c.id);
          }
        }
      }
      for (const c of prev) {
        if (!nextIds.has(c.id)) {
          await supabase.from("team_categories").delete().eq("team_id", tid).eq("slug", c.id);
        }
      }
    })();
  }, [tid]);

  const setEventTypes: AppState["setEventTypes"] = useCallback((updater) => {
    const prev = eventTypesRef.current;
    const next = typeof updater === "function" ? (updater as (p: string[]) => string[])(prev) : updater;
    setEventTypesState(next);
    if (!tid) return;
    const prevSet = new Set(prev);
    const nextSet = new Set(next);
    (async () => {
      for (let i = 0; i < next.length; i++) {
        const label = next[i];
        if (!prevSet.has(label)) {
          await supabase.from("team_event_types").insert({ team_id: tid, label, sort_order: i });
        }
      }
      for (const label of prev) {
        if (!nextSet.has(label)) {
          await supabase.from("team_event_types").delete().eq("team_id", tid).eq("label", label);
        }
      }
    })();
  }, [tid]);

  const setAttendance: AppState["setAttendance"] = useCallback((eventId, userKey, response) => {
    // userKey = email
    const email = userKey.trim().toLowerCase();
    const userId = emailToId.get(email);
    setAttendanceState((prev) => {
      const cur = { ...(prev[eventId] ?? {}) };
      if (response == null) delete cur[userKey]; else cur[userKey] = response;
      return { ...prev, [eventId]: cur };
    });
    if (!userId) return;
    (async () => {
      if (response == null) {
        await supabase.from("attendance").delete().eq("event_id", eventId).eq("user_id", userId);
      } else {
        await supabase.from("attendance").upsert({
          event_id: eventId, user_id: userId,
          status: response.status, reason: response.reason ?? null,
        }, { onConflict: "event_id,user_id" });
      }
    })();
  }, [emailToId]);

  const markWake: AppState["markWake"] = useCallback((date, userKey) => {
    const email = userKey.trim().toLowerCase();
    const userId = emailToId.get(email);
    setWakeups((prev) => ({ ...prev, [date]: { ...(prev[date] ?? {}), [userKey]: true } }));
    if (!userId || !tid) return;
    (async () => {
      await supabase.from("wakeups").insert({ team_id: tid, wake_date: date, user_id: userId });
    })();
  }, [emailToId, tid]);

  const addFinanceChargeForAll: AppState["addFinanceChargeForAll"] = useCallback(({ title, amount, dueDate }) => {
    if (!tid) return;
    (async () => {
      const { data } = await supabase.from("finance_items").insert({
        team_id: tid, title: title.trim(), amount, due_date: dueDate,
      }).select("*").single();
      if (data) {
        const rows = membersRef.current.map((m) => ({ item_id: data.id, user_id: m.id, paid: false }));
        if (rows.length) await supabase.from("finance_payments").insert(rows);
      }
    })();
  }, [tid]);

  const setPaid: AppState["setPaid"] = useCallback((itemId, userEmail, paid) => {
    const userId = emailToId.get(userEmail.trim().toLowerCase());
    if (!userId) return;
    (async () => {
      await supabase.from("finance_payments").upsert({
        item_id: itemId, user_id: userId, paid, paid_at: paid ? new Date().toISOString() : null,
      }, { onConflict: "item_id,user_id" });
    })();
  }, [emailToId]);

  const deleteFinanceItem: AppState["deleteFinanceItem"] = useCallback((itemId) => {
    (async () => { await supabase.from("finance_items").delete().eq("id", itemId); })();
  }, []);

  const addAnnouncement: AppState["addAnnouncement"] = useCallback((a) => {
    if (!tid || !profile) return;
    (async () => {
      await supabase.from("announcements").insert({
        team_id: tid, text: a.text, when: a.when,
        author_id: profile.id, author_name: a.authorName, author_email: a.authorEmail,
      });
    })();
  }, [tid, profile]);

  const deleteAnnouncement: AppState["deleteAnnouncement"] = useCallback((id) => {
    (async () => {
      await supabase.from("announcements").delete().eq("id", id);
      await supabase.from("reports").delete().eq("post_id", id);
    })();
  }, []);

  // ============ Moderation (per-user in Supabase) ============
  const mutePost: AppState["mutePost"] = useCallback((postId) => {
    if (!uid) return;
    setMutedPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
    (async () => { await supabase.from("muted_posts").upsert({ user_id: uid, post_id: postId }, { onConflict: "user_id,post_id" }); })();
  }, [uid]);

  const blockUser: AppState["blockUser"] = useCallback((email) => {
    if (!uid) return;
    const key = email.trim().toLowerCase();
    if (!key) return;
    setBlockedEmails((prev) => (prev.includes(key) ? prev : [...prev, key]));
    (async () => { await supabase.from("blocked_users").upsert({ user_id: uid, blocked_email: key }, { onConflict: "user_id,blocked_email" }); })();
  }, [uid]);

  const unblockUser: AppState["unblockUser"] = useCallback((email) => {
    if (!uid) return;
    const key = email.trim().toLowerCase();
    setBlockedEmails((prev) => prev.filter((e) => e !== key));
    (async () => { await supabase.from("blocked_users").delete().eq("user_id", uid).eq("blocked_email", key); })();
  }, [uid]);

  const reportPost: AppState["reportPost"] = useCallback((input) => {
    if (!uid || !profile) return;
    setReports((prev) => [
      { id: `local_${Date.now()}`, ...input, reporterEmail: profile.email, createdAt: Date.now() },
      ...prev,
    ]);
    setMutedPostIds((prev) => (prev.includes(input.postId) ? prev : [...prev, input.postId]));
    (async () => {
      await supabase.from("reports").insert({
        post_id: input.postId, author_email: input.authorEmail, text: input.text,
        kind: input.kind ?? null, reporter_id: uid, reporter_email: profile.email,
        team_id: profile.teamId || null,
      });
      await supabase.from("muted_posts").upsert({ user_id: uid, post_id: input.postId }, { onConflict: "user_id,post_id" });
    })();
  }, [uid, profile]);

  const deleteAccount: AppState["deleteAccount"] = useCallback(async () => {
    if (!profile) return;
    // Best-effort: purge our profile row and sign out. Auth.users row remains
    // (only service role can delete); user can re-register with the same email.
    await supabase.from("profiles").delete().eq("id", profile.id);
    try { localStorage.removeItem(tpKey(profile.id)); } catch { /* noop */ }
    await supabase.auth.signOut();
    setProfileState(null);
  }, [profile]);

  const isLeader = useMemo(() => {
    if (!profile) return false;
    return !!ROLE_OPTIONS.find((r) => r.id === profile.role)?.leader;
  }, [profile]);

  // Keep members in sync when the current profile mutates (name/avatar)
  useEffect(() => {
    if (!profile) return;
    setMembers((ms) => {
      const map = new Map(ms.map((m) => [m.id, m]));
      map.set(profile.id, profile);
      return Array.from(map.values());
    });
  }, [profile]);

  void catLabelMap; void idToEmail; // reserved for future use

  const value: AppState = {
    profile, isLeader,
    login, registerNewTeam, joinExistingTeam, signInWithGoogle, updateProfile, signOut,
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
    mutedPostIds, blockedEmails,
    mutePost, blockUser, unblockUser, reportPost, reports,
    deleteAccount,
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
