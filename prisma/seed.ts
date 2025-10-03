// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const permissions = [
  // User Permissions
  'MANAGE_USERS',
  'MANAGE_ROLES',
  'MANAGE_SETTINGS',
  'MANAGE_DEPARTMENTS',
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
  // PR Permissions
  'CREATE_PR',
  'READ_PR', // Added this permission
  'UPDATE_PR',
  'DELETE_PR',
  'APPROVE_PR',
  'REJECT_PR',
  'REVIEW_PR',
  'PROCESS_PAYMENT_REQUEST',
  // Permissions for viewing all documents of a type
  'READ_ALL_IOMS',
  'READ_ALL_POS',
  'READ_ALL_PRS',
];

const roles = {
  Administrator: permissions,
  Manager: [
    'READ_ALL_IOMS', 'READ_ALL_POS', 'READ_ALL_PRS', 'APPROVE_IOM', 'APPROVE_PO', 'APPROVE_PR',
    'REJECT_IOM', 'REJECT_PO', 'REJECT_PR', 'REVIEW_IOM', 'REVIEW_PO', 'REVIEW_PR', 'VIEW_ANALYTICS'
  ],
  Approver: [
    'READ_ALL_IOMS', 'READ_ALL_POS', 'READ_ALL_PRS', 'APPROVE_IOM', 'APPROVE_PO', 'APPROVE_PR',
    'REJECT_IOM', 'REJECT_PO', 'REJECT_PR', 'REVIEW_IOM', 'REVIEW_PO', 'REVIEW_PR'
  ],
  'Procurement Officer': [
    'CREATE_IOM', 'READ_IOM', 'UPDATE_IOM', 'DELETE_IOM',
    'CREATE_PO', 'READ_PO', 'UPDATE_PO', 'DELETE_PO',
    'CREATE_PR', 'READ_PR', 'UPDATE_PR', 'DELETE_PR',
    'MANAGE_VENDORS',
    'PROCESS_PAYMENT_REQUEST'
  ],
  'Finance Officer': [
    'READ_ALL_PRS', 'UPDATE_PR', 'APPROVE_PR', 'PROCESS_PAYMENT_REQUEST'
  ],
};

const departmentsToCreate = [
  { name: 'Human Resources' },
  { name: 'IT' },
  { name: 'Finance' },
  { name: 'Procurement' },
  { name: 'Operations' },
];

