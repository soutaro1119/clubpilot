
# クラウド移行プラン：localStorage → Supabase（リアルタイム同期）

既存データは破棄しクリーンスタート。認証はSupabase（メール＋Google）に一本化。全チームデータをSupabase＋Realtimeで共有します。

## 1. マイグレーション（テーブル追加）

すべて `team_id` でスコープ、RLSは「同一チームのメンバーのみ閲覧・幹部のみ書込」型を基本にします。

- **teams** — `name`（UNIQUE）, `password_hash`
- **profiles** — `id`（=auth.uid）, `team_id`, `name`, `role`, `avatar_url`
- **events** — `team_id`, `title`, `event_type`, `categories[]`, `opponent`, `date`, `times`, `location`, `items`, `notes`, `rain_cancel`, `attendance_deadline`
- **attendance** — `event_id`, `user_id`, `status`, `reason`
- **wakeups** — `date`, `user_id`, `team_id`
- **announcements** — `team_id`, `text`, `when`, `author_id`
- **finance_items** — `team_id`, `title`, `amount`, `due_date`
- **finance_payments** — `item_id`, `user_id`, `paid`, `paid_at`
- **categories** / **event_types** — `team_id`, `label`, `sort_order`
- 既存の `reports` / `blocked_users` / `muted_posts` はそのまま利用

RLSポリシー：`profiles.team_id = auth 現在ユーザーの team_id` を判定するSECURITY DEFINER関数 `get_my_team_id()` と `is_team_leader()` を作成し、無限再帰を回避。全テーブルにGRANT付与。

Realtime有効化：`events`, `attendance`, `wakeups`, `announcements`, `finance_items`, `finance_payments`, `categories`, `event_types`, `profiles`。

## 2. 認証の切替

- **`AuthScreen.tsx`** をSupabase Authに書き換え：
  - メール＋パスワードのサインアップ／ログイン
  - Googleログイン（`lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`）
  - 初回サインアップ後にプロフィール作成（name / role / avatar）＋チーム作成/参加
- **チーム参加**：チーム名＋4-6桁パスワードで既存チームの `password_hash` と照合するRPC `join_team(name, password)` を作成。
- `supabase.auth.onAuthStateChange` を `__root.tsx` に配線。
- `supabase--configure_social_auth` でGoogle有効化、メールも維持。

## 3. データ層の書き換え

`src/lib/app-store.tsx` を全面書き換え：

- localStorage永続化を廃止。各スライスを **Supabaseクエリ + Realtime購読** に差替え。
- API形状（`events`, `setEvents`, `attendance`, `setAttendance`, `addAnnouncement`…）は極力維持し、呼び出し側（コンポーネント）の修正を最小化。
- 各テーブルにつき `useEffect` で初回fetch + `supabase.channel(...).on('postgres_changes', ...)` を張る。

## 4. コンポーネント側の微修正

- Attendance / Wakeup / Announcements / Finance / Settings / MyPage：`userKey` を email から `user.id`(UUID) に変更。ロジックはほぼ据え置き。
- 削除アカウント：`supabase.auth.admin` は使えないので、サーバー関数 `deleteAccount()` を `createServerFn`（`requireSupabaseAuth`）で用意し、profileと関連行を削除。

## 5. クリーンアップ

- `cp.*` のlocalStorage永続化コードを削除（アバターDataURLはSupabase Storageの`avatars`バケットへ移行）。
- Storageバケット `avatars`（public read, owner write）を作成。

## 影響範囲

書き換え対象ファイル（概算）：
- 追加：DB migration 1本、`src/integrations/supabase/functions/*.ts`、`src/lib/team.functions.ts`
- 大幅改修：`src/lib/app-store.tsx`, `src/components/AuthScreen.tsx`, `src/routes/__root.tsx`
- 軽微修正：Attendance/Wakeup/Announcements/Finance/MyPage/Settings（キーをUUIDに）

## 注意

- 既存のlocalStorage内アカウント/データは失われます（クリーンスタート合意済み）。
- 移行後は初回ログイン時に全ユーザーが再登録＋チーム再作成/参加が必要です。
- 作業量が大きいため、承認後に **(A) マイグレーション → (B) app-store書き換え → (C) UI微修正** の3段階でコミットします。
