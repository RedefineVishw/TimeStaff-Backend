// Idempotent bootstrap for real, required configuration data — NOT dummy
// test data. Safe to run more than once (upsert throughout); every
// environment including production needs this to exist before the app can
// function at all. Run with: npx tsx prisma/bootstrap.ts
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

// --- Roles + permissions ----------------------------------------------------
// Matches the role list and example permission set from the Phase 1 doc.
// SUPER_ADMIN is deliberately excluded — it's a separate table entirely,
// not part of the org-scoped RBAC system.

const PERMISSIONS = [
  "organization.view",
  "organization.edit",
  "user.view",
  "user.create",
  "user.edit",
  "user.delete",
  "project.view",
  "project.create",
  "project.edit",
  "project.delete",
  "task.view",
  "task.create",
  "task.edit",
  "task.delete",
  "task.assign",
  "task.status.change",
  "time.view",
  "time.create",
  "time.edit",
  "time.approve",
  "bug.view",
  "bug.create",
  "bug.edit",
  "bug.assign",
  "hr.view",
  "hr.edit",
  "kpi.view",
  "kpi.edit",
  "reports.view",
] as const;

// First-pass role -> permission mapping. A real business decision, not a
// technical one — review and adjust these, don't take them as final.
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ORGANIZATION_ADMIN: PERMISSIONS, // full access within their org
  PROJECT_MANAGER: [
    "organization.view",
    "user.view",
    "project.view",
    "project.create",
    "project.edit",
    "project.delete",
    "task.view",
    "task.create",
    "task.edit",
    "task.delete",
    "task.assign",
    "task.status.change",
    "time.view",
    "time.approve",
    "bug.view",
    "bug.assign",
    "reports.view",
    "kpi.view",
  ],
  COORDINATOR: [
    "organization.view",
    "project.view",
    "task.view",
    "task.create",
    "task.edit",
    "task.assign",
    "task.status.change",
    "time.view",
    "reports.view",
  ],
  TEAM_LEAD: [
    "organization.view",
    "project.view",
    "task.view",
    "task.assign",
    "task.status.change",
    "time.view",
    "time.approve",
    "reports.view",
    "kpi.view",
  ],
  QA: [
    "organization.view",
    "project.view",
    "task.view",
    "task.status.change",
    "bug.view",
    "bug.create",
    "bug.edit",
    "bug.assign",
  ],
  EMPLOYEE: [
    "organization.view",
    "project.view",
    "task.view",
    "task.status.change",
    "time.view",
    "time.create",
    "time.edit",
  ],
  HR: [
    "organization.view",
    "user.view",
    "user.create",
    "user.edit",
    "hr.view",
    "hr.edit",
    "kpi.view",
    "reports.view",
  ],
};

// --- Plans -------------------------------------------------------------------
// Matches the pricing already live on the landing page exactly.

const PLANS = [
  {
    name: "Starter",
    basePrice: "20.00",
    billingCycle: "MONTHLY" as const,
    entitlements: { time_tracking: "true", advanced_reports: "false", hr: "false", custom_permissions: "false", screenshots: "false" },
  },
  {
    name: "Growth",
    basePrice: "60.00",
    billingCycle: "MONTHLY" as const,
    entitlements: { time_tracking: "true", advanced_reports: "true", hr: "false", custom_permissions: "false", screenshots: "true" },
  },
  {
    name: "Enterprise",
    basePrice: "6000.00",
    billingCycle: "YEARLY" as const,
    entitlements: { time_tracking: "true", advanced_reports: "true", hr: "true", custom_permissions: "true", screenshots: "true" },
  },
];

async function bootstrapPermissions() {
  const permissionIds = new Map<string, string>();
  for (const name of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    permissionIds.set(name, permission.id);
  }
  console.log(`Permissions: ${PERMISSIONS.length} ensured.`);
  return permissionIds;
}

async function bootstrapRoles(permissionIds: Map<string, string>) {
  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName },
      update: {},
    });

    for (const permissionName of permissionNames) {
      const permissionId = permissionIds.get(permissionName);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        create: { roleId: role.id, permissionId },
        update: {},
      });
    }
    console.log(`Role ${roleName}: ${permissionNames.length} permissions ensured.`);
  }
}

async function bootstrapPlans() {
  for (const planData of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { name: planData.name },
      create: {
        name: planData.name,
        basePrice: planData.basePrice,
        billingCycle: planData.billingCycle,
        visibility: "PUBLIC",
      },
      update: {
        basePrice: planData.basePrice,
        billingCycle: planData.billingCycle,
      },
    });

    for (const [feature, value] of Object.entries(planData.entitlements)) {
      await prisma.planEntitlement.upsert({
        where: { planId_feature: { planId: plan.id, feature } },
        create: { planId: plan.id, feature, value },
        update: { value },
      });
    }
    console.log(`Plan ${plan.name}: entitlements ensured.`);
  }
}

async function bootstrapSuperAdmin() {
  const email = process.env["SUPER_ADMIN_EMAIL"];
  const password = process.env["SUPER_ADMIN_PASSWORD"];

  if (!email || !password) {
    throw new Error(
      "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env — refusing to guess a credential.",
    );
  }

  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) {
    console.log(`SuperAdmin ${email} already exists — leaving password untouched.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.superAdmin.create({
    data: { email, passwordHash, firstName: "Super", lastName: "Admin" },
  });
  console.log(`SuperAdmin ${email} created.`);
}

async function main() {
  const permissionIds = await bootstrapPermissions();
  await bootstrapRoles(permissionIds);
  await bootstrapPlans();
  await bootstrapSuperAdmin();
  console.log("Bootstrap complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
