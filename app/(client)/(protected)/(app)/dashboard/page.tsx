// app/(client)/(protected)/(app)/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RefundDeliveryCard from "./_components/RefundDeliveryCard"
import DashboardHeader from "./_components/DashboardHeader";
import NextStepsCard from "./_components/NextStepsCard";
import AppointmentCard from "./_components/AppointmentCard";
import RefundCard from "./_components/RefundCard";
import InvoicesCard from "./_components/InvoicesCard";
import TimelineCard from "./_components/TimelineCard";
import QuickActionsCard from "./_components/QuickActionsCard";
import SnapshotCard from "./_components/SnapshotCard";
import SupportCard from "./_components/SupportCard";
import MissingInfoCard from "./_components/MissingInfoCard";
import TasksCard from "./_components/TasksCard";
import DocumentsCard from "./_components/DocumentsCard";
import MessagesCard from "./_components/MessagesCard";

import { RETURN_TIMELINE_STAGES } from "@/lib/constants/return-timeline";
import { COMPLETE_PROFILE_FLOW } from "@/lib/constants/complete_profile";

import { apiGet, apiPost, apiPut } from "@/lib/api";
import type {
  ReturnStatus,
  OnboardingStep,
  Task,
  Doc,
  Invoice,
  Message,
  Appointment,
  YearSnapshot,
} from "@/types/dashboard";

import {
  currency,
  fmtDate,
  getTimelineStageIndex,
  formatRefundBalance,
} from "@/lib/utils/dashboard";


type RefundDelivery = {
  method: "direct_deposit" | "check" | "not_set";
  bankLast4?: string | null;
};

function normalizeDeliveryMethod(v: unknown): RefundDelivery["method"] {
  const s = String(v ?? "").toLowerCase();
  if (s === "direct_deposit" || s === "directdeposit" || s === "dd") return "direct_deposit";
  if (s === "check" || s === "paper_check" || s === "papercheck") return "check";
  return "not_set";
}

