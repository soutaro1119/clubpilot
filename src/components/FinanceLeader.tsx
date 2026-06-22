import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wallet, Trash2, Check, CircleDollarSign } from "lucide-react";
import { useApp, roleLabel, type Profile } from "@/lib/app-store";
import { Avatar } from "@/components/Avatar";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function isOverdue(due: string) {
  if (!due) return false;
  const d = new Date(due + "T23:59:59");
  return d.getTime() < Date.now();
}

export function FinanceLeader() {
  const { members, financeItems, financePayments, addFinanceChargeForAll, setPaid, deleteFinanceItem } = useApp();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [openMember, setOpenMember] = useState<Profile | null>(null);

  const unpaidByMember = useMemo(() => {
    const map: Record<string, { total: number; items: { item: typeof financeItems[number]; }[] }> = {};
    for (const m of members) map[m.email] = { total: 0, items: [] };
    for (const item of financeItems) {
      const row = financePayments[item.id] ?? {};
      for (const m of members) {
        const p = row[m.email];
        if (!p?.paid) {
          map[m.email].total += item.amount;
          map[m.email].items.push({ item });
        }
      }
    }
    return map;
  }, [members, financeItems, financePayments]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!title.trim()) return toast.error("項目名を入力してください");
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("金額は1円以上で入力してください");
    if (!dueDate) return toast.error("支払期限を選択してください");
    addFinanceChargeForAll({ title, amount: amt, dueDate });
    toast.success(`全員（${members.length}名）に「${title}」¥${amt.toLocaleString()}を一括請求しました`);
    setTitle(""); setAmount(""); setDueDate("");
  };

  const memberRow = openMember ? unpaidByMember[openMember.email] : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CircleDollarSign className="h-4 w-4" />全員一律で請求する
        </h2>
        <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">項目名</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：合宿費" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">金額（円）</Label>
            <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="15000" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">支払期限</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" className="w-full">全員に一括で請求を追加</Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="h-4 w-4" />部員ごとの未払金
        </h2>
        {members.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            まだ登録部員がいません
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {members.map((m) => {
              const u = unpaidByMember[m.email];
              const total = u?.total ?? 0;
              return (
                <li key={m.email}>
                  <button
                    type="button"
                    onClick={() => setOpenMember(m)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-secondary/40 ${
                      total > 0 ? "" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar profile={m} size={32} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">{roleLabel(m.role)}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                      total > 0 ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                    }`}>
                      {total > 0 ? `未払 ${yen(total)}` : "完納"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {financeItems.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-sm font-semibold">登録済みの請求項目</h2>
          <ul className="mt-3 space-y-2">
            {financeItems.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {yen(i.amount)}・期限 {i.dueDate}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteFinanceItem(i.id)} aria-label="削除">
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={!!openMember} onOpenChange={(o) => !o && setOpenMember(null)}>
        <DialogContent className="max-w-md">
          {openMember && memberRow && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Avatar profile={openMember} size={32} />
                  {openMember.name} の支払い状況
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm">
                未払合計：<span className="text-lg font-extrabold text-rose-400">{yen(memberRow.total)}</span>
              </p>
              {memberRow.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  未払いはありません 🎉
                </p>
              ) : (
                <ul className="space-y-2">
                  {memberRow.items.map(({ item }) => (
                    <li key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className={`text-[11px] ${isOverdue(item.dueDate) ? "text-rose-400" : "text-muted-foreground"}`}>
                          {yen(item.amount)}・期限 {item.dueDate}{isOverdue(item.dueDate) && "（期限超過）"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setPaid(item.id, openMember.email, true)}>
                        <Check className="h-4 w-4" />支払済みにする
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {/* Show already-paid items toggle */}
              <PaidHistory userEmail={openMember.email} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaidHistory({ userEmail }: { userEmail: string }) {
  const { financeItems, financePayments, setPaid } = useApp();
  const paid = financeItems.filter((i) => financePayments[i.id]?.[userEmail]?.paid);
  if (paid.length === 0) return null;
  return (
    <details className="mt-2 rounded-lg border border-border p-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground">支払済みの履歴（{paid.length}件）</summary>
      <ul className="mt-2 space-y-1">
        {paid.map((i) => (
          <li key={i.id} className="flex items-center justify-between">
            <span>{i.title}・¥{i.amount.toLocaleString()}</span>
            <button className="text-rose-400" onClick={() => setPaid(i.id, userEmail, false)}>未払いに戻す</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
