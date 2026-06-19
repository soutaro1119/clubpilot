import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CalendarCategoryId = "top" | "b" | "c" | "manager" | "all";

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  eventType: string;
  categories: CalendarCategoryId[];
  meetingTime?: string;
  warmupTime?: string;
  startTime?: string;
  location?: string;
  opponent?: string;
  items?: string;
  notes?: string;
  attendanceDeadline?: string;
  rainCancel?: boolean;
};

export const CATEGORY_COLORS: Record<
  CalendarCategoryId,
  { bg: string; text: string; ring: string; label: string; short: string }
> = {
  top: { bg: "bg-rose-500", text: "text-white", ring: "ring-rose-500/30", label: "トップ", short: "トップ" },
  b: { bg: "bg-sky-500", text: "text-white", ring: "ring-sky-500/30", label: "B", short: "B" },
  c: { bg: "bg-emerald-500", text: "text-white", ring: "ring-emerald-500/30", label: "C", short: "C" },
  manager: { bg: "bg-violet-500", text: "text-white", ring: "ring-violet-500/30", label: "Mgr", short: "Mgr" },
  all: { bg: "bg-amber-500", text: "text-white", ring: "ring-amber-500/30", label: "全員", short: "全" },
};

const WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function EventCalendar({
  events,
  onSelectEvent,
  onDeleteEvent,
}: {
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(ymd(today));

  const { weeks, monthLabel } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: ({ date: Date; key: string } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      cells.push({ date: dt, key: ymd(dt) });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return {
      weeks,
      monthLabel: `${year}年${month + 1}月`,
    };
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      (m[e.date] ??= []).push(e);
    }
    return m;
  }, [events]);

  const todayKey = ymd(today);
  const dayEvents = eventsByDate[selectedDate] ?? [];

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">カレンダー</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
            aria-label="前の月"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[7ch] text-center text-sm font-semibold">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
            aria-label="次の月"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {WEEK_LABELS.map((w, i) => (
          <div
            key={w}
            className={
              i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : undefined
            }
          >
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {weeks.flat().map((cell, idx) => {
          if (!cell) return <div key={idx} className="aspect-square" />;
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDate;
          const evs = eventsByDate[cell.key] ?? [];
          const weekday = cell.date.getDay();
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelectedDate(cell.key)}
              className={`flex aspect-square flex-col items-stretch rounded-lg border p-1 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span
                className={`text-[11px] font-semibold leading-none ${
                  isToday
                    ? "inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : weekday === 0
                      ? "text-rose-500"
                      : weekday === 6
                        ? "text-sky-500"
                        : "text-foreground"
                }`}
              >
                {cell.date.getDate()}
              </span>
              <div className="mt-0.5 flex flex-wrap gap-0.5 overflow-hidden">
                {evs.slice(0, 3).map((e) => {
                  const cat = e.categories[0] ?? "all";
                  const c = CATEGORY_COLORS[cat];
                  return (
                    <span
                      key={e.id}
                      className={`h-1.5 w-1.5 rounded-full ${c.bg}`}
                      title={`${c.label}：${e.title}`}
                    />
                  );
                })}
                {evs.length > 3 && (
                  <span className="text-[9px] leading-none text-muted-foreground">
                    +{evs.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground">
            {selectedDate} の予定（{dayEvents.length}件）
          </h3>
        </div>
        {dayEvents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            この日に予定はありません
          </p>
        ) : (
          <ul className="space-y-2">
            {dayEvents.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-2 rounded-xl border border-border p-2.5"
              >
                <button
                  type="button"
                  onClick={() => onSelectEvent(e)}
                  className="flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-1">
                    {e.categories.map((c) => {
                      const col = CATEGORY_COLORS[c];
                      return (
                        <span
                          key={c}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${col.bg} ${col.text}`}
                        >
                          {col.label}
                        </span>
                      );
                    })}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                      {e.eventType}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">{e.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.startTime || e.meetingTime || ""}
                    {e.location ? `　${e.location}` : ""}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEvent(e.id)}
                  className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary"
                  aria-label="削除"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          予定をタップすると下のフォームに自動入力されます。
        </p>
      </div>
    </section>
  );
}
