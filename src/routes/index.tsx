import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/lib/app-store";
import { AuthScreen } from "@/components/AuthScreen";
import { AppHeader } from "@/components/AppHeader";
import { LeaderDashboard } from "@/components/LeaderDashboard";
import { MemberDashboard } from "@/components/MemberDashboard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AttendanceSummary } from "@/components/AttendanceSummary";
import { MyPage } from "@/components/MyPage";
import { FinanceLeader } from "@/components/FinanceLeader";
import { FinanceMember } from "@/components/FinanceMember";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Club Pilot｜大学の部活・サークル・体育会のチーム管理プラットフォーム" },
      {
        name: "description",
        content:
          "大学の部活・サークル・スポーツチームのための管理プラットフォーム。カレンダー、出欠管理、起床確認、LINE連絡文の自動生成までスマホで完結。",
      },
      { property: "og:title", content: "Club Pilot｜チーム管理プラットフォーム" },
      {
        property: "og:description",
        content: "カレンダー・出欠・起床確認・LINE連絡まで一つで完結する大学チーム向けアプリ。",
      },
      { property: "og:url", content: "https://clubpilot.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://clubpilot.lovable.app/" }],
  }),
  component: () => (
    <AppProvider>
      <AppShell />
    </AppProvider>
  ),
});

function AppShell() {
  return (
    <div className="min-h-screen bg-background pb-12">
      <Toaster position="top-center" />
      <Gate />
    </div>
  );
}

function Gate() {
  const { profile, isLeader } = useApp();
  if (!profile) return <AuthScreen />;
  return isLeader ? <Leader /> : <Member />;
}

function Leader() {
  const [tab, setTab] = useState("home");
  const tabs = [
    { id: "home", label: "ホーム" },
    { id: "attendance", label: "出欠・起床" },
    { id: "settings", label: "設定" },
    { id: "mypage", label: "マイページ" },
  ];
  return (
    <>
      <AppHeader tabs={tabs} active={tab} onChange={setTab} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-5">
        {tab === "home" && <LeaderDashboard />}
        {tab === "attendance" && <AttendanceSummary />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "mypage" && <MyPage />}
      </main>
    </>
  );
}

function Member() {
  const [tab, setTab] = useState("home");
  const tabs = [
    { id: "home", label: "ホーム" },
    { id: "mypage", label: "マイページ" },
  ];
  return (
    <>
      <AppHeader tabs={tabs} active={tab} onChange={setTab} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-5">
        {tab === "home" && <MemberDashboard />}
        {tab === "mypage" && <MyPage />}
      </main>
    </>
  );
}
