import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for RBAC System...');

  // 1. Seed Permissions
  const permissionsData = [
    { name: 'manage_users', description: 'View, assign roles, and manage system users' },
    { name: 'create_content', description: 'Create and publish new content items' },
    { name: 'edit_content', description: 'Modify and update existing content items' },
    { name: 'delete_content', description: 'Delete content items permanently' },
    { name: 'view_reports', description: 'View system analytics and reports' },
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
  console.log('✅ Permissions seeded:', Object.keys(permissionsMap));

  // 2. Seed Roles
  const rolesData = [
    { name: 'admin', description: 'System Administrator with full access' },
    { name: 'editor', description: 'Content Editor who can create & edit content' },
    { name: 'viewer', description: 'Read-only Viewer with basic report privileges' },
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
  console.log('✅ Roles seeded:', Object.keys(rolesMap));

  // 3. Seed Role-Permissions Mapping
  const rolePermissionAssignments: Record<string, string[]> = {
    admin: ['manage_users', 'create_content', 'edit_content', 'delete_content', 'view_reports'],
    editor: ['create_content', 'edit_content', 'view_reports'],
    viewer: ['view_reports'],
  };

  for (const [roleName, permList] of Object.entries(rolePermissionAssignments)) {
    const roleId = rolesMap[roleName];
    for (const permName of permList) {
      const permissionId = permissionsMap[permName];
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }
  console.log('✅ Role-Permission mappings seeded');

  // 4. Seed Dummy Users
  const passwordHashAdmin = await bcrypt.hash('Admin123!', 10);
  const passwordHashEditor = await bcrypt.hash('Editor123!', 10);
  const passwordHashViewer = await bcrypt.hash('Viewer123!', 10);

  const usersData = [
    {
      username: 'admin',
      email: 'admin@example.com',
      password: passwordHashAdmin,
      roleId: rolesMap['admin'],
      isActive: true,
    },
    {
      username: 'editor',
      email: 'editor@example.com',
      password: passwordHashEditor,
      roleId: rolesMap['editor'],
      isActive: true,
    },
    {
      username: 'viewer',
      email: 'viewer@example.com',
      password: passwordHashViewer,
      roleId: rolesMap['viewer'],
      isActive: true,
    },
  ];

  const createdUsers: Record<string, number> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: u.password, roleId: u.roleId },
      create: u,
    });
    createdUsers[u.username] = user.id;
  }
  console.log('✅ Users seeded: admin@example.com, editor@example.com, viewer@example.com');

  // 5. Seed Sample Content Items for RBAC practice
  const contentItems = [
    {
      title: 'Introduction to RBAC Architecture',
      body: 'Role-Based Access Control decouples user identity from granular capabilities via roles and permissions.',
      authorId: createdUsers['admin'],
    },
    {
      title: 'Guide to Better-Auth & Session Cookies',
      body: 'HTTP-only cookies provide secure session state handling while JWT tokens enable stateless API authentication.',
      authorId: createdUsers['editor'],
    },
  ];

  for (const item of contentItems) {
    const existing = await prisma.content.findFirst({ where: { title: item.title } });
    if (!existing) {
      await prisma.content.create({ data: item });
    }
  }
  console.log('✅ Sample Content items seeded');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
