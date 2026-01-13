"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import SlotGeneratorCard from "./SlotGeneratorCard";

type View = "requests" | "appointments" | "slots";
type Segment = "upcoming" | "today" | "past" | "cancelled" | "all";

type Props = {
  view: View;
  segment: Segment;
  q: string;

  slots: Array<{
    id: string;
    startsAtIso: string;
    durationMinutes: number;
    status: "open" | "blocked";
  }>;

  requests: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    scheduledAtIso: string;
    createdAtIso: string;
    status: string; // requested/confirmed/cancelled
  }>;

  appts: Array<{
    id: string;
    scheduledAtIso: string;
    durationMinutes: number;
    status: "scheduled" | "completed" | "cancelled" | "no_show";
    notes: string | null;
    cancelledReason: string | null;
    cancelledAtIso: string | null;
    userName: string | null;
    userEmail: string | null;
  }>;
};

const TZ = "America/Los_Angeles";
const dtf = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const fmtPT = (iso: string) => dtf.format(new Date(iso));

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data;
}

function statusBadge(s: string) {
  if (["confirmed", "completed", "open"].includes(s)) return <Badge variant="secondary">{s}</Badge>;
  if (["cancelled", "blocked"].includes(s)) return <Badge variant="outline">{s}</Badge>;
  if (s === "scheduled") return <Badge>{s}</Badge>;
  if (s === "no_show") return <Badge variant="destructive">{s}</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export default function AppointmentAdminClient(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string>("");

  const mkHref = (next: Partial<{ view: View; segment: Segment; q: string }>) => {
    const params = new URLSearchParams();
    const v = next.view ?? p.view;
    params.set("view", v);

    if (v === "appointments") params.set("segment", next.segment ?? p.segment);

    const qq = (next.q ?? p.q).trim();
    if (qq) params.set("q", qq);

    return `/admin/appointments?${params.toString()}`;
  };

  const confirmRequest = (id: string) =>
    start(async () => {
      setErr("");
      try {
        await jsonFetch(`/api/admin/appointment-requests/${id}/confirm`, {
          method: "PATCH",
          body: JSON.stringify({ durationMinutes: 30 }),
        });
        router.refresh();
      } catch (e: any) {
        setErr(e?.message ?? "Failed to confirm");
      }
    });

  const cancelRequest = (id: string) =>
    start(async () => {
      setErr("");
      try {
        await jsonFetch(`/api/admin/appointment-requests/${id}/cancel`, { method: "PATCH" });
        router.refresh();
      } catch (e: any) {
        setErr(e?.message ?? "Failed to cancel request");
      }
    });

  const setAppointmentStatus = (id: string, status: string) =>
    start(async () => {
      setErr("");
      try {
        await jsonFetch(`/api/admin/appointments/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        router.refresh();
      } catch (e: any) {
        setErr(e?.message ?? "Failed to update appointment");
      }
    });

  const toggleSlot = (id: string, status: "open" | "blocked") =>
    start(async () => {
      setErr("");
      try {
        await jsonFetch(`/api/admin/appointment-slots/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        router.refresh();
      } catch (e: any) {
        setErr(e?.message ?? "Failed to update slot");
      }
    });

  const deleteSlot = (id: string) =>
    start(async () => {
      setErr("");
      try {
        await jsonFetch(`/api/admin/appointment-slots/${id}`, { method: "DELETE" });
        router.refresh();
      } catch (e: any) {
        setErr(e?.message ?? "Failed to delete slot");
      }
    });

  const slotStats = useMemo(() => {
    const open = p.slots.filter((s) => s.status === "open").length;
    const blocked = p.slots.filter((s) => s.status === "blocked").length;
    return { open, blocked, total: p.slots.length };
  }, [p.slots]);

  return (
    <Card className="mt-6 rounded-2xl">
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
        <CardDescription>Manage requests, scheduled appointments, and slots (Pacific Time).</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {err ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {err}
          </div>
        ) : null}

        <Tabs value={p.view} onValueChange={(v) => router.push(mkHref({ view: v as View }))}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="slots">Slots</TabsTrigger>
          </TabsList>
        </Tabs>

        {p.view === "appointments" ? (
          <Tabs
            value={p.segment}
            onValueChange={(s) => router.push(mkHref({ view: "appointments", segment: s as Segment }))}
          >
            <TabsList className="rounded-xl">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        <form method="GET" action="/admin/appointments" className="flex gap-2">
          <input type="hidden" name="view" value={p.view} />
          {p.view === "appointments" ? <input type="hidden" name="segment" value={p.segment} /> : null}

          <Input name="q" defaultValue={p.q} placeholder="Search…" className="max-w-md rounded-xl" />
          <Button type="submit" variant="outline" className="rounded-xl">
            Search
          </Button>

          <div className="ml-auto flex items-center text-xs text-muted-foreground">
            {pending ? "Working…" : ""}
          </div>
        </form>

        {p.view === "slots" ? (
          <div className="text-xs text-muted-foreground">
            Slots: <span className="font-medium text-foreground">{slotStats.open}</span> open •{" "}
            <span className="font-medium text-foreground">{slotStats.blocked}</span> blocked •{" "}
            <span className="font-medium text-foreground">{slotStats.total}</span> total
          </div>
        ) : null}

        <Separator />

        {/* ✅ SLOT GENERATOR */}
        {p.view === "slots" ? <SlotGeneratorCard disabled={pending} onCreated={() => router.refresh()} /> : null}

        {/* REQUESTS */}
        {p.view === "requests" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Scheduled (PT)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {p.requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-muted-foreground">
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                p.requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                      {r.phone ? <div className="text-xs text-muted-foreground">{r.phone}</div> : null}
                    </TableCell>

                    <TableCell>{fmtPT(r.scheduledAtIso)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={pending || r.status !== "requested"}
                        onClick={() => confirmRequest(r.id)}
                      >
                        Confirm
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        disabled={pending || r.status !== "requested"}
                        onClick={() => cancelRequest(r.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : null}

        {/* APPOINTMENTS */}
        {p.view === "appointments" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Scheduled (PT)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {p.appts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-muted-foreground">
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                p.appts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.userName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{a.userEmail ?? "—"}</div>
                      {a.notes ? (
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.notes}</div>
                      ) : null}
                      {a.status === "cancelled" && a.cancelledReason ? (
                        <div className="mt-1 text-xs text-red-600">Reason: {a.cancelledReason}</div>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      <div>{fmtPT(a.scheduledAtIso)}</div>
                      <div className="text-xs text-muted-foreground">{a.durationMinutes} mins</div>
                    </TableCell>

                    <TableCell>{statusBadge(a.status)}</TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={pending || a.status === "completed"}
                        onClick={() => setAppointmentStatus(a.id, "completed")}
                      >
                        Complete
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={pending || a.status === "no_show"}
                        onClick={() => setAppointmentStatus(a.id, "no_show")}
                      >
                        No-show
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        disabled={pending || a.status === "cancelled"}
                        onClick={() => setAppointmentStatus(a.id, "cancelled")}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : null}

        {/* SLOTS */}
        {p.view === "slots" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Starts (PT)</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {p.slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-muted-foreground">
                    No slots found. Use the generator above.
                  </TableCell>
                </TableRow>
              ) : (
                p.slots.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{fmtPT(s.startsAtIso)}</TableCell>
                    <TableCell>{s.durationMinutes} mins</TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={pending || s.status === "open"}
                        onClick={() => toggleSlot(s.id, "open")}
                      >
                        Open
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={pending || s.status === "blocked"}
                        onClick={() => toggleSlot(s.id, "blocked")}
                      >
                        Block
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        disabled={pending}
                        onClick={() => deleteSlot(s.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
