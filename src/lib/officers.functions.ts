import { createServerFn } from "@tanstack/react-start";

type DemoOfficer = {
  officer_id: string;
  email: string;
  password: string;
  full_name: string;
  designation: string;
  department: string;
  district: string;
  state: string;
  role: "Inspector" | "Senior Inspector" | "Admin";
};

const DEMO_OFFICERS: DemoOfficer[] = [
  {
    officer_id: "LM-OFFICER-001",
    email: "officer001@veripack.demo",
    password: "Officer@123",
    full_name: "Rajesh Sharma",
    designation: "Legal Metrology Inspector",
    department: "Department of Consumer Affairs",
    district: "Bhopal",
    state: "Madhya Pradesh",
    role: "Inspector",
  },
  {
    officer_id: "LM-OFFICER-002",
    email: "officer002@veripack.demo",
    password: "Officer@123",
    full_name: "Amit Verma",
    designation: "Legal Metrology Inspector",
    department: "Department of Consumer Affairs",
    district: "Indore",
    state: "Madhya Pradesh",
    role: "Inspector",
  },
];

/**
 * Idempotently provisions the two demo officer accounts through the Auth admin
 * API. Passwords live only in Auth (hashed), never in officer_profiles.
 */
export const seedDemoOfficers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results: string[] = [];

  for (const officer of DEMO_OFFICERS) {
    let userId: string | null = null;

    const created = await supabaseAdmin.auth.admin.createUser({
      email: officer.email,
      password: officer.password,
      email_confirm: true,
      user_metadata: { full_name: officer.full_name, officer_id: officer.officer_id },
    });

    if (created.data?.user) {
      userId = created.data.user.id;
      results.push(`${officer.officer_id}: created`);
    } else {
      // Already exists — find the user and reset the demo password.
      const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list.data?.users.find(
        (u) => u.email?.toLowerCase() === officer.email.toLowerCase(),
      );
      if (!existing) {
        results.push(`${officer.officer_id}: failed (${created.error?.message ?? "unknown"})`);
        continue;
      }
      userId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: officer.password,
        email_confirm: true,
      });
      results.push(`${officer.officer_id}: existing (password reset)`);
    }

    const { error } = await supabaseAdmin.from("officer_profiles").upsert(
      {
        id: userId,
        officer_id: officer.officer_id,
        full_name: officer.full_name,
        designation: officer.designation,
        department: officer.department,
        district: officer.district,
        state: officer.state,
        email: officer.email,
        role: officer.role,
        is_active: true,
      },
      { onConflict: "id" },
    );
    if (error) results.push(`${officer.officer_id}: profile error ${error.message}`);
  }

  return { results };
});
