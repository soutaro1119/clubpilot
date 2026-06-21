import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  MapPin,
  Copy,
  Check,
  CloudRain,
  Megaphone,
  ClipboardCheck,
  Shield,
  CalendarPlus,
  Package,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  EventCalendar,
  colorFor,
  type CalendarEvent,
} from "@/components/EventCalendar";
import { useApp } from "@/lib/app-store";

type FormState = {
  eventType: string;
  categories: string[];
  opponent: string;
  date: string;
  meetingTime: string;
  warmupTime: string;
  startTime: string;
  location: string;
  items: string;
  attendanceDeadline: string;
  notes: string;
  rainCancel: boolean;
};

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

function fmtDate(d: string) {
  if (!d) return "未定";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日(${WEEK[dt.getDay()]})`;
}
function fmtDateTime(d: string) {
  if (!d) return "未定";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${dt.getMonth() + 1}/${dt.getDate()}(${WEEK[dt.getDay()]}) ${hh}:${mm}`;
}
const reactionsBlock = `\n―――\n📱 Club Pilot アプリ内で「出席 / 欠席 / 遅刻・保留」をタップして回答してください。\n（このトークでスタンプを返す必要はありません）`;

export function LeaderDashboard() {
  const {
    events,
    setEvents,
    categories,
    eventTypes,
    preferences,
    setPreferences,
  } = useApp();

  const labelOf = (id: string) =>
    categories.find((c) => c.id === id)?.label ?? id;

  const initialState: FormState = {
    eventType: eventTypes[0] ?? "イベント",
    categories: [categories[0]?.id ?? "all"],
    opponent: "",
    date: "",
    meetingTime: "",
    warmupTime: "",
    startTime: "",
    location: "",
    items: "",
    attendanceDeadline: "",
    notes: "",
    rainCancel: false,
  };

  const [form, setForm] = useState<FormState>(initialState);
  const [copied, setCopied] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const toggleCat = (id: string) =>
    setForm((p) => ({
      ...p,
      categories: p.categories.includes(id)
        ? p.categories.filter((c) => c !== id)
        : [...p.categories, id],
    }));

  function rainBlock(f: FormState) {
    return f.rainCancel
      ? `\n⚠️ 雨天中止の可能性あり\n当日の天候により中止となる場合があります。中止判断は当日朝にご連絡します。\n`
      : "";
  }
  function itemsLine(f: FormState) {
    if (!preferences.useItems) return "";
    return `▼ 持ち物：${f.items || "通常装備"}\n`;
  }
  function reactions() {
    return preferences.useReactions ? reactionsBlock : "";
  }

  function announcement(f: FormState, cat: string) {
    const audience = cat === "all" ? "全員へ" : `${labelOf(cat)}へ`;
    return `【お知らせ｜${f.eventType}】${audience}

お疲れ様です。次の${f.eventType}の連絡です。

▼ 対戦相手：${f.opponent || "未定"}
▼ 日程：${fmtDate(f.date)}
▼ 集合：${f.meetingTime || "未定"}
▼ アップ開始：${f.warmupTime || "未定"}
▼ 試合開始：${f.startTime || "未定"}
▼ 場所：${f.location || "未定"}
${itemsLine(f)}${rainBlock(f)}${f.notes ? `\n📝 備考\n${f.notes}\n` : ""}全員でいきましょう。よろしくお願いします！${reactions()}`;
  }

  function attendance(f: FormState, cat: string) {
    const audience = cat === "all" ? "全員" : labelOf(cat);
    return `【出欠確認｜${f.eventType}】${audience}

下記${f.eventType}の出欠をお願いします。

・対戦相手：${f.opponent || "未定"}
・日程：${fmtDate(f.date)}
・集合：${f.meetingTime || "未定"} ／ 場所：${f.location || "未定"}
${rainBlock(f)}
⏰ 回答締切：${fmtDateTime(f.attendanceDeadline)}

📱 回答は Club Pilot アプリのカレンダーから当該予定をタップ → 「出席 / 欠席 / 遅刻・保留」ボタンでお願いします。
締切までに必ず回答してください。${reactions()}`;
  }

  function staffMsg(f: FormState, cat: string) {
    const audience = cat === "manager" ? "マネージャー各位" : `スタッフ各位（${labelOf(cat)}）`;
    return `【スタッフ連絡｜${f.eventType}】${audience}

▼ 試合概要
・対戦相手：${f.opponent || "未定"}
・日程：${fmtDate(f.date)}
・場所：${f.location || "未定"}

▼ タイムスケジュール
・集合：${f.meetingTime || "未定"}
・アップ開始：${f.warmupTime || "未定"}
・試合開始：${f.startTime || "未定"}

▼ 準備物
${preferences.useItems ? `・選手持ち物：${f.items || "通常装備"}\n` : ""}・出欠締切：${fmtDateTime(f.attendanceDeadline)}
${rainBlock(f)}${f.notes ? `\n▼ 備考\n${f.notes}\n` : ""}集合15分前までに現地へお願いします。${reactions()}`;
  }

  const KINDS = [
    { id: "announcement", label: "チーム連絡", icon: Megaphone, build: announcement },
    { id: "attendance", label: "出欠確認", icon: ClipboardCheck, build: attendance },
    { id: "staff", label: "スタッフ連絡", icon: Shield, build: staffMsg },
  ];

  const outputs = useMemo(() => {
    const cats = form.categories.length ? form.categories : ["all"];
    return KINDS.map((k) => ({
      ...k,
      blocks: cats.map((c) => ({
        cat: c,
        catLabel: labelOf(c),
        text: k.build(form, c),
      })),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, preferences, categories]);

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("コピーしました");
    setTimeout(() => setCopied(null), 1600);
  };
  const copyAll = async (kindId: string, blocks: { text: string }[]) => {
    await navigator.clipboard.writeText(blocks.map((b) => b.text).join("\n\n―――\n\n"));
    setCopied(`${kindId}-all`);
    toast.success("すべてコピーしました");
    setTimeout(() => setCopied(null), 1600);
  };
  const copyAndOpenLine = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* noop */ }
    toast.success("文章をコピー＆LINEを開きます");
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  };

  const addEventToCalendar = () => {
    if (!form.date) {
      toast.error("日付を選択してください");
      return;
    }
    const cats = form.categories.length ? form.categories : ["all"];
    const titleParts = [form.eventType];
    if (form.opponent) titleParts.push(`vs ${form.opponent}`);
    const labels: Record<string, string> = {};
    for (const c of cats) labels[c] = labelOf(c);
    const ev: CalendarEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: form.date,
      title: titleParts.join(" "),
      eventType: form.eventType,
      categories: cats,
      categoryLabels: labels,
      meetingTime: form.meetingTime,
      warmupTime: form.warmupTime,
      startTime: form.startTime,
      location: form.location,
      opponent: form.opponent,
      items: form.items,
      notes: form.notes,
      attendanceDeadline: form.attendanceDeadline,
      rainCancel: form.rainCancel,
    };
    setEvents((prev) => [...prev, ev]);
    toast.success("カレンダーに登録しました");
  };

  const loadEventToForm = (e: CalendarEvent) => {
    setForm({
      eventType: e.eventType,
      categories: e.categories.length ? e.categories : ["all"],
      opponent: e.opponent ?? "",
      date: e.date,
      meetingTime: e.meetingTime ?? "",
      warmupTime: e.warmupTime ?? "",
      startTime: e.startTime ?? "",
      location: e.location ?? "",
      items: e.items ?? "",
      attendanceDeadline: e.attendanceDeadline ?? "",
      notes: e.notes ?? "",
      rainCancel: !!e.rainCancel,
    });
    toast.success("フォームに反映しました");
    setTimeout(() => {
      document
        .getElementById("generator-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("削除しました");
  };

  return (
    <div className="space-y-5">
      <EventCalendar
        events={events}
        onSelectEvent={loadEventToForm}
        onDeleteEvent={deleteEvent}
      />

      <section
        id="generator-form"
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold">送信先カテゴリー（複数選択可）</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          設定画面から自由にカテゴリーを追加・編集できます。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((c) => {
            const checked = form.categories.includes(c.id);
            const col = colorFor(c.id, c.label);
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  checked
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleCat(c.id)} />
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${col.bg}`} />
                <span className="truncate">{c.label}</span>
              </label>
            );
          })}
        </div>

        <div className="my-5 h-px bg-border" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="イベント種別">
            <Select value={form.eventType} onValueChange={(v) => set("eventType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {eventTypes.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="対戦相手 / 相手">
            <Input value={form.opponent} onChange={(e) => set("opponent", e.target.value)} placeholder="例：〇〇大学" />
          </Field>

          <Field label="日付" icon={<CalendarDays className="h-3.5 w-3.5" />}>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>

          <Field label="場所" icon={<MapPin className="h-3.5 w-3.5" />}>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="例：ホームグラウンド" />
          </Field>

          <Field label="集合時間" icon={<Clock className="h-3.5 w-3.5" />}>
            <Input type="time" value={form.meetingTime} onChange={(e) => set("meetingTime", e.target.value)} />
          </Field>

          <Field label="アップ開始" icon={<Clock className="h-3.5 w-3.5" />}>
            <Input type="time" value={form.warmupTime} onChange={(e) => set("warmupTime", e.target.value)} />
          </Field>

          <Field label="開始" icon={<Clock className="h-3.5 w-3.5" />}>
            <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Field>

          <Field label="出欠締切">
            <Input type="datetime-local" value={form.attendanceDeadline} onChange={(e) => set("attendanceDeadline", e.target.value)} />
          </Field>

          {preferences.useItems && (
            <Field label="持ち物" className="sm:col-span-2">
              <Input value={form.items} onChange={(e) => set("items", e.target.value)} placeholder="例：ユニフォーム、水筒、すね当て" />
            </Field>
          )}

          <Field label="備考" className="sm:col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="その他連絡事項" />
          </Field>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <label className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${preferences.useItems ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="flex min-w-0 items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-primary" />
              <div><p className="text-xs font-medium">持ち物欄を使用する</p></div>
            </div>
            <Checkbox
              checked={preferences.useItems}
              onCheckedChange={(v) => setPreferences((p) => ({ ...p, useItems: !!v }))}
            />
          </label>

          <label className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${preferences.useReactions ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="flex min-w-0 items-center gap-2">
              <ThumbsUp className="h-4 w-4 shrink-0 text-primary" />
              <div><p className="text-xs font-medium">出欠リアクション案内</p></div>
            </div>
            <Switch
              checked={preferences.useReactions}
              onCheckedChange={(v) => setPreferences((p) => ({ ...p, useReactions: v }))}
            />
          </label>

          <label className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${form.rainCancel ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="flex min-w-0 items-center gap-2">
              <CloudRain className="h-4 w-4 shrink-0 text-primary" />
              <div><p className="text-xs font-medium">雨天中止の可能性</p></div>
            </div>
            <Switch checked={form.rainCancel} onCheckedChange={(v) => set("rainCancel", v)} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setForm(initialState)}>リセット</Button>
          <Button size="sm" onClick={addEventToCalendar}>
            <CalendarPlus className="h-3.5 w-3.5" />カレンダーに登録
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        {form.categories.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
            送信先カテゴリーを選択してください
          </div>
        )}

        {form.categories.length > 0 && outputs.map((kind) => {
          const Icon = kind.icon;
          return (
            <div key={kind.id} className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="truncate text-sm font-semibold">{kind.label}</h3>
                </div>
                {kind.blocks.length > 1 && (
                  <Button size="sm" variant="outline" onClick={() => copyAll(kind.id, kind.blocks)}>
                    {copied === `${kind.id}-all` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    全てコピー
                  </Button>
                )}
              </div>
              <div className="divide-y divide-border">
                {kind.blocks.map((b) => {
                  const key = `${kind.id}-${b.cat}`;
                  return (
                    <div key={key} className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                          {b.catLabel}
                        </span>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy(key, b.text)}>
                          {copied === key ? <><Check className="h-3.5 w-3.5" /> コピー済</> : <><Copy className="h-3.5 w-3.5" /> コピー</>}
                        </Button>
                      </div>
                      <pre className="whitespace-pre-wrap break-words rounded-lg bg-secondary/40 p-3 font-sans text-[13px] leading-relaxed text-foreground">
                        {b.text}
                      </pre>
                      <Button
                        className="mt-2 w-full bg-[#06C755] text-white hover:bg-[#05b34c]"
                        onClick={() => copyAndOpenLine(b.text)}
                      >
                        文章をコピーしてLINEを開く
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Field({
  label, children, icon, className,
}: { label: string; children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
        {icon}{label}
      </Label>
      {children}
    </div>
  );
}
