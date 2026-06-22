import logoAsset from "@/assets/clubpilot-logo.png.asset.json";
import { useApp, roleLabel } from "@/lib/app-store";
import { Avatar } from "@/components/Avatar";

type Tab = { id: string; label: string };

export function AppHeader({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  const { profile, isLeader } = useApp();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <img
          src={logoAsset.url}
          alt="Club Pilot"
          className="h-9 w-9 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold tracking-tight">Club Pilot</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            {profile ? `${profile.team}・${roleLabel(profile.role)}${isLeader ? "（幹部）" : "（部員）"}` : ""}
          </p>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-semibold sm:inline">{profile.name}</span>
            <Avatar profile={profile} size={32} />
          </div>
        )}
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
