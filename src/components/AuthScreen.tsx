import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ROLE_OPTIONS, useApp, setRemember, type RoleId } from "@/lib/app-store";
import logoAsset from "@/assets/clubpilot-logo.png.asset.json";
import { AvatarPicker } from "@/components/AvatarPicker";
import { LegalLinks } from "@/components/LegalLinks";

type Step = "auth" | "profile";
type Mode = "login" | "register";
type TeamMode = "create" | "join";

export function AuthScreen() {
  const { login, registerNewTeam, joinExistingTeam, signInWithGoogle } = useApp();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("auth");
  const [remember, setRememberLocal] = useState(true);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleId>("member");
  const [teamMode, setTeamMode] = useState<TeamMode>("create");
  const [team, setTeam] = useState("");
  const [teamPassword, setTeamPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  const onPickRole = (r: RoleId) => {
    setRole(r);
    const isLeader = !!ROLE_OPTIONS.find((x) => x.id === r)?.leader;
    setTeamMode(isLeader ? "create" : "join");
  };

  const proceedAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemember(remember);
    if (mode === "login") {
      if (!email || !password) return toast.error("メールとパスワードを入力してください");
      setBusy(true);
      const result = await login(email, password);
      setBusy(false);
      if (!result.ok) return toast.error(result.error);
      toast.success("ログインしました");
      return;
    }
    if (!email || password.length < 6) {
      return toast.error("メールと6文字以上のパスワードを入力してください");
    }
    setStep("profile");
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error("名前を入力してください");
    if (!team) return toast.error("チーム名を入力してください");
    if (!/^\d{4,6}$/.test(teamPassword)) return toast.error("チームパスワードは4〜6桁の数字で入力してください");
    const payload = { email, name, role, team, teamPassword, avatarUrl };
    setBusy(true);
    const result =
      teamMode === "create"
        ? await registerNewTeam(payload, password)
        : await joinExistingTeam(payload, password);
    setBusy(false);
    if (!result.ok) return toast.error(result.error);
    toast.success(`ようこそ、${name}さん`);
  };

  const google = async () => {
    setBusy(true);
    try { await signInWithGoogle(); }
    catch (e: any) { toast.error(e?.message ?? "Googleログインに失敗しました"); }
    finally { setBusy(false); }
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
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div>
                <Label className="mb-1 block text-xs">パスワード{mode === "register" && "（4文字以上）"}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-muted-foreground">
                <Checkbox checked={remember} onCheckedChange={(v) => setRememberLocal(!!v)} />
                ログイン状態を保持する
              </label>
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "login" ? "ログイン" : "次へ：プロフィール作成"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />または<span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.6 14.7 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12S6.8 21.4 12 21.4c6.9 0 9.5-4.9 9.5-8.4 0-.6-.1-1-.1-1.4H12z"/>
              </svg>
              Googleで続行
            </Button>
          </>
        )}

        {step === "profile" && (
          <form onSubmit={submitProfile} className="space-y-3">
            <h2 className="text-base font-semibold">プロフィール作成</h2>
            <p className="text-xs text-muted-foreground">
              チーム内で表示される名前と、所属チームを教えてください。
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
              <AvatarPicker
                profile={{ name: name || "?", avatarUrl }}
                size={64}
                onChange={(url) => setAvatarUrl(url)}
              />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">アイコン写真（任意）</p>
                <p>タップで写真ライブラリから選択</p>
              </div>
            </div>
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

            <Button type="submit" className="w-full" disabled={busy}>はじめる</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("auth")}>
              戻る
            </Button>
          </form>
        )}

        <LegalLinks className="mt-5 pt-4 border-t border-border" />
      </div>
    </div>
  );
}
