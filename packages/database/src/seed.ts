import { prisma } from './client';

async function main() {
  console.log('🌱 Seeding ApexBookings development database...');

  // 1. Create or upsert Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: 'owner@acmeconsulting.com' },
    update: {},
    create: {
      email: 'owner@acmeconsulting.com',
      name: 'Sarah Jenkins',
      passwordHash: '$2a$12$eX4mpleHashedPasswordForDevelopmentOnly1234567890',
    },
  });

  // 2. Create or upsert Demo Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-consulting' },
    update: {},
    create: {
      name: 'Acme Advisory & Wellness',
      slug: 'acme-consulting',
      timezone: 'America/New_York',
      currency: 'USD',
      members: {
        create: {
          userId: demoUser.id,
          role: 'OWNER',
        },
      },
    },
  });

  // 3. Create Service Category
  const category = await prisma.serviceCategory.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: 'General Consultations',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'General Consultations',
    },
  });

  // 4. Create Staff Members
  const staff1 = await prisma.staff.upsert({
    where: {
      workspaceId_email: {
        workspaceId: workspace.id,
        email: 'sarah.jenkins@acmeconsulting.com',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: demoUser.id,
      name: 'Sarah Jenkins (Principal Advisor)',
      email: 'sarah.jenkins@acmeconsulting.com',
      timezone: 'America/New_York',
      isActive: true,
      workingHours: {
        create: [
          // Mon-Fri: 09:00 - 17:00 with 13:00 - 14:00 Lunch Break
          ...[1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
            breaks: {
              create: [
                {
                  startTime: '13:00',
                  endTime: '14:00',
                },
              ],
            },
          })),
        ],
      },
    },
  });

  const staff2 = await prisma.staff.upsert({
    where: {
      workspaceId_email: {
        workspaceId: workspace.id,
        email: 'david.chen@acmeconsulting.com',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'David Chen (Senior Consultant)',
      email: 'david.chen@acmeconsulting.com',
      timezone: 'America/New_York',
      isActive: true,
      workingHours: {
        create: [
          // Tue-Sat: 10:00 - 18:00
          ...[2, 3, 4, 5, 6].map((day) => ({
            dayOfWeek: day,
            startTime: '10:00',
            endTime: '18:00',
          })),
        ],
      },
    },
  });

  // 5. Create Services
  const service1 = await prisma.service.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'initial-strategy-session',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      categoryId: category.id,
      name: 'Initial Strategy Consultation',
      slug: 'initial-strategy-session',
      description: 'Comprehensive 45-minute strategic advisory session to identify growth opportunities and process bottlenecks.',
      durationMinutes: 45,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
      price: 150.00,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      locationDetails: 'Google Meet link provided upon booking confirmation',
      isActive: true,
      staffAssignments: {
        create: [
          { staffId: staff1.id },
          { staffId: staff2.id },
        ],
      },
    },
  });

  const service2 = await prisma.service.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'express-review',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      categoryId: category.id,
      name: '30-Minute Express Review',
      slug: 'express-review',
      description: 'Quick check-in session for existing clients and rapid milestone reviews.',
      durationMinutes: 30,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      price: 90.00,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      isActive: true,
      staffAssignments: {
        create: [
          { staffId: staff1.id },
        ],
      },
    },
  });

  // 6. Create Public Booking Page
  await prisma.bookingPage.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'acme-advisory',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      slug: 'acme-advisory',
      title: 'Acme Advisory Online Booking',
      description: 'Book a high-impact strategy or review consultation with our senior advisory team.',
      isPublished: true,
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
