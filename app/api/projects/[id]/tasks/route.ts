import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { taskCreateSchema, taskUpdateSchema } from "@/lib/validations";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

const TASK_SELECT = {
  id: true,
  title: true,
  completed: true,
  priority: true,
} satisfies Prisma.TaskSelect;

/** Vérifie que le projet existe et appartient à la company. */
async function assertProject(projectId: string, companyId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });
}

// ───────────────────────── GET : tâches du projet ─────────────────────────
export const GET = withApi(
  async (_request: Request, { params }: { params: { id: string } }) => {
    const { user, company } = await getAuthedCompany();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!company) return NextResponse.json([]);

    const project = await assertProject(params.id, company.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: params.id, companyId: company.id },
      orderBy: { createdAt: "asc" },
      select: TASK_SELECT,
    });

    return NextResponse.json(tasks);
  }
);

// ───────────────────────── POST : nouvelle tâche ─────────────────────────
export const POST = withApi(
  async (request: Request, { params }: { params: { id: string } }) => {
    const { user, company } = await getAuthedCompany();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!company) {
      return NextResponse.json({ error: "No company" }, { status: 403 });
    }

    const project = await assertProject(params.id, company.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { title } = taskCreateSchema.parse(await request.json());

    const task = await prisma.task.create({
      data: {
        title: sanitizeText(title),
        companyId: company.id,
        projectId: params.id,
      },
      select: TASK_SELECT,
    });

    return NextResponse.json(task, { status: 201 });
  }
);

// ───────────────────────── PATCH : maj tâche (completed / title) ─────────────────────────
export const PATCH = withApi(
  async (request: Request, { params }: { params: { id: string } }) => {
    const { user, company } = await getAuthedCompany();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!company) {
      return NextResponse.json({ error: "No company" }, { status: 403 });
    }

    const { taskId, title, completed } = taskUpdateSchema.parse(
      await request.json()
    );

    const data: Prisma.TaskUpdateManyMutationInput = {};
    if (title !== undefined) data.title = sanitizeText(title);
    if (completed !== undefined) data.completed = completed;

    // updateMany scopé projet + company → pas de fuite cross-tenant.
    const updated = await prisma.task.updateMany({
      where: { id: taskId, projectId: params.id, companyId: company.id },
      data,
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ id: taskId, ok: true });
  }
);

// ───────────────────────── DELETE : ?taskId= ─────────────────────────
export const DELETE = withApi(
  async (request: Request, { params }: { params: { id: string } }) => {
    const { user, company } = await getAuthedCompany();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!company) {
      return NextResponse.json({ error: "No company" }, { status: 403 });
    }

    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "taskId requis" }, { status: 400 });
    }

    const deleted = await prisma.task.deleteMany({
      where: { id: taskId, projectId: params.id, companyId: company.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  }
);
