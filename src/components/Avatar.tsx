import type { Profile } from "@/lib/app-store";

export function Avatar({
  profile,
  size = 32,
  className = "",
}: {
  profile?: Pick<Profile, "name" | "avatarUrl"> | null;
  size?: number;
  className?: string;
}) {
  const initial = (profile?.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) } as const;
  if (profile?.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.name}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={style}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-secondary-foreground ${className}`}
      aria-label={profile?.name ?? ""}
    >
      {initial}
    </span>
  );
}
