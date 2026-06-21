import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [reason, setReason] = useState("");

  const today = todayKey();
  const me = profile!.email;

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
  const current = openEvent ? attendance[openEvent.id]?.[me] ?? null : null;
  const [pending, setPending] = useState<"attend" | "absent" | "late" | null>(null);

  const openDialog = (ev: CalendarEvent) => {
    setOpenEvent(ev);
    const cur = attendance[ev.id]?.[me];
    setPending(cur?.status ?? null);
    setReason(cur?.reason ?? "");
  };

  const submit = () => {
    if (!openEvent || !pending) return;
    if ((pending === "absent" || pending === "late") && !reason.trim()) {
      toast.error(pending === "absent" ? "欠席理由を入力してください" : "到着予定時間を入力してください");
      return;
    }
    setAttendance(openEvent.id, me, {
      status: pending,
      reason: pending === "attend" ? undefined : reason.trim(),
    });
    toast.success(
      pending === "attend" ? "出席で回答しました" : pending === "absent" ? "欠席で回答しました" : "遅刻・保留で回答しました",
    );
    setOpenEvent(null);
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
          <Sun className={`mx-auto h-10 w-10 ${awake ? "text-emerald-500" : "text-amber-500"}`} />
          <p className={`mt-2 text-2xl font-extrabold ${awake ? "text-emerald-400" : "text-amber-400"}`}>
            {awake ? "起床済み" : "起きました！"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {awake ? "今朝の起床を報告しました。" : "タップして起床を報告してください。"}
          </p>
        </button>
      )}

      <EventCalendar
        events={events}
        onSelectEvent={openDialog}
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
                      <span key={c} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.bg} ${col.text}`}>
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
                  出欠を回答（現在：{current?.status === "attend" ? "出席" : current?.status === "absent" ? "欠席" : current?.status === "late" ? "遅刻・保留" : "未回答"}）
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={pending === "attend" ? "default" : "outline"}
                    onClick={() => setPending("attend")}
                  >
                    <CheckCircle2 className="h-4 w-4" />出席
                  </Button>
                  <Button
                    variant={pending === "absent" ? "default" : "outline"}
                    onClick={() => setPending("absent")}
                  >
                    <X className="h-4 w-4" />欠席
                  </Button>
                  <Button
                    variant={pending === "late" ? "default" : "outline"}
                    onClick={() => setPending("late")}
                  >
                    <Clock className="h-4 w-4" />遅刻・保留
                  </Button>
                </div>

                {pending === "absent" && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium">欠席理由</p>
                    <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：体調不良のため" />
                  </div>
                )}
                {pending === "late" && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium">到着予定時間 / 理由</p>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：10:30 着予定（電車遅延）" />
                  </div>
                )}

                <Button className="mt-3 w-full" onClick={submit} disabled={!pending}>
                  回答を送信
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
