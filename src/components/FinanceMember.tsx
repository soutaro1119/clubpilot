import { useMemo } from "react";
import { Wallet } from "lucide-react";
import { useApp } from "@/lib/app-store";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function isOverdue(due: string) {
  if (!due) return false;
  return new Date(due + "T23:59:59").getTime() < Date.now();
}

export function FinanceMember() {
  const { profile, financeItems, financePayments } = useApp();
  const me = profile!.email;

  const myItems = useMemo(() => {
    return financeItems
      .map((i) => ({ item: i, paid: !!financePayments[i.id]?.[me]?.paid }))
      .sort((a, b) => a.item.dueDate.localeCompare(b.item.dueDate));
  }, [financeItems, financePayments, me]);

  const unpaid = myItems.filter((x) => !x.paid);
  const total = unpaid.reduce((s, x) => s + x.item.amount, 0);

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-border bg-card p-5 text-center"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Wallet className="h-4 w-4" />あなたの現在の未払金合計
        </p>
        <p className={`mt-2 text-4xl font-extrabold ${total > 0 ? "text-rose-400" : "text-emerald-400"}`}>
          {yen(total)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ※ 他のメンバーの金額や支払状況は表示されません
        </p>
      </section>

      <section
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold">未払いの内訳</h2>
        {unpaid.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            未払いはありません 🎉
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {unpaid.map(({ item }) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className={`text-[11px] ${isOverdue(item.dueDate) ? "text-rose-400" : "text-muted-foreground"}`}>
                    期限 {item.dueDate}{isOverdue(item.dueDate) && "（期限超過）"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-400">
                  {yen(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {myItems.some((x) => x.paid) && (
        <section
          className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground">支払済みの履歴</h2>
          <ul className="mt-3 space-y-1 text-xs">
            {myItems.filter((x) => x.paid).map(({ item }) => (
              <li key={item.id} className="flex items-center justify-between rounded-md bg-emerald-500/5 px-3 py-2">
                <span className="font-medium">{item.title}</span>
                <span className="text-emerald-400">支払済み・{yen(item.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