const usersToCreate = [
  { name: 'Admin User', email: 'admin@nexusprocure.com', role: 'Administrator', department: 'IT' },
  { name: 'Manager User', email: 'manager@nexusprocure.com', role: 'Manager', department: 'Operations' },
  { name: 'Approver User', email: 'approver@nexusprocure.com', role: 'Approver', department: 'Finance' },
  { name: 'Procurement User', email: 'procurement@nexusprocure.com', role: 'Procurement Officer', department: 'Procurement' },
  { name: 'Finance User', email: 'finance@nexusprocure.com', role: 'Finance Officer', department: 'Finance' },
];

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

    const permissionsToConnect = await prisma.permission.findMany({
      where: { name: { in: rolePermissions } },
    });

    await prisma.role.update({
      where: { id: createdRole.id },
      data: {
        permissions: {
          deleteMany: {}, // Clear existing permissions
          create: permissionsToConnect.map((p) => ({
            assignedBy: 'system',
            permission: { connect: { id: p.id } },
          })),
        },
      },
    });
    console.log(`Linked ${permissionsToConnect.length} permissions to ${createdRole.name}`);
  }

  // Create departments
  for (const dept of departmentsToCreate) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name },
    });
  }
  console.log('Departments seeded.');

  // Create users and associate with departments
  const hashedPassword = await bcrypt.hash('password123', 10);
  for (const userData of usersToCreate) {
    const role = await prisma.role.findUnique({ where: { name: userData.role } });
    const department = await prisma.department.findUnique({ where: { name: userData.department } });

    if (role && department) {
      await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          roleId: role.id,
          departmentId: department.id,
        },
        create: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          roleId: role.id,
          departmentId: department.id,
        },
      });
      console.log(`Upserted user: ${userData.email} with role ${userData.role} in department ${userData.department}`);
    } else {
      if (!role) console.error(`Role ${userData.role} not found for user ${userData.email}`);
      if (!department) console.error(`Department ${userData.department} not found for user ${userData.email}`);
    }
  }

  // Seed sample documents to ensure dashboards are not empty
  console.log('Seeding sample documents...');
  const procurementUser = await prisma.user.findUnique({ where: { email: 'procurement@nexusprocure.com' } });
  const approverUser = await prisma.user.findUnique({ where: { email: 'approver@nexusprocure.com' } });
  const managerUser = await prisma.user.findUnique({ where: { email: 'manager@nexusprocure.com' } });
  const procurementDepartment = await prisma.department.findUnique({ where: { name: 'Procurement' } });


  if (procurementUser && approverUser && managerUser && procurementDepartment) {
    // Create a sample IOM for the Approver/Manager
    await prisma.iOM.upsert({
      where: { iomNumber: 'IOM-2025-SEED-01' },
      update: {},
      create: {
        iomNumber: 'IOM-2025-SEED-01',
        title: 'Sample IOM for Office Supplies',
        from: 'Procurement Department',
        to: 'IT Department',
        subject: 'Request for new keyboards and mice',
        status: 'SUBMITTED',
        preparedById: procurementUser.id,
        requestedById: procurementUser.id,
        reviewedById: approverUser.id,
        approvedById: managerUser.id,
        departmentId: procurementDepartment.id, // Link IOM to the Procurement department
        items: {
          create: [
            { itemName: 'Logitech MX Keys', quantity: 5, unitPrice: 8000, totalPrice: 40000, category: 'IT Hardware' },
            { itemName: 'Logitech MX Master 3S', quantity: 5, unitPrice: 7500, totalPrice: 37500, category: 'IT Hardware' },
          ],
        },
        totalAmount: 77500,
      },
    });

    // Create a sample PO for the Approver/Manager
    await prisma.purchaseOrder.upsert({
      where: { poNumber: 'PO-2025-SEED-01' },
      update: {},
      create: {
        poNumber: 'PO-2025-SEED-01',
        title: 'Sample PO for Laptops',
        status: 'ORDERED', // Use a status that will be picked up by analytics
        preparedById: procurementUser.id,
        requestedById: procurementUser.id,
        reviewedById: approverUser.id,
        approvedById: managerUser.id,
        vendorName: 'Dell Inc.',
        vendorAddress: '123 Tech Street, Bangalore',
        vendorContact: 'sales@dell.co.in',
        companyName: 'NexusProcure Inc.',
        companyAddress: '456 Business Avenue, Mumbai',
        companyContact: 'contact@nexusprocure.com',
        totalAmount: 300000,
        taxRate: 18,
        taxAmount: 54000,
        grandTotal: 354000,
        items: {
          create: [
            { itemName: 'Dell XPS 15 Laptop', quantity: 2, unitPrice: 150000, taxRate: 18, taxAmount: 54000, totalPrice: 354000, category: 'IT Hardware' },
          ]
        }
      }
    });
    console.log('Seeded 1 IOM and 1 PO.');
  } else {
    console.log('Could not find all required users to seed sample documents.');
  }

  // Seed default settings
  console.log('Seeding default settings...');
  const iomHeaderText = `Sri Bhagyalakshmi Enterprises
Corp.Office: No.1038, Thandarai Main Road | Vayalanallur, Pattabiram, | Chennai-600072.
Regd. Office: Plot No.1310, 13th Main Road, | Anna Nagar, | Chennai - 600040. | Ph: 044-46664666`;

  await prisma.setting.upsert({
    where: { key: 'iomHeaderText' },
    update: { value: iomHeaderText },
    create: {
      key: 'iomHeaderText',
      value: iomHeaderText,
    },
  });
  console.log('Default settings seeded.');


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