import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ROLE_OPTIONS, useApp, type RoleId } from "@/lib/app-store";
import logoAsset from "@/assets/clubpilot-logo.png.asset.json";

type Step = "login" | "register" | "profile";

export function AuthScreen() {
  const { setProfile } = useApp();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState<RoleId>("member");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("メールアドレスとパスワードを入力してください");
      return;
    }
    // Mock: route to profile creation so the user lands somewhere usable
    setStep("profile");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) {
      toast.error("メールと6文字以上のパスワードを入力してください");
      return;
    }
    setStep("profile");
  };

  const handleProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !team) {
      toast.error("名前とチーム名を入力してください");
      return;
    }
    setProfile({ email: email || "guest@example.com", name, team, role });
    toast.success(`ようこそ、${name}さん`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-7"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl"
            style={{ background: "var(--gradient-hero)" }}
          >
            <img src={logoAsset.url} alt="" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Club Pilot</h1>
            <p className="text-[11px] text-muted-foreground">チーム全員で使う管理プラットフォーム</p>
          </div>
        </div>

        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <h2 className="text-base font-semibold">ログイン</h2>
            <div>
              <Label className="mb-1 block text-xs">メールアドレス</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">パスワード</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            <Button type="submit" className="w-full">ログイン</Button>
            <div className="pt-2 text-center text-xs text-muted-foreground">
              アカウントをお持ちでない方
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => setStep("register")}>
              新規登録
            </Button>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-3">
            <h2 className="text-base font-semibold">新規登録</h2>
            <div>
              <Label className="mb-1 block text-xs">メールアドレス</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">パスワード（6文字以上）</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            <Button type="submit" className="w-full">登録してプロフィール作成へ</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("login")}>
              ログイン画面に戻る
            </Button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={handleProfile} className="space-y-3">
            <h2 className="text-base font-semibold">プロフィール作成</h2>
            <p className="text-xs text-muted-foreground">
              チーム内で表示される名前と、所属を教えてください。
            </p>
            <div>
              <Label className="mb-1 block text-xs">名前（ユーザー名）</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：田中 翔太" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">所属チーム・団体名</Label>
              <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="例：〇〇大学サッカー部" />
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
                      onClick={() => setRole(r.id)}
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
            <Button type="submit" className="w-full">はじめる</Button>
          </form>
        )}
      </div>
    </div>
  );
}
