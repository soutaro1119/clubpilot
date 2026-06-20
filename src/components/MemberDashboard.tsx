import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sun, CheckCircle2, X, Clock } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { EventCalendar, CATEGORY_COLORS, type CalendarEvent } from "@/components/EventCalendar";
import { toast } from "sonner";

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function MemberDashboard() {
  const { events, attendance, setAttendance, wakeups, markWake, profile } = useApp();
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null);

  const today = todayKey();
  const me = profile!.email;

  // Show morning button if today has an event flagged as 朝練 OR an event before 09:00
  const hasMorningToday = useMemo(() => {
    return events.some((e) => {
      if (e.date !== today) return false;
      if (e.eventType?.includes("朝練")) return true;
      const t = e.meetingTime || e.startTime;
      if (t && t < "09:00") return true;
      return false;
    });
  }, [events, today]);

  const awake = !!wakeups[today]?.[me];

  const myStatus = openEvent ? attendance[openEvent.id]?.[me] ?? null : null;

  const respond = (status: "attend" | "absent" | "late") => {
    if (!openEvent) return;
    setAttendance(openEvent.id, me, status);
    toast.success(
      status === "attend" ? "出席で回答しました" : status === "absent" ? "欠席で回答しました" : "遅刻で回答しました",
    );
  };

  return (
    <div className="space-y-5">
      {hasMorningToday && (
        <button
          type="button"
          onClick={() => !awake && markWake(today, me)}
          disabled={awake}
          className={`w-full rounded-3xl border p-6 text-center transition ${
            awake
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
          }`}
        >
          <Sun className={`mx-auto h-10 w-10 ${awake ? "text-emerald-600" : "text-amber-600"}`} />
          <p className={`mt-2 text-2xl font-extrabold ${awake ? "text-emerald-700" : "text-amber-700"}`}>
            {awake ? "起床済み" : "起きました！"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {awake ? "今朝の起床を報告しました。" : "タップして起床を報告してください。"}
          </p>
        </button>
      )}

      <EventCalendar
        events={events}
        onSelectEvent={(e) => setOpenEvent(e)}
        onDeleteEvent={() => { /* members cannot delete */ }}
      />

      <Dialog open={!!openEvent} onOpenChange={(o) => !o && setOpenEvent(null)}>
        <DialogContent className="max-w-md">
          {openEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{openEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {openEvent.categories.map((c) => {
                    const col = CATEGORY_COLORS[c as keyof typeof CATEGORY_COLORS];
                    if (!col) return null;
                    return (
                      <span
                        key={c}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.bg} ${col.text}`}
                      >
                        {col.label}
                      </span>
                    );
                  })}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                    {openEvent.eventType}
                  </span>
                </div>
                <p><b>日付：</b>{openEvent.date}</p>
                {openEvent.opponent && <p><b>対戦相手：</b>{openEvent.opponent}</p>}
                {openEvent.meetingTime && <p><b>集合：</b>{openEvent.meetingTime}</p>}
                {openEvent.startTime && <p><b>開始：</b>{openEvent.startTime}</p>}
                {openEvent.location && <p><b>場所：</b>{openEvent.location}</p>}
                {openEvent.notes && <p className="text-xs text-muted-foreground">{openEvent.notes}</p>}
              </div>

              <div className="mt-2">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  出欠を回答（現在：{myStatus === "attend" ? "出席" : myStatus === "absent" ? "欠席" : myStatus === "late" ? "遅刻" : "未回答"}）
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={myStatus === "attend" ? "default" : "outline"}
                    onClick={() => respond("attend")}
                  >
                    <CheckCircle2 className="h-4 w-4" />出席
                  </Button>
                  <Button
                    variant={myStatus === "absent" ? "default" : "outline"}
                    onClick={() => respond("absent")}
                  >
                    <X className="h-4 w-4" />欠席
                  </Button>
                  <Button
                    variant={myStatus === "late" ? "default" : "outline"}
                    onClick={() => respond("late")}
                  >
                    <Clock className="h-4 w-4" />遅刻
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
