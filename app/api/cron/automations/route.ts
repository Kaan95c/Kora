import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api-handler";
import { logger } from "@/lib/logger";
import {
  triggerAutomations,
  runAction,
  type AutomationContext,
} from "@/lib/automations/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QUEUE_BATCH = 200;

/**
 * Cron quotidien des automatisations (Vercel Cron — `vercel.json`, 09:00).
 *
 * Deux jobs :
 *  1. PAYMENT_OVERDUE : les paiements PENDING dont `dueDate` est passée sont
 *     basculés en OVERDUE **une seule fois** (transition) → le trigger ne se
 *     redéclenche pas chaque jour pour la même facture.
 *  2. File différée : exécute les actions `AutomationQueue` arrivées à échéance
 *     (`runAt <= now`).
 *
 * Sécurité : Vercel ajoute `Authorization: Bearer ${CRON_SECRET}` quand l'env
 * `CRON_SECRET` est défini. On l'exige si présent (401 sinon). Sans env (local),
 * on laisse passer en loguant un avertissement.
 */
export const GET = withApi(async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    logger.warn("cron_no_secret", { route: "automations" });
  }

  const now = new Date();

  // ── 1. Paiements en retard (transition PENDING → OVERDUE, fire une fois) ──
  const overduePayments = await prisma.payment.findMany({
    where: { status: "PENDING", dueDate: { lt: now, not: null } },
    select: { id: true, companyId: true, contactId: true, documentId: true, projectId: true },
  });

  if (overduePayments.length > 0) {
    // On bascule en OVERDUE d'abord → même si le déclenchement échoue, l'état est
    // correct et ne sera pas rejoué demain.
    await prisma.payment.updateMany({
      where: { id: { in: overduePayments.map((p) => p.id) } },
      data: { status: "OVERDUE" },
    });

    for (const p of overduePayments) {
      await triggerAutomations(p.companyId, "PAYMENT_OVERDUE", {
        contactId: p.contactId,
        documentId: p.documentId,
        projectId: p.projectId,
      });
    }
  }

  // ── 2. File des actions différées arrivées à échéance ──
  const due = await prisma.automationQueue.findMany({
    where: { status: "PENDING", runAt: { lte: now } },
    orderBy: { runAt: "asc" },
    take: QUEUE_BATCH,
  });

  for (const item of due) {
    await runAction(
      item.companyId,
      item.type,
      item.config,
      (item.context ?? {}) as AutomationContext
    );
    await prisma.automationQueue
      .update({
        where: { id: item.id },
        data: { status: "DONE", attempts: { increment: 1 } },
      })
      .catch(() => {});
  }

  logger.info("cron_automations_done", {
    overdue: overduePayments.length,
    queueProcessed: due.length,
  });

  return NextResponse.json({
    ok: true,
    overdue: overduePayments.length,
    queueProcessed: due.length,
  });
});
