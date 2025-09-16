// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const permissions = [
  // User Permissions
  'MANAGE_USERS',
  'MANAGE_ROLES',
  // Dashboard / Analytics
  'VIEW_ANALYTICS',
  // Vendor Permissions
  'MANAGE_VENDORS',
  // IOM Permissions
  'CREATE_IOM',
  'READ_IOM',
  'UPDATE_IOM',
  'DELETE_IOM',
  'APPROVE_IOM',
  'REJECT_IOM',
  'REVIEW_IOM',
  // PO Permissions
  'CREATE_PO',
  'READ_PO', // Added this permission
  'UPDATE_PO',
  'DELETE_PO',
  'APPROVE_PO',
  'REJECT_PO',
  'REVIEW_PO',
  'VIEW_PO',
  // PR Permissions
  'CREATE_PR',
  'READ_PR', // Added this permission
  'VIEW_PR',
  'UPDATE_PR',
  'DELETE_PR',
  'APPROVE_PR',
  'REJECT_PR',
  'REVIEW_PR',
];

const roles = {
  ADMIN: permissions, // Admin now gets all permissions including READ_PO and READ_PR
  MANAGER: [
    'READ_IOM',
    'UPDATE_IOM',
    'APPROVE_IOM',
    'REJECT_IOM',
    'READ_PO',
    'APPROVE_PO',
    'REJECT_PO',
    'READ_PR',
    'APPROVE_PR',
    'REJECT_PR',
    'MANAGE_VENDORS',
    'VIEW_ANALYTICS',
  ],
  REVIEWER: [
    'READ_IOM',
    'REVIEW_IOM',
    'UPDATE_IOM',
    'READ_PO',
    'REVIEW_PO',
    'READ_PR',
    'REVIEW_PR',
  ],
  USER: [
    'CREATE_IOM',
    'READ_IOM',
    'UPDATE_IOM',
    'DELETE_IOM',
    'CREATE_PO',
    'READ_PO',
    'UPDATE_PO',
    'DELETE_PO',
    'CREATE_PR',
    'READ_PR',
    'UPDATE_PR',
    'DELETE_PR',
  ],
};

async function main() {
  console.log('Start seeding...');

  // Create all permissions
  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Permissions seeded.');

  // Create roles and assign permissions
  for (const [roleName, rolePermissions] of Object.entries(roles)) {
    const createdRole = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    console.log(`Upserted role: ${createdRole.name}`);

    // Get the permission objects
    const permissionsToConnect = await prisma.permission.findMany({
      where: {
        name: {
          in: rolePermissions,
        },
      },
    });

    // Link permissions to the role
    await prisma.role.update({
      where: { id: createdRole.id },
      data: {
        permissions: {
          deleteMany: {}, // Clear existing permissions before setting new ones
          create: permissionsToConnect.map((p) => ({
            assignedBy: 'system',
            permission: {
              connect: {
                id: p.id,
              },
            },
          })),
        },
      },
    });
    console.log(`Linked ${permissionsToConnect.length} permissions to ${createdRole.name}`);
  }

  // Create a default admin user
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (adminRole) {
    const hashedPassword = await bcrypt.hash('password', 10);
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        roleId: adminRole.id,
      },
    });
    console.log('Default admin user created.');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });