import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(3).max(120),
  officer_id: z.string().trim().min(3).max(60),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  designation: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(160),
  district: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
});

export type RegisterOfficerResult =
  | { ok: true }
  | { ok: false; field?: "officer_id" | "email"; message: string };

/**
 * Creates the Supabase Auth user (password handled by Auth only) plus the
 * matching officer_profiles row. Officer ID uniqueness is enforced here and by
 * the table's unique constraint.
 */
export const registerOfficer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<RegisterOfficerResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const officerId = data.officer_id.toUpperCase();

    const existing = await supabaseAdmin
      .from("officer_profiles")
      .select("officer_id")
      .eq("officer_id", officerId)
      .maybeSingle();
    if (existing.data) {
      return { ok: false, field: "officer_id", message: "This Officer ID is already registered." };
    }

    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, officer_id: officerId },
    });

    if (created.error || !created.data.user) {
      const msg = created.error?.message ?? "Could not create the officer account.";
      const dup = /already|registered|exists/i.test(msg);
      return {
        ok: false,
        ...(dup ? { field: "email" as const } : {}),
        message: dup ? "An officer account already exists for this email address." : msg,
      };
    }

    const userId = created.data.user.id;
    const inserted = await supabaseAdmin.from("officer_profiles").insert({
      id: userId,
      user_id: userId,
      officer_id: officerId,
      full_name: data.full_name,
      email,
      designation: data.designation,
      department: data.department,
      district: data.district,
      state: data.state,
      role: "Inspector",
      is_active: true,
    });

    if (inserted.error) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      const dup = inserted.error.code === "23505";
      return {
        ok: false,
        ...(dup ? { field: "officer_id" as const } : {}),
        message: dup
          ? "This Officer ID is already registered."
          : `Officer profile could not be created: ${inserted.error.message}`,
      };
    }

    return { ok: true };
  });
