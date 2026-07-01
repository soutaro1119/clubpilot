import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const TERMS = `Club Pilot 利用規約

第1条（適用）
本規約は、Club Pilot（以下「本サービス」）の提供条件および利用者と運営者との間の権利義務関係を定めるものです。利用者は本規約に同意のうえ、本サービスを利用するものとします。

第2条（アカウント）
利用者は正確な情報でアカウントを登録し、自らの責任で管理するものとします。第三者による不正利用について運営者は責任を負いません。

第3条（禁止事項）
・法令または公序良俗に違反する行為
・他の利用者への嫌がらせ、誹謗中傷、脅迫、なりすまし
・虚偽の情報の投稿、スパム、宣伝目的の投稿
・本サービスの運営を妨げる行為
違反した投稿・アカウントは、運営者または管理者（主将等）の判断により削除・停止される場合があります。

第4条（ユーザー投稿物）
利用者が投稿したお知らせ・コメント等については、利用者本人が責任を負います。運営者は各投稿の内容について保証しません。

第5条（免責）
本サービスは現状有姿で提供され、運営者はその完全性・正確性・特定目的への適合性を保証しません。本サービスの利用に起因する損害について、運営者は一切責任を負いません。

第6条（規約の変更）
運営者は必要に応じて本規約を変更できるものとします。変更後の規約はアプリ内に掲示された時点から効力を生じます。

（本文はサンプル文言です）`;

const PRIVACY = `Club Pilot プライバシーポリシー

1. 取得する情報
本サービスは、アカウント登録に必要な氏名・メールアドレス・チーム情報、およびアプリ内で利用者が入力した予定・出欠・お知らせ等の情報を取得します。

2. 利用目的
取得した情報は、本サービスの提供、利用者間のチーム内共有、および不正利用防止・お問合せ対応の目的にのみ利用します。

3. 第三者提供
法令に基づく場合を除き、本人の同意なく第三者に個人情報を提供することはありません。

4. 通報・モデレーション
本サービスでは、不適切な投稿を通報・ブロックする機能を提供します。通報された内容は、安全なチーム運営のために管理者（主将等）が確認する場合があります。

5. データの削除
利用者はいつでも「アカウント削除」ボタンからアカウントおよび関連プロフィールデータを削除できます。削除後の復元はできません。

6. お問い合わせ
プライバシーに関するお問い合わせは、アプリ内サポートまでご連絡ください。

（本文はサンプル文言です）`;

export function LegalLinks({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState<null | "terms" | "privacy">(null);
  return (
    <>
      <div
        className={`flex items-center justify-center gap-3 text-[11px] text-muted-foreground ${className}`}
      >
        <button
          type="button"
          onClick={() => setOpen("terms")}
          className="underline-offset-2 hover:underline"
        >
          利用規約
        </button>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={() => setOpen("privacy")}
          className="underline-offset-2 hover:underline"
        >
          プライバシーポリシー
        </button>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {open === "terms" ? "利用規約" : "プライバシーポリシー"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Club Pilot の{open === "terms" ? "利用規約" : "プライバシーポリシー"}
            </DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-relaxed text-foreground">
            {open === "terms" ? TERMS : PRIVACY}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