/* ------------------------- Dashboard Page ------------------------- */
export default function DashboardPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<string>(currentYear.toString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ReturnStatus["status"]>("DRAFT");
  const [refund, setRefund] = useState<{ amount: number | null; eta?: string | null }>({
    amount: null,
  });

  const [refundDelivery, setRefundDelivery] = useState<{
  method: "direct_deposit" | "check" | "not_set";
  bankLast4?: string | null;
}>({ method: "not_set", bankLast4: null });

  // Keep this as your DB onboarding step enum type
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("PROFILE");


  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextAppt, setNextAppt] = useState<Appointment | null>(null);
  const [yearSnapshots, setYearSnapshots] = useState<YearSnapshot[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null!);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const blockingTasks = useMemo(
    () => tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED"),
    [tasks]
  );

  /* --------------------------- Load dashboard --------------------------- */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [t, d, i, m, s, o, a, ys, q] = await Promise.all([
        apiGet<Task[]>(`/api/tasks?year=${year}`, []),
        apiGet<Doc[]>(`/api/documents?year=${year}`, []),
        apiGet<Invoice[]>(`/api/invoices?year=${year}`, []),
        apiGet<Message[]>(`/api/messages?year=${year}`, []),
        apiGet<ReturnStatus>(`/api/return-status?year=${year}`, { status: "DRAFT" }),
        apiGet<{ step: OnboardingStep }>(`/api/onboarding-step`, { step: "PROFILE" }),
        apiGet<Appointment | null>(`/api/appointments/next?year=${year}`, null),
        apiGet<YearSnapshot[]>(`/api/tax-years`, []),
        apiGet<any>(`/api/questionnaire/summary?year=${year}`, {}), 
      ]);

      if (cancelled) return;

      setTasks(t || []);
      setDocs(d || []);
      setInvoices(i || []);
      setMessages(m || []);
      setStatus(s?.status ?? "DRAFT");

      setRefund({
        amount:
          typeof s?.refundAmount === "string"
            ? Number(s.refundAmount)
            : (s?.refundAmount ?? null),
        eta: s?.refundEta ?? null,
      });

       setRefundDelivery({
        method: normalizeDeliveryMethod(q?.refundMethod ?? q?.refundDeliveryMethod),
        bankLast4: q?.bankLast4 ?? q?.ddLast4 ?? null,
      });

      setOnboardingStep(o?.step ?? "PROFILE");
      setNextAppt(a ?? null);
      setYearSnapshots(ys || []);

      setLoading(false);
    };

    load().catch((e) => {
      console.error(e);
      setError("Something went wrong loading your dashboard.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [year]);

  /* ------------------------- Actions: Tasks ------------------------- */
  async function handleMarkDone(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "DONE" } : t)));

    const res = await apiPut(`/api/tasks/${taskId}`, { status: "DONE" });
    if (!res) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "OPEN" } : t)));
    }
  }

  /* ---------------------- Actions: Documents upload --------------------- */
  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const presign = await apiPost<{ uploadUrl: string; fileKey: string }>(
      `/api/documents/presign?year=${year}`,
      {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      }
    );
    if (!presign) return;

    const put = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) return;

    const created = await apiPost<Doc>("/api/documents", {
      displayName: file.name,
      docType: "OTHER",
      taxYear: Number(year),
      key: presign.fileKey,
    });

    if (created) setDocs((prev) => [created, ...prev]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ----------------------- Actions: Send message ----------------------- */
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    const text = messageInputRef.current?.value?.trim();
    if (!text) return;

    const temp: Message = {
      id: `temp-${Date.now()}`,
      sender: "user",
      body: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, temp]);

    const created = await apiPost<Message>("/api/messages", { body: text, year });

    if (!created) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      return;
    }

    setMessages((prev) => prev.map((m) => (m.id === temp.id ? created : m)));

    if (messageInputRef.current) messageInputRef.current.value = "";
  }

  /* ------------------------------ Header ------------------------------ */
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => (currentYear - i).toString()),
    [currentYear]
  );

  /* -------------------- Next Steps (Complete Profile Flow) -------------------- */
  const currentStepIndex = useMemo(() => {
    const idx = COMPLETE_PROFILE_FLOW.findIndex((s) => s.id === onboardingStep);
    return idx === -1 ? 0 : idx;
  }, [onboardingStep]);

  const totalSteps = COMPLETE_PROFILE_FLOW.length;

  const progressPercent = Math.round(((currentStepIndex + 1) / Math.max(1, totalSteps)) * 100);

  // Safe fallback so NextStepsCard always gets a config
  const currentStepConfig =
    COMPLETE_PROFILE_FLOW[currentStepIndex] ??
    COMPLETE_PROFILE_FLOW[0] ?? {
      label: "Continue",
      description: "Continue completing your profile.",
      href: "/questionnaire",
    };

  const isDone = onboardingStep === "DONE";

  /* --------------------- Return timeline derived state --------------------- */
  const statusStageIndex = useMemo(
    () => getTimelineStageIndex(status, RETURN_TIMELINE_STAGES),
    [status]
  );

  const currentStatusStage = RETURN_TIMELINE_STAGES[statusStageIndex];

  const nextStatusStage =
    statusStageIndex < RETURN_TIMELINE_STAGES.length - 1
      ? RETURN_TIMELINE_STAGES[statusStageIndex + 1]
      : null;

  function scrollToMessages() {
    messagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  /* ------------------------------ Render ------------------------------ */
  return (
   <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8 space-y-4 sm:space-y-6">
  {/* Error */}
  {error ? (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </div>
  ) : null}

  {/* Top Bar */}
  <DashboardHeader
    year={Number(year)}
    years={years.map(Number)}
    setYear={(y: number) => setYear(y.toString())}
    status={status}
  />

  {/* Next Steps / Progress */}
  <NextStepsCard
    year={Number(year)}
    progressPercent={progressPercent}
    currentStepIndex={currentStepIndex}
    totalSteps={totalSteps}
    currentStepConfig={currentStepConfig}
    isDone={isDone}
  />

  {/* Appointment + Missing Info (stack on mobile, side-by-side on md+) */}
  <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
    <AppointmentCard year={Number(year)} nextAppt={nextAppt} loading={loading} />
    <MissingInfoCard loading={loading} blockingTasks={blockingTasks} />
  </div>

  {/* Key Cards (handles 5 cards nicely) */}
  <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <RefundCard refund={refund} currency={currency} fmtDate={fmtDate} />

    <RefundDeliveryCard delivery={refundDelivery} updateHref="/questionnaire" />

    <InvoicesCard
      loading={loading}
      invoices={invoices.map((inv) => ({
        ...inv,
        amount: typeof inv.amount === "string" ? Number(inv.amount) : inv.amount,
      }))}
      currency={(amount) => currency(amount)}
    />

    <TimelineCard
      year={Number(year)}
      status={status}
      currentStatusStage={currentStatusStage}
      nextStatusStage={nextStatusStage}
      RETURN_TIMELINE_STAGES={RETURN_TIMELINE_STAGES}
      statusStageIndex={statusStageIndex}
    />

    {/* On xl, make QuickActions span 2 columns so it doesn't look squeezed */}
    <div className="xl:col-span-2">
      <QuickActionsCard
        year={Number(year)}
        fileInputRef={fileInputRef}
        handleUpload={handleUpload}
      />
    </div>
  </div>

  {/* Snapshot */}
  <SnapshotCard
    loading={loading}
    yearSnapshots={yearSnapshots}
    formatRefundBalance={formatRefundBalance}
  />

  {/* Support */}
  <SupportCard year={Number(year)} scrollToMessages={scrollToMessages} />

  {/* Tasks + Documents */}
  <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
    <TasksCard loading={loading} tasks={tasks} handleMarkDone={handleMarkDone} />
    <DocumentsCard loading={loading} docs={docs} year={Number(year)} />
  </div>

  {/* Messages */}
  <div className="grid grid-cols-1 gap-4 sm:gap-6" ref={messagesRef}>
    <MessagesCard
      loading={loading}
      messages={messages}
      handleSendMessage={handleSendMessage}
      messageInputRef={messageInputRef}
    />
  </div>
</div>

  );
}
