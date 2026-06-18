import { createFileRoute } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  CalendarDays,
  Clock,
  MapPin,
  Copy,
  Check,
  CloudRain,
  Trophy,
  Megaphone,
  ClipboardCheck,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Club Pilot｜大学の部活・サークル・体育会向け 連絡＆出欠確認ツール" },
      {
        name: "description",
        content:
          "大学の部活・サークル・スポーツチームの連絡をスマホから一瞬で作成。試合や練習のお知らせ、出欠確認、スタッフ連絡を自動生成。LINEやSlackにそのまま貼れる、無料の大学生向けチーム運営ツールです。",
      },
      { property: "og:title", content: "Club Pilot｜大学の部活・サークル・体育会向け 連絡＆出欠確認ツール" },
      {
        property: "og:description",
        content:
          "大学スポーツチームの試合・練習連絡をスマホから一瞬で。出欠確認やスタッフ連絡まで自動生成。",
      },
      { property: "og:url", content: "https://clubpilot.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://clubpilot.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Club Pilot",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "ja",
          description:
            "大学の部活・サークル・体育会向けの連絡＆出欠確認ツール。試合・練習のお知らせ、出欠確認、スタッフ連絡を自動生成。",
          audience: {
            "@type": "Audience",
            audienceType: "大学の部活・サークル・スポーツチーム",
          },
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
        }),
      },
    ],
  }),
  component: Index,
});

const CATEGORIES = [
  { id: "top", label: "トップチーム" },
  { id: "b", label: "Bチーム" },
  { id: "c", label: "Cチーム" },
  { id: "manager", label: "マネージャー" },
  { id: "all", label: "全員" },
] as const;
type CategoryId = (typeof CATEGORIES)[number]["id"];

const EVENT_TYPES = [
  "リーグ戦",
  "カップ戦",
  "練習試合",
  "練習",
  "大会",
  "ミーティング",
];

