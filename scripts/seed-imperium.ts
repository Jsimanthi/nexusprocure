import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding Imperium V2 Data...')

    // 1. Seed Budget for "Operations"
    // This enables the "Hard Budget Enforcement" test.
    const budget = await prisma.budget.upsert({
        where: { departmentName: 'Operations' },
        update: {},
        create: {
            departmentName: 'Operations',
            totalBudget: 50000, // $50k Limit
            spentAmount: 45000, // $45k Spent - Only $5k remaining!
            fiscalYear: 2025
        }
    })
    console.log(`✅ Budget Created: Operations ($${budget.spentAmount} / $${budget.totalBudget})`)

    // 2. Seed Vendor for "Risk Radar"
    // This enables the "Risk Radar" test.
    const existingVendor = await prisma.vendor.findFirst({
        where: { name: 'Apex Innovations' }
    })

    let vendor;
    if (!existingVendor) {
        vendor = await prisma.vendor.create({
            data: {
                name: 'Apex Innovations',
                address: '123 Test St, Silicon Valley, CA',
                contactInfo: 'support@apex.com',
                email: 'sales@apex.com',
                phone: '555-0199',
                onTimeDeliveryRate: 98,
                averageQualityScore: 99,
            }
        })
        console.log(`✅ Vendor Created: ${vendor.name}`)
    } else {
        vendor = existingVendor;
        console.log(`ℹ️ Vendor already exists: ${vendor.name}`)
    }
    console.log('🚀 Seed complete! Run "npm run dev" to test.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
