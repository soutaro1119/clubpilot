import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Megaphone,
  Send,
  Trash2,
  MoreHorizontal,
  Flag,
  UserX,
  EyeOff,
  Flame,
} from "lucide-react";
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
    categories,
    mutedPostIds,
    blockedEmails,
    mutePost,
    blockUser,
    reportPost,
    reports,
  } = useApp();
  const [text, setText] = useState("");
  const [when, setWhen] = useState("today");
  const [targets, setTargets] = useState<string[]>(["all"]);

  const toggleTarget = (id: string) =>
    setTargets((prev) => {
      if (id === "all") return ["all"];
      const without = prev.filter((x) => x !== "all");
      return without.includes(id) ? without.filter((x) => x !== id) : [...without, id];
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return toast.error("お知らせ内容を入力してください");
    const cats = targets.length ? targets : ["all"];
    addAnnouncement({
      text: t,
      when,
      authorName: profile?.name ?? "幹部",
      authorEmail: profile?.email ?? "",
      categories: cats,
    });
    setText("");
    toast.success("お知らせを投稿しました");
  };

  const myEmail = (profile?.email ?? "").trim().toLowerCase();
  const myCategory = profile?.category ?? "";
  const reportedIds = useMemo(
    () => new Set(reports.map((r) => r.postId)),
    [reports],
  );

  const labelOf = (id: string) =>
    id === "all" ? "全員" : categories.find((c) => c.id === id)?.label ?? id;

  // Members: hide muted/blocked, and only show announcements whose target
  // categories include "all" or the member's category. Leaders see everything.
  const visible = useMemo(() => {
    return announcements.filter((a) => {
      const cats = a.categories?.length ? a.categories : ["all"];
      if (!isLeader) {
        if (mutedPostIds.includes(a.id)) return false;
        const author = (a.authorEmail ?? "").trim().toLowerCase();
        if (author && blockedEmails.includes(author)) return false;
        if (!cats.includes("all") && (!myCategory || !cats.includes(myCategory))) return false;
      }
      return true;
    });
  }, [announcements, isLeader, mutedPostIds, blockedEmails, myCategory]);


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
          ? "チーム全員に一言で周知できます。通報された投稿には旗マークが表示されます。"
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
          <div>
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">配信対象カテゴリー</p>
            <div className="flex flex-wrap gap-1.5">
              <label className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${targets.includes("all") ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                <Checkbox className="h-3 w-3" checked={targets.includes("all")} onCheckedChange={() => toggleTarget("all")} />
                全員
              </label>
              {categories.filter((c) => c.id !== "all").map((c) => {
                const checked = targets.includes(c.id);
                return (
                  <label key={c.id} className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${checked ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                    <Checkbox className="h-3 w-3" checked={checked} onCheckedChange={() => toggleTarget(c.id)} />
                    {c.label}
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      )}

      <ul className="mt-3 space-y-2">
        {visible.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-center text-xs text-muted-foreground">
            まだお知らせはありません
          </li>
        )}
        {visible.map((a) => {
          const label =
            WHEN_OPTIONS.find((o) => o.id === a.when)?.label ?? "随時";
          const authorEmail = (a.authorEmail ?? "").trim().toLowerCase();
          const isMine = authorEmail && authorEmail === myEmail;
          const reportCount = reports.filter((r) => r.postId === a.id).length;
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
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {(a.categories?.length ? a.categories : ["all"]).map((cid) => (
                    <span key={cid} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {labelOf(cid)}宛
                    </span>
                  ))}
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{a.authorName}・{fmtTime(a.createdAt)}</span>
                  {isLeader && reportedIds.has(a.id) && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500/15 px-1.5 py-0.5 font-semibold text-rose-500">
                      <Flame className="h-2.5 w-2.5" />通報{reportCount}
                    </span>
                  )}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="投稿メニュー"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {!isMine && (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          mutePost(a.id);
                          toast.success("この投稿を非表示にしました");
                        }}
                      >
                        <EyeOff className="h-4 w-4" />この投稿を非表示
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          reportPost({
                            postId: a.id,
                            authorEmail: a.authorEmail,
                            text: a.text,
                            kind: "announcement",
                          });
                          toast.success("通報を送信しました");
                        }}
                      >
                        <Flag className="h-4 w-4" />この投稿を通報
                      </DropdownMenuItem>
                      {a.authorEmail && (
                        <DropdownMenuItem
                          onClick={() => {
                            blockUser(a.authorEmail);
                            toast.success("このユーザーをブロックしました");
                          }}
                        >
                          <UserX className="h-4 w-4" />
                          このユーザーをブロック
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {isLeader && (
                    <>
                      {!isMine && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        className="text-rose-500 focus:text-rose-500"
                        onClick={() => {
                          deleteAnnouncement(a.id);
                          toast.success("投稿を削除しました");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />投稿を完全削除（管理者）
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
