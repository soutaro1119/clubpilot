import { useMemo, useState } from "react";
import { useApp, roleLabel } from "@/lib/app-store";

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function AttendanceSummary() {
  const { events, attendance, members, wakeups } = useApp();
  const [eventId, setEventId] = useState<string>(events[0]?.id ?? "");
  const [date, setDate] = useState<string>(todayKey());

  const ev = events.find((e) => e.id === eventId);

  const stats = useMemo(() => {
    const map = attendance[eventId] ?? {};
    let attend = 0, absent = 0, late = 0, none = 0;
    for (const m of members) {
      const s = map[m.email]?.status;
      if (s === "attend") attend++;
      else if (s === "absent") absent++;
      else if (s === "late") late++;
      else none++;
    }
    return { attend, absent, late, none };
  }, [attendance, eventId, members]);

  const wakeMap = wakeups[date] ?? {};

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold">出欠状況</h2>
        {events.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            まだ予定が登録されていません。「ホーム」から予定を登録してください。
          </p>
        ) : (
          <>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-muted-foreground">対象イベント</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.date}　{e.title}</option>
                ))}
              </select>
            </div>

            {ev && (
              <>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <Stat label="出席" value={stats.attend} className="bg-emerald-500/15 text-emerald-400" />
                  <Stat label="欠席" value={stats.absent} className="bg-rose-500/15 text-rose-400" />
                  <Stat label="遅刻・保留" value={stats.late} className="bg-amber-500/15 text-amber-400" />
                  <Stat label="未回答" value={stats.none} className="bg-secondary text-foreground" />
                </div>

                {members.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    まだ登録部員がいません
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                    {members.map((m) => {
                      const r = attendance[eventId]?.[m.email];
                      const s = r?.status ?? null;
                      return (
                        <li
                          key={m.email}
                          className={`flex items-start justify-between gap-3 px-3 py-2 ${s == null ? "bg-rose-500/5" : ""}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground">{roleLabel(m.role)}</p>
                            {r?.reason && (
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">📝 {r.reason}</p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              s === "attend" ? "bg-emerald-500 text-white"
                              : s === "absent" ? "bg-rose-500 text-white"
                              : s === "late" ? "bg-amber-500 text-white"
                              : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {s === "attend" ? "出席" : s === "absent" ? "欠席" : s === "late" ? "遅刻" : "未回答"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </section>

      <section
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold">朝練の起床確認</h2>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-muted-foreground">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        {members.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            まだ登録部員がいません
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {members.map((m) => {
              const awake = !!wakeMap[m.email];
              return (
                <li
                  key={m.email}
                  className={`flex items-center justify-between gap-3 px-3 py-2 ${!awake ? "bg-rose-500/5" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">{roleLabel(m.role)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      awake ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    }`}
                  >
                    {awake ? "起床済み" : "未起床"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          赤くハイライトされた部員はまだ「起きました」を押していません。
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={`rounded-lg p-2 ${className}`}>
      <div className="text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-0.5 text-[10px]">{label}</div>
    </div>
  );
}
