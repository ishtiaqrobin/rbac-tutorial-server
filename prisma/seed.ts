// ─────────────────────────────────────────────────────────────────────────────
// prisma/seed.ts — Database seeding for RBAC Tutorial
//
// EDUCATIONAL NOTE
// ─────────────────
// Since we use Better-Auth, user accounts (passwords) are stored in the
// `accounts` table — NOT in the `users` table directly. The `users` table
// stores profile data (name, email, roleId, etc.).
//
// For seeding, we manually create:
//   1. Permissions (manage_users, create_content, etc.)
//   2. Roles (admin, editor, viewer)
//   3. Role-Permission mappings
//   4. Users (with UUID id, Better-Auth compatible)
//   5. Accounts (credential provider, bcrypt-hashed password)
//   6. Sample Content items
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting RBAC Tutorial database seeding...\n");

  // ── 1. Permissions ─────────────────────────────────────────────────────────
  const permissionsData = [
    { name: "manage_users",   description: "View, assign roles, and manage system users" },
    { name: "create_content", description: "Create and publish new content items" },
    { name: "edit_content",   description: "Modify and update existing content items" },
    { name: "delete_content", description: "Delete content items permanently" },
    { name: "view_reports",   description: "View system analytics and reports" },
  ];

  const permissionsMap: Record<string, number> = {};
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
    permissionsMap[p.name] = perm.id;
  }
  console.log("✅ Permissions seeded:", Object.keys(permissionsMap));

  // ── 2. Roles ───────────────────────────────────────────────────────────────
  const rolesData = [
    { name: "admin",  description: "System Administrator — full access to all resources" },
    { name: "editor", description: "Content Editor — can create and edit content" },
    { name: "viewer", description: "Read-only Viewer — can only view reports" },
  ];

  const rolesMap: Record<string, number> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    rolesMap[r.name] = role.id;
  }
  console.log("✅ Roles seeded:", Object.keys(rolesMap));

  // ── 3. Role-Permission mappings ────────────────────────────────────────────
  const rolePermissionAssignments: Record<string, string[]> = {
    admin:  ["manage_users", "create_content", "edit_content", "delete_content", "view_reports"],
    editor: ["create_content", "edit_content", "view_reports"],
    viewer: ["view_reports"],
  };

  for (const [roleName, permList] of Object.entries(rolePermissionAssignments)) {
    const roleId = rolesMap[roleName];
    for (const permName of permList) {
      const permissionId = permissionsMap[permName];
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }
  console.log("✅ Role-Permission mappings seeded");

  // ── 4. Seed Users + Accounts ───────────────────────────────────────────────
  // Better-Auth stores passwords in the `accounts` table (credential provider).
  // We manually create both the `users` row and the matching `accounts` row.
  const seedUsers = [
    { email: "admin@example.com",  name: "Admin User",  password: "Admin123!",  roleName: "admin"  },
    { email: "editor@example.com", name: "Editor User", password: "Editor123!", roleName: "editor" },
    { email: "viewer@example.com", name: "Viewer User", password: "Viewer123!", roleName: "viewer" },
  ];

  const createdUserIds: Record<string, string> = {};

  for (const u of seedUsers) {
    const roleId = rolesMap[u.roleName];
    const hashedPassword = await bcrypt.hash(u.password, 12);
    const now = new Date();

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, roleId },
      create: {
        id: uuidv4(),
        email: u.email,
        name: u.name,
        emailVerified: true,
        roleId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    createdUserIds[u.roleName] = user.id;

    // Upsert credential account (Better-Auth stores hashed pw here)
    const accountId = uuidv4();
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (!existing) {
      await prisma.account.create({
        data: {
          id: accountId,
          accountId: user.id,
          providerId: "credential",
          issuer: "local:credential", // REQUIRED by Better-Auth v1.7+
          userId: user.id,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  }

  console.log("✅ Users seeded: admin@example.com, editor@example.com, viewer@example.com");

  // ── 5. Sample Content Items ────────────────────────────────────────────────
  const contentItems = [
    {
      title: "Introduction to RBAC Architecture",
      body: "Role-Based Access Control (RBAC) decouples user identity from capabilities via roles and permissions. Admins assign roles, roles grant permissions, permissions gate actions.",
      authorId: createdUserIds["admin"],
    },
    {
      title: "Better-Auth + JWT Hybrid Authentication",
      body: "HTTP-Only cookies secure the Better-Auth session token while our JWT access tokens enable stateless, fast permission checks on every protected API endpoint.",
      authorId: createdUserIds["editor"],
    },
    {
      title: "Viewer Dashboard Report",
      body: "This report is accessible to all authenticated users. Editors can update it. Only admins can delete it. This demonstrates granular RBAC permission enforcement.",
      authorId: createdUserIds["admin"],
    },
  ];

  for (const item of contentItems) {
    const existing = await prisma.content.findFirst({ where: { title: item.title } });
    if (!existing) {
      await prisma.content.create({ data: item });
    }
  }
  console.log("✅ Sample Content items seeded\n");

  console.log("🎉 Seeding completed successfully!");
  console.log("\n📋 Test Credentials:");
  console.log("   admin@example.com  / Admin123!   → admin  (all permissions)");
  console.log("   editor@example.com / Editor123!  → editor (create, edit, view_reports)");
  console.log("   viewer@example.com / Viewer123!  → viewer (view_reports only)");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
