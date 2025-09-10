import { PrismaClient } from '@prisma/client';

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
  // PO Permissions
  'CREATE_PO',
  'READ_PO',
  'UPDATE_PO',
  'DELETE_PO',
  'APPROVE_PO',
  'REJECT_PO',
  // CR Permissions
  'CREATE_CR',
  'READ_CR',
  'UPDATE_CR',
  'DELETE_CR',
  'APPROVE_CR',
  'REJECT_CR',
];

const roles = {
  ADMIN: permissions, // Admin gets all permissions
  MANAGER: [
    'READ_IOM',
    'APPROVE_IOM',
    'REJECT_IOM',
    'READ_PO',
    'APPROVE_PO',
    'REJECT_PO',
    'READ_CR',
    'APPROVE_CR',
    'REJECT_CR',
    'MANAGE_VENDORS',
    'VIEW_ANALYTICS',
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
    'CREATE_CR',
    'READ_CR',
    'UPDATE_CR',
    'DELETE_CR',
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
