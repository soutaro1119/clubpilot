import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ROLE_OPTIONS, useApp, setRemember, type RoleId } from "@/lib/app-store";
import logoAsset from "@/assets/clubpilot-logo.png.asset.json";
import { AvatarPicker } from "@/components/AvatarPicker";

type Step = "auth" | "profile";
type Mode = "login" | "register";
type TeamMode = "create" | "join";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.9L6.1 33C9.4 39.7 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.3C41.6 35.6 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.41 2.21-1.22 3.06-.85.9-1.97 1.42-3.04 1.34-.13-1.1.42-2.25 1.18-3.07.81-.86 2.04-1.46 3.08-1.49zm3.49 17.06c-.62 1.36-1.4 2.7-2.62 2.72-1.18.03-1.6-.69-3.13-.69-1.55 0-2 .67-3.14.72-1.2.04-2.11-1.46-2.74-2.81-1.3-2.74-2.31-7.78.97-11.18.93-.99 2.5-1.62 4.05-1.65 1.15-.03 2.24.78 2.95.78.7 0 2.02-.96 3.41-.82.58.02 2.22.24 3.28 1.81-.08.05-1.96 1.15-1.94 3.44.02 2.74 2.4 3.65 2.43 3.66-.03.07-.38 1.31-1.24 2.62z"/>
    </svg>
  );
}

export function AuthScreen() {
  const { registerNewTeam, joinExistingTeam } = useApp();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("auth");
  const [remember, setRememberLocal] = useState(true);

  // auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // profile fields
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleId>("member");
  const [teamMode, setTeamMode] = useState<TeamMode>("create");
  const [team, setTeam] = useState("");
  const [teamPassword, setTeamPassword] = useState("");

  // a leader role implies they create a team; a member role implies they join one
  const onPickRole = (r: RoleId) => {
    setRole(r);
    const isLeader = !!ROLE_OPTIONS.find((x) => x.id === r)?.leader;
    setTeamMode(isLeader ? "create" : "join");
  };

  const proceedAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      if (!email || !password) return toast.error("メールとパスワードを入力してください");
    } else {
      if (!email || password.length < 6) return toast.error("メールと6文字以上のパスワードを入力してください");
    }
    setRemember(remember);
    setStep("profile");
  };

  const social = (provider: "google" | "apple") => {
    setRemember(remember);
    setEmail(`${provider}-user@${provider}.com`);
    toast.success(`${provider === "google" ? "Google" : "Apple"} アカウントで認証しました`);
    setStep("profile");
  };

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error("名前を入力してください");
    if (!team) return toast.error("チーム名を入力してください");
    if (!teamPassword) return toast.error("チームパスワードを入力してください");
    const payload = { email: email || "guest@example.com", name, role, team, teamPassword };
    const result =
      teamMode === "create" ? registerNewTeam(payload) : joinExistingTeam(payload);
    if (!result.ok) return toast.error(result.error);
    toast.success(`ようこそ、${name}さん`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-7"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="mb-5 flex items-center gap-3">
          <img
            src={logoAsset.url}
            alt="Club Pilot"
            className="h-11 w-11 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Club Pilot</h1>
            <p className="text-[11px] text-muted-foreground">チーム全員で使う管理プラットフォーム</p>
          </div>
        </div>

        {step === "auth" && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
              <button
                onClick={() => setMode("login")}
                className={`rounded-lg py-2 text-xs font-semibold transition ${mode === "login" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
              >ログイン</button>
              <button
                onClick={() => setMode("register")}
                className={`rounded-lg py-2 text-xs font-semibold transition ${mode === "register" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
              >新規登録</button>
            </div>

            <form onSubmit={proceedAuth} className="space-y-3">
              <div>
                <Label className="mb-1 block text-xs">メールアドレス</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <Label className="mb-1 block text-xs">パスワード{mode === "register" && "（6文字以上）"}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
              </div>
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-muted-foreground">
                <Checkbox checked={remember} onCheckedChange={(v) => setRememberLocal(!!v)} />
                ログイン状態を保持する
              </label>
              <Button type="submit" className="w-full">
                {mode === "login" ? "ログイン" : "次へ：プロフィール作成"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> または <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button type="button" variant="outline" onClick={() => social("google")}>
                <GoogleLogo /> Googleアカウントで{mode === "login" ? "ログイン" : "登録"}
              </Button>
              <Button
                type="button"
                onClick={() => social("apple")}
                className="bg-black text-white hover:bg-black/90"
              >
                <AppleLogo /> Appleアカウントで{mode === "login" ? "ログイン" : "登録"}
              </Button>
            </div>
          </>
        )}

        {step === "profile" && (
          <form onSubmit={submitProfile} className="space-y-3">
            <h2 className="text-base font-semibold">プロフィール作成</h2>
            <p className="text-xs text-muted-foreground">
              チーム内で表示される名前と、所属チームを教えてください。
            </p>
            <div>
              <Label className="mb-1 block text-xs">名前（ユーザー名）</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：田中 翔太" />
            </div>
            <div>
              <Label className="mb-2 block text-xs">あなたの立場</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ROLE_OPTIONS.map((r) => {
                  const selected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onPickRole(r.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                        selected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="block">{r.label}</span>
                      <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                        {r.leader ? "幹部モードへ" : "一般部員モードへ"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-xs">チーム</Label>
              <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => setTeamMode("create")}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${teamMode === "create" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
                >新しくチームを作る</button>
                <button
                  type="button"
                  onClick={() => setTeamMode("join")}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${teamMode === "join" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
                >既存のチームに参加</button>
              </div>
              <div className="space-y-2">
                <Input
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder={teamMode === "create" ? "新しいチーム名（例：〇〇大学サッカー部）" : "参加するチーム名"}
                />
                <Input
                  value={teamPassword}
                  onChange={(e) => setTeamPassword(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder={teamMode === "create" ? "チームパスワード（4〜6桁の数字）" : "教えてもらったチームパスワード"}
                />
                <p className="text-[11px] text-muted-foreground">
                  {teamMode === "create"
                    ? "あなたが管理者です。後でマイページからチーム名・パスワードをコピーして部員に共有できます。"
                    : "幹部から教えてもらったチーム名とパスワードでログインします。"}
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full">はじめる</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("auth")}>
              戻る
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
