import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// PUT : met à jour le nom du user (Prisma) + le displayName Supabase (admin).
export async function PUT(request: Request) {
  const { user } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Source de vérité applicative (scopé au user courant via supabaseId).
  await prisma.user.updateMany({
    where: { supabaseId: user.id },
    data: { name },
  });

  // Miroir côté Supabase Auth (user_metadata.full_name).
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, full_name: name },
  });

  return NextResponse.json({ name });
}
