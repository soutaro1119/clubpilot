import { useState } from "react";
import { useApp } from "@/lib/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "create" | "join";

export function TeamSetupScreen() {
  const { profile, setupTeam, signOut } = useApp();
  const [mode, setMode] = useState<Mode>("create");
  const [team, setTeam] = useState("");
  const [teamPassword, setTeamPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await setupTeam(mode, team, teamPassword);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(mode === "create" ? "チームを作成しました" : "チームに参加しました");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-7"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h1 className="text-xl font-bold">チーム設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.name ?? "あなた"}さん、チームを作成するか、既存のチームに参加してください。
        </p>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-lg py-2 text-xs font-semibold transition ${mode === "create" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
          >
            新しいチームを作成
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-lg py-2 text-xs font-semibold transition ${mode === "join" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
          >
            既存のチームに参加
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <Label>チーム名</Label>
            <Input
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder={mode === "create" ? "新しいチーム名（例：〇〇大学サッカー部）" : "参加するチーム名"}
            />
          </div>
          <div>
            <Label>チームパスワード（4〜6桁の数字）</Label>
            <Input
              value={teamPassword}
              onChange={(e) => setTeamPassword(e.target.value)}
              inputMode="numeric"
              placeholder={mode === "create" ? "作成するパスワード" : "教えてもらったパスワード"}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "create"
                ? "作成後にメンバー招待の際に共有します。"
                : "主将・幹部から共有されたパスワードを入力してください。"}
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "処理中..." : mode === "create" ? "チームを作成する" : "チームに参加する"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => signOut()}
          className="mt-4 w-full text-xs text-muted-foreground underline"
        >
          別のアカウントでログインし直す
        </button>
      </div>
    </div>
  );
}
