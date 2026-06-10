import { CalendarDays, Clock } from "lucide-react";

import { PortalShell } from "@/components/client/PortalShell";
import { InvalidLink } from "@/components/client/InvalidLink";
import {
  getPortalData,
  portalDateTime,
  type PortalAppointment,
} from "@/lib/client-portal";

export const dynamic = "force-dynamic";

function ApptRow({
  appt,
  accent,
  muted,
}: {
  appt: PortalAppointment;
  accent: string;
  muted?: boolean;
}) {
  const color = appt.sessionType?.color ?? accent;
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 ${muted ? "opacity-70" : ""}`}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1f` }}
      >
        <Clock className="h-5 w-5" strokeWidth={1.75} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
          {appt.title}
        </p>
        <p className="font-inter text-xs text-[#444841]">
          {portalDateTime(appt.startAt)}
          {appt.sessionType ? ` · ${appt.sessionType.name}` : ""}
        </p>
      </div>
    </div>
  );
}

export default async function PortalAppointmentsPage({
  params,
}: {
  params: { token: string };
}) {
  const data = await getPortalData(params.token);
  if (!data) return <InvalidLink />;

  const { company, appointments } = data;
  const accent = company.primaryColor;
  const now = Date.now();

  const upcoming = appointments.filter(
    (a) => new Date(a.startAt).getTime() >= now
  );
  // Plus récents d'abord pour le passé.
  const past = appointments
    .filter((a) => new Date(a.startAt).getTime() < now)
    .reverse();

  return (
    <PortalShell
      companyName={company.name}
      logoUrl={company.logoUrl}
      primaryColor={accent}
      token={params.token}
      active="appointments"
    >
      <h1 className="font-manrope mb-1 text-2xl font-semibold text-[#1b1c1a]">
        Appointments
      </h1>
      <p className="font-inter mb-6 text-sm text-[#444841]">
        Your scheduled sessions with {company.name}.
      </p>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efeeea]">
            <CalendarDays className="h-6 w-6 text-outline" strokeWidth={1.5} />
          </div>
          <p className="font-inter mt-3 text-sm text-[#444841]">
            No appointments scheduled yet.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <p className="font-inter mb-3 text-xs font-semibold uppercase tracking-wide text-[#444841]">
                Upcoming
              </p>
              <div className="overflow-hidden rounded-2xl bg-white shadow-card">
                {upcoming.map((a, i) => (
                  <div
                    key={a.id}
                    className={i > 0 ? "border-t border-[#f5f3f0]" : ""}
                  >
                    <ApptRow appt={a} accent={accent} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <p className="font-inter mb-3 text-xs font-semibold uppercase tracking-wide text-[#444841]">
                Past
              </p>
              <div className="overflow-hidden rounded-2xl bg-white shadow-card">
                {past.map((a, i) => (
                  <div
                    key={a.id}
                    className={i > 0 ? "border-t border-[#f5f3f0]" : ""}
                  >
                    <ApptRow appt={a} accent={accent} muted />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PortalShell>
  );
}
