import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Copy,
  Check,
  Megaphone,
  ClipboardCheck,
  Shield,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Club Pilot — Team Communication Made Simple" },
      {
        name: "description",
        content:
          "Generate professional team announcements, attendance requests and staff briefings in seconds.",
      },
      { property: "og:title", content: "Club Pilot" },
      {
        property: "og:description",
        content:
          "Generate professional team announcements, attendance requests and staff briefings in seconds.",
      },
    ],
  }),
  component: Index,
});

type FormState = {
  eventType: string;
  teamCategory: string;
  opponent: string;
  date: string;
  meetingTime: string;
  warmupTime: string;
  startTime: string;
  location: string;
  items: string;
  attendanceDeadline: string;
  notes: string;
};

const initialState: FormState = {
  eventType: "League Match",
  teamCategory: "",
  opponent: "",
  date: "",
  meetingTime: "",
  warmupTime: "",
  startTime: "",
  location: "",
  items: "",
  attendanceDeadline: "",
  notes: "",
};

function formatDate(d: string) {
  if (!d) return "TBC";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatDateTime(d: string) {
  if (!d) return "TBC";
  try {
    return new Date(d).toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function buildAnnouncement(f: FormState) {
  return `📣 ${f.eventType.toUpperCase()} — ${f.teamCategory || "Team"}

We're up against ${f.opponent || "TBC"} on ${formatDate(f.date)}.

🕒 Meet: ${f.meetingTime || "TBC"}
🏃 Warm-up: ${f.warmupTime || "TBC"}
🏁 Kick-off: ${f.startTime || "TBC"}
📍 Venue: ${f.location || "TBC"}

🎒 Bring: ${f.items || "Standard kit"}

${f.notes ? `📝 ${f.notes}\n\n` : ""}Let's go ${f.teamCategory || "team"}! 💪`;
}

function buildAttendance(f: FormState) {
  return `✅ ATTENDANCE — ${f.teamCategory || "Team"} vs ${f.opponent || "TBC"}

Please confirm your availability for ${f.eventType.toLowerCase()} on ${formatDate(f.date)}.

🕒 Meet at ${f.meetingTime || "TBC"} • 📍 ${f.location || "TBC"}

Reply ✅ YES or ❌ NO by ${formatDateTime(f.attendanceDeadline)}.

Thanks — please reply promptly so we can finalise the squad.`;
}

function buildStaff(f: FormState) {
  return `🛡️ STAFF BRIEFING — ${f.teamCategory || "Team"} vs ${f.opponent || "TBC"}

Event: ${f.eventType}
Date: ${formatDate(f.date)}
Venue: ${f.location || "TBC"}

Schedule
• Squad meet: ${f.meetingTime || "TBC"}
• Warm-up: ${f.warmupTime || "TBC"}
• Start: ${f.startTime || "TBC"}

Logistics
• Player kit: ${f.items || "Standard"}
• Attendance deadline: ${formatDateTime(f.attendanceDeadline)}

${f.notes ? `Notes\n${f.notes}\n\n` : ""}Please be on site 15 minutes before squad meet. Confirm receipt in the staff group.`;
}

function Index() {
  const [form, setForm] = useState<FormState>(initialState);
  const [copied, setCopied] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const messages = useMemo(
    () => ({
      announcement: buildAnnouncement(form),
      attendance: buildAttendance(form),
      staff: buildStaff(form),
    }),
    [form],
  );

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                Club Pilot
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Team communication, sorted.
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground sm:inline">
            For Captains, VCs, Managers & Presidents
          </span>
        </div>
      </header>

      {/* Hero */}
      <section
        className="border-b border-border"
        style={{ background: "var(--gradient-subtle)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Fill the match details once.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              Send three pro messages
            </span>{" "}
            in seconds.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Announcements for the squad, attendance requests for players, and
            briefings for staff — generated automatically.
          </p>
        </div>
      </section>

      {/* Main grid */}
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-5">
        {/* Form */}
        <section
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 lg:col-span-3"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Event details</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Event type">
              <Select value={form.eventType} onValueChange={(v) => set("eventType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "League Match",
                    "Cup Match",
                    "Friendly",
                    "Training",
                    "Tournament",
                    "Team Event",
                  ].map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Team category">
              <Input
                placeholder="e.g. U16 Boys, 1st XI"
                value={form.teamCategory}
                onChange={(e) => set("teamCategory", e.target.value)}
              />
            </Field>

            <Field label="Opponent" className="sm:col-span-2">
              <Input
                placeholder="e.g. Riverside FC"
                value={form.opponent}
                onChange={(e) => set("opponent", e.target.value)}
              />
            </Field>

            <Field label="Date" icon={<CalendarDays className="h-4 w-4" />}>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>

            <Field label="Location" icon={<MapPin className="h-4 w-4" />}>
              <Input
                placeholder="e.g. Home Ground, Pitch 2"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>

            <Field label="Meeting time" icon={<Clock className="h-4 w-4" />}>
              <Input
                type="time"
                value={form.meetingTime}
                onChange={(e) => set("meetingTime", e.target.value)}
              />
            </Field>

            <Field label="Warm-up time" icon={<Clock className="h-4 w-4" />}>
              <Input
                type="time"
                value={form.warmupTime}
                onChange={(e) => set("warmupTime", e.target.value)}
              />
            </Field>

            <Field label="Start time" icon={<Clock className="h-4 w-4" />}>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </Field>

            <Field label="Attendance deadline">
              <Input
                type="datetime-local"
                value={form.attendanceDeadline}
                onChange={(e) => set("attendanceDeadline", e.target.value)}
              />
            </Field>

            <Field label="Items to bring" className="sm:col-span-2">
              <Input
                placeholder="e.g. Full kit, water bottle, shin pads"
                value={form.items}
                onChange={(e) => set("items", e.target.value)}
              />
            </Field>

            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                rows={3}
                placeholder="Anything else the team should know"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setForm(initialState)}>
              Reset
            </Button>
          </div>
        </section>

        {/* Output */}
        <section className="lg:col-span-2">
          <div
            className="sticky top-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <h3 className="mb-4 text-base font-semibold">Generated messages</h3>
            <Tabs defaultValue="announcement">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="announcement" className="gap-1.5">
                  <Megaphone className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Team</span>
                </TabsTrigger>
                <TabsTrigger value="attendance" className="gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Attendance</span>
                </TabsTrigger>
                <TabsTrigger value="staff" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Staff</span>
                </TabsTrigger>
              </TabsList>

              {(
                [
                  ["announcement", "Team announcement", messages.announcement],
                  ["attendance", "Attendance request", messages.attendance],
                  ["staff", "Staff briefing", messages.staff],
                ] as const
              ).map(([key, title, text]) => (
                <TabsContent key={key} value={key} className="mt-4">
                  <div className="rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {title}
                    </p>
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                      {text}
                    </pre>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => copy(key, text)}
                  >
                    {copied === key ? (
                      <>
                        <Check className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy message
                      </>
                    )}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Club Pilot
        </p>
      </footer>
    </div>
  );
}

function Field({
  label,
  children,
  icon,
  className,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