type FormState = {
  eventType: string;
  categories: CategoryId[];
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

const initialState: FormState = {
  eventType: "リーグ戦",
  categories: ["top"],
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

function labelOf(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "";
}

function rainBlock(f: FormState) {
  return f.rainCancel
    ? `\n⚠️ 雨天中止の可能性あり\n当日の天候により中止となる場合があります。中止判断は当日朝にご連絡します。\n`
    : "";
}

function announcement(f: FormState, cat: CategoryId) {
  const audience = cat === "all" ? "全員へ" : `${labelOf(cat)}へ`;
  return `【お知らせ｜${f.eventType}】${audience}

お疲れ様です。次の${f.eventType}の連絡です。

▼ 対戦相手：${f.opponent || "未定"}
▼ 日程：${fmtDate(f.date)}
▼ 集合：${f.meetingTime || "未定"}
▼ アップ開始：${f.warmupTime || "未定"}
▼ 試合開始：${f.startTime || "未定"}
▼ 場所：${f.location || "未定"}
▼ 持ち物：${f.items || "通常装備"}
${rainBlock(f)}${f.notes ? `\n📝 備考\n${f.notes}\n` : ""}
全員で勝ちにいきましょう。よろしくお願いします！`;
}

function attendance(f: FormState, cat: CategoryId) {
  const audience = cat === "all" ? "全員" : labelOf(cat);
  return `【出欠確認｜${f.eventType}】${audience}

下記${f.eventType}の出欠をお願いします。

・対戦相手：${f.opponent || "未定"}
・日程：${fmtDate(f.date)}
・集合：${f.meetingTime || "未定"} ／ 場所：${f.location || "未定"}
${rainBlock(f)}
⏰ 回答締切：${fmtDateTime(f.attendanceDeadline)}

「⭕️ 出席」または「❌ 欠席（理由）」でご返信ください。
締切までに必ず回答をお願いします。`;
}

function staff(f: FormState, cat: CategoryId) {
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
・選手持ち物：${f.items || "通常装備"}
・出欠締切：${fmtDateTime(f.attendanceDeadline)}
${rainBlock(f)}${f.notes ? `\n▼ 備考\n${f.notes}\n` : ""}
集合15分前までに現地へお願いします。確認後、スタッフグループにて返信をお願いします。`;
}

const KINDS = [
  { id: "announcement", label: "チーム連絡", icon: Megaphone, build: announcement },
  { id: "attendance", label: "出欠確認", icon: ClipboardCheck, build: attendance },
  { id: "staff", label: "スタッフ連絡", icon: Shield, build: staff },
] as const;

function Index() {
  const [form, setForm] = useState<FormState>(initialState);
  const [copied, setCopied] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleCat = (id: CategoryId) =>
    setForm((p) => ({
      ...p,
      categories: p.categories.includes(id)
        ? p.categories.filter((c) => c !== id)
        : [...p.categories, id],
    }));

  const outputs = useMemo(() => {
    const cats = form.categories.length ? form.categories : (["all"] as CategoryId[]);
    return KINDS.map((k) => ({
      ...k,
      blocks: cats.map((c) => ({
        cat: c,
        catLabel: labelOf(c),
        text: k.build(form, c),
      })),
    }));
  }, [form]);

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

  return (
    <div className="min-h-screen bg-background pb-12">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-hero)" }}
          >
            <Trophy className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold tracking-tight">Club Pilot</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              大学スポーツチーム向け 連絡ジェネレーター
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-5">
        {/* Form Card */}
        <section
          className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {/* Categories */}
          <h2 className="text-sm font-semibold">送信先カテゴリー（複数選択可）</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            選択したカテゴリーごとにメッセージが生成されます。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => {
              const checked = form.categories.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    checked
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleCat(c.id)}
                  />
                  <span>{c.label}</span>
                </label>
              );
            })}
          </div>

          <div className="my-5 h-px bg-border" />

          {/* Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="イベント種別">
              <Select value={form.eventType} onValueChange={(v) => set("eventType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="対戦相手">
              <Input
                placeholder="例：〇〇大学"
                value={form.opponent}
                onChange={(e) => set("opponent", e.target.value)}
              />
            </Field>

            <Field label="試合日" icon={<CalendarDays className="h-3.5 w-3.5" />}>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>

            <Field label="場所" icon={<MapPin className="h-3.5 w-3.5" />}>
              <Input
                placeholder="例：ホームグラウンド"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>

            <Field label="集合時間" icon={<Clock className="h-3.5 w-3.5" />}>
              <Input
                type="time"
                value={form.meetingTime}
                onChange={(e) => set("meetingTime", e.target.value)}
              />
            </Field>

            <Field label="アップ開始" icon={<Clock className="h-3.5 w-3.5" />}>
              <Input
                type="time"
                value={form.warmupTime}
                onChange={(e) => set("warmupTime", e.target.value)}
              />
            </Field>

            <Field label="試合開始" icon={<Clock className="h-3.5 w-3.5" />}>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </Field>

            <Field label="出欠締切">
              <Input
                type="datetime-local"
                value={form.attendanceDeadline}
                onChange={(e) => set("attendanceDeadline", e.target.value)}
              />
            </Field>

            <Field label="持ち物" className="sm:col-span-2">
              <Input
                placeholder="例：ユニフォーム、水筒、すね当て"
                value={form.items}
                onChange={(e) => set("items", e.target.value)}
              />
            </Field>

            <Field label="備考" className="sm:col-span-2">
              <Textarea
                rows={3}
                placeholder="その他連絡事項"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>

          {/* Rain toggle */}
          <label
            className={`mt-4 flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
              form.rainCancel ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <CloudRain className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">雨天中止の可能性</p>
                <p className="text-xs text-muted-foreground">
                  メッセージに中止条項を追加します
                </p>
              </div>
            </div>
            <Switch
              checked={form.rainCancel}
              onCheckedChange={(v) => set("rainCancel", v)}
            />
          </label>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setForm(initialState)}>
              リセット
            </Button>
          </div>
        </section>

        {/* Outputs */}
        <section className="space-y-4">
          {form.categories.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
              送信先カテゴリーを選択してください
            </div>
          )}

          {form.categories.length > 0 &&
            outputs.map((kind) => {
              const Icon = kind.icon;
              return (
                <div
                  key={kind.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-primary-foreground"
                        style={{ background: "var(--gradient-hero)" }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="truncate text-sm font-semibold">{kind.label}</h3>
                    </div>
                    {kind.blocks.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyAll(kind.id, kind.blocks)}
                      >
                        {copied === `${kind.id}-all` ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => copy(key, b.text)}
                            >
                              {copied === key ? (
                                <>
                                  <Check className="h-3.5 w-3.5" /> コピー済
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" /> コピー
                                </>
                              )}
                            </Button>
                          </div>
                          <pre className="whitespace-pre-wrap break-words rounded-lg bg-secondary/40 p-3 font-sans text-[13px] leading-relaxed text-foreground">
                            {b.text}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
  icon,
  className,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
