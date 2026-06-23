import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-store";

const WHEN_OPTIONS = [
  { id: "today", label: "今日" },
  { id: "tomorrow", label: "明日" },
  { id: "this-week", label: "今週" },
  { id: "general", label: "随時" },
];

function fmtTime(ts: number) {
  const d = new Date(ts);
  const m = `${d.getMonth() + 1}/${d.getDate()}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m} ${hh}:${mm}`;
}

export function AnnouncementsBoard() {
  const {
    announcements,
    addAnnouncement,
    deleteAnnouncement,
    isLeader,
    profile,
  } = useApp();
  const [text, setText] = useState("");
  const [when, setWhen] = useState("today");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return toast.error("お知らせ内容を入力してください");
    addAnnouncement({
      text: t,
      when,
      authorName: profile?.name ?? "幹部",
      authorEmail: profile?.email ?? "",
    });
    setText("");
    toast.success("お知らせを投稿しました");
  };

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Megaphone className="h-4 w-4 text-primary" /> お知らせ
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {isLeader
          ? "チーム全員に一言で周知できます。"
          : "幹部からのお知らせが表示されます。"}
      </p>

      {isLeader && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Select value={when} onValueChange={setWhen}>
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHEN_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="例：13時〜練習開始"
              maxLength={120}
            />
            <Button type="submit" size="icon" aria-label="投稿">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      <ul className="mt-3 space-y-2">
        {announcements.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-center text-xs text-muted-foreground">
            まだお知らせはありません
          </li>
        )}
        {announcements.map((a) => {
          const label =
            WHEN_OPTIONS.find((o) => o.id === a.when)?.label ?? "随時";
          return (
            <li
              key={a.id}
              className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3"
            >
              <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-foreground">{a.text}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {a.authorName}・{fmtTime(a.createdAt)}
                </p>
              </div>
              {isLeader && a.authorEmail === profile?.email && (
                <button
                  type="button"
                  onClick={() => deleteAnnouncement(a.id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-rose-400"
                  aria-label="削除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
