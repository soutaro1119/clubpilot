import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, LogOut, Share2, Users, Trash2, ShieldOff, Save } from "lucide-react";
import { toast } from "sonner";
import { useApp, roleLabel, POSITION_OPTIONS } from "@/lib/app-store";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Avatar } from "@/components/Avatar";
import { LegalLinks } from "@/components/LegalLinks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function MyPage() {
  const {
    profile, signOut, isLeader, members, updateProfile, categories,
    blockedEmails, unblockUser, deleteAccount,
  } = useApp();
  const [copied, setCopied] = useState<string | null>(null);
  const [name, setName] = useState(profile?.name ?? "");
  const [position, setPosition] = useState<string>(profile?.position ?? "");
  const [category, setCategory] = useState<string>(profile?.category ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? "");
    setPosition(profile?.position ?? "");
    setCategory(profile?.category ?? "");
  }, [profile?.id, profile?.name, profile?.position, profile?.category]);

  if (!profile) return null;

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim() || profile.name,
        position: position || undefined,
        category: category || undefined,
      });
      toast.success("プロフィールを更新しました");
    } catch (e: any) {
      toast.error(e?.message ?? "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("コピーしました");
    setTimeout(() => setCopied(null), 1500);
  };

  const shareText = profile.teamPassword
    ? `Club Pilot にチーム合流のお願いです🙌\nチーム名：${profile.team}\nチームパスワード：${profile.teamPassword}\n\nアプリで「既存のチームに参加」を選んで上記を入力してください。\n\nアプリを開く：https://clubpilot.lovable.app`
    : `Club Pilot にチーム合流のお願いです🙌\nチーム名：${profile.team}\n\n※チームパスワードは幹部（作成者）にご確認ください。\n\nアプリを開く：https://clubpilot.lovable.app`;
  const shareViaLine = async () => {
    await navigator.clipboard.writeText(shareText);
    toast.success("文章をコピー＆LINEを開きます");
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="text-sm font-semibold">プロフィール</h2>
        <div className="mt-3 flex items-center gap-3">
          <AvatarPicker
            profile={profile}
            size={64}
            onChange={(url) => updateProfile({ avatarUrl: url })}
          />
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel(profile.role)}{isLeader ? "（幹部）" : "（部員）"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">名前</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="氏名" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">ポジション</label>
              <Select value={position || "__none"} onValueChange={(v) => setPosition(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">未設定</SelectItem>
                  {POSITION_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">所属カテゴリー</label>
              <Select value={category || "__none"} onValueChange={(v) => setCategory(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">未設定</SelectItem>
                  {categories.filter((c) => c.id !== "all").map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            所属カテゴリーを設定すると、幹部が「このカテゴリー宛」に配信した予定・お知らせだけが自分のホームに表示されます。「全員宛」の配信は常に表示されます。
          </p>
          <Button className="w-full" onClick={saveProfile} disabled={saving}>
            <Save className="h-4 w-4" />{saving ? "保存中..." : "プロフィールを保存"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="text-sm font-semibold">チーム情報</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          このチーム名とパスワードを部員に共有すると、同じチームに参加できます。
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">チーム名</label>
            <div className="flex gap-2">
              <Input readOnly value={profile.team} />
              <Button variant="outline" size="icon" onClick={() => copy("team", profile.team)} aria-label="チーム名をコピー">
                {copied === "team" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {profile.teamPassword ? (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">チームパスワード</label>
              <div className="flex gap-2">
                <Input readOnly value={profile.teamPassword} />
                <Button variant="outline" size="icon" onClick={() => copy("pwd", profile.teamPassword)} aria-label="パスワードをコピー">
                  {copied === "pwd" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-secondary/40 p-2 text-[11px] text-muted-foreground">
              チームパスワードはこの端末にのみ表示されます。他の端末からログインした場合は、作成した幹部の端末でご確認ください。
            </p>
          )}
          <Button onClick={shareViaLine} className="w-full bg-[#06C755] text-white hover:bg-[#05b34c]">
            <Share2 className="h-4 w-4" />チーム情報をLINEで共有
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4" />登録部員（{members.length}名）
        </h2>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {members.map((m) => (
            <li key={m.email} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar profile={m} size={28} />
                <span className="truncate">{m.name}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{roleLabel(m.role)}</span>
            </li>
          ))}
          {members.length === 0 && (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">まだ登録部員がいません</li>
          )}
        </ul>
      </section>

      {blockedEmails.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldOff className="h-4 w-4" />ブロック中のユーザー
          </h2>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {blockedEmails.map((em) => {
              const m = members.find((x) => x.email.trim().toLowerCase() === em);
              return (
                <li key={em} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="truncate">{m?.name ?? em}</span>
                  <Button size="sm" variant="outline" onClick={() => { unblockUser(em); toast.success("解除しました"); }}>
                    解除
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={signOut}>
          <LogOut className="h-4 w-4" />ログアウト
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500">
              <Trash2 className="h-4 w-4" />アカウント削除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>本当にアカウントを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。プロフィールおよびログイン情報が完全に削除され、自動的にサインイン画面に戻ります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 text-white hover:bg-rose-700"
                onClick={() => {
                  deleteAccount();
                  toast.success("アカウントを削除しました");
                }}
              >
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <LegalLinks className="pt-1" />
    </div>
  );
}
