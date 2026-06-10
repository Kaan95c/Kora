import Link from "next/link";
import {
  Wallet,
  CheckCircle2,
  CalendarDays,
  FileText,
  ArrowRight,
  Clock,
} from "lucide-react";

import { PortalShell } from "@/components/client/PortalShell";
import { InvalidLink } from "@/components/client/InvalidLink";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TYPE_CONFIG, STATUS_CONFIG } from "@/lib/documents";
import {
  getPortalData,
  euros,
  portalDate,
  portalDateTime,
  clientPortalPath,
} from "@/lib/client-portal";

export const dynamic = "force-dynamic";

export default async function PortalOverviewPage({
  params,
}: {
  params: { token: string };
}) {
  const data = await getPortalData(params.token);
  if (!data) return <InvalidLink />;

  const { contact, company, documents, appointments, totals } = data;
  const accent = company.primaryColor;
  const now = Date.now();

  const upcoming = appointments.filter((a) => new Date(a.startAt).getTime() >= now);
  const nextAppt = upcoming[0] ?? null;
  const recentDocs = documents.slice(0, 4);

  return (
    <PortalShell
      companyName={company.name}
      logoUrl={company.logoUrl}
      primaryColor={accent}
      token={params.token}
      active="overview"
    >
      {/* Salutation */}
      <div className="mb-6">
        <h1 className="font-manrope text-2xl font-semibold text-[#1b1c1a]">
          Welcome back, {contact.firstName}
        </h1>
        <p className="font-inter mt-1 text-sm text-[#444841]">
          Here&apos;s an overview of your work with {company.name}.
        </p>
      </div>

      {/* Cartes résumé */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}1f` }}
          >
            <Wallet className="h-5 w-5" strokeWidth={1.75} style={{ color: accent }} />
          </div>
          <p className="font-inter mt-3 text-xs font-semibold uppercase tracking-wide text-[#444841]">
            Outstanding balance
          </p>
          <p className="font-manrope mt-1 text-2xl font-bold text-[#1b1c1a]">
            {euros(totals.outstanding)}
          </p>
          {totals.outstanding > 0 && (
            <Link
              href={`${clientPortalPath(params.token)}/documents`}
              className="font-inter mt-2 inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: accent }}
            >
              Pay invoices <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d5e8cb]">
            <CheckCircle2 className="h-5 w-5 text-[#3b4b36]" strokeWidth={1.75} />
          </div>
          <p className="font-inter mt-3 text-xs font-semibold uppercase tracking-wide text-[#444841]">
            Paid to date
          </p>
          <p className="font-manrope mt-1 text-2xl font-bold text-[#1b1c1a]">
            {euros(totals.paid)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f8dac5]">
            <CalendarDays className="h-5 w-5 text-[#8a5a3b]" strokeWidth={1.75} />
          </div>
          <p className="font-inter mt-3 text-xs font-semibold uppercase tracking-wide text-[#444841]">
            Upcoming sessions
          </p>
          <p className="font-manrope mt-1 text-2xl font-bold text-[#1b1c1a]">
            {upcoming.length}
          </p>
        </div>
      </div>

      {/* Prochain rendez-vous */}
      {nextAppt && (
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-card">
          <p className="font-inter mb-3 text-xs font-semibold uppercase tracking-wide text-[#444841]">
            Next appointment
          </p>
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${nextAppt.sessionType?.color ?? accent}1f`,
              }}
            >
              <Clock
                className="h-5 w-5"
                strokeWidth={1.75}
                style={{ color: nextAppt.sessionType?.color ?? accent }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-manrope truncate text-base font-semibold text-[#1b1c1a]">
                {nextAppt.title}
              </p>
              <p className="font-inter mt-0.5 text-sm text-[#444841]">
                {portalDateTime(nextAppt.startAt)}
                {nextAppt.sessionType ? ` · ${nextAppt.sessionType.name}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Documents récents */}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-inter text-xs font-semibold uppercase tracking-wide text-[#444841]">
            Recent documents
          </p>
          {documents.length > 4 && (
            <Link
              href={`${clientPortalPath(params.token)}/documents`}
              className="font-inter inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: accent }}
            >
              View all <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          )}
        </div>

        {recentDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efeeea]">
              <FileText className="h-5 w-5 text-outline" strokeWidth={1.5} />
            </div>
            <p className="font-inter mt-3 text-sm text-[#444841]">
              No documents shared yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#c4c8be]/40">
            {recentDocs.map((d, i) => {
              const type = TYPE_CONFIG[d.type];
              const st = STATUS_CONFIG[d.status];
              const Icon = type.icon;
              return (
                <div
                  key={d.id}
                  className={`flex items-center justify-between px-4 py-3.5 ${
                    i > 0 ? "border-t border-[#f5f3f0]" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: type.tile }}
                    >
                      <Icon className="h-4 w-4 text-[#52634c]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
                        {d.title}
                      </p>
                      <p className="font-inter text-xs text-outline">
                        {type.label}
                        {d.number ? ` · ${d.number}` : ""} · {portalDate(d.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {d.total != null && (
                      <span className="font-manrope hidden text-sm font-semibold text-[#1b1c1a] sm:inline">
                        {euros(d.total)}
                      </span>
                    )}
                    <StatusBadge status={st.label} variant={st.variant} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
