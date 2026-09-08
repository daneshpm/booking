import { prisma } from './client';

async function main() {
  console.log('🌱 Seeding Rooman Technologies development database...');

  // 1. Create or upsert Demo Users
  const demoUser = await prisma.user.upsert({
    where: { email: 'danesh@rooman.com' },
    update: {},
    create: {
      email: 'danesh@rooman.com',
      name: 'Danesh (Rooman Admin)',
      passwordHash: '$2a$12$eX4mpleHashedPasswordForDevelopmentOnly1234567890',
    },
  });

  const legacyUser = await prisma.user.upsert({
    where: { email: 'owner@acmeconsulting.com' },
    update: {},
    create: {
      email: 'owner@acmeconsulting.com',
      name: 'Rooman Admin',
      passwordHash: '$2a$12$eX4mpleHashedPasswordForDevelopmentOnly1234567890',
    },
  });

  // 2. Create or upsert Rooman Technologies Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'rooman-technologies' },
    update: {
      name: 'Rooman Technologies',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
    create: {
      name: 'Rooman Technologies',
      slug: 'rooman-technologies',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      members: {
        create: [
          { userId: demoUser.id, role: 'OWNER' },
          { userId: legacyUser.id, role: 'ADMIN' },
        ],
      },
    },
  });

  // Also maintain acme-consulting alias workspace for legacy compatibility
  await prisma.workspace.upsert({
    where: { slug: 'acme-consulting' },
    update: {},
    create: {
      name: 'Rooman Advisory & Skilling',
      slug: 'acme-consulting',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      members: {
        create: {
          userId: demoUser.id,
          role: 'OWNER',
        },
      },
    },
  });

  // 3. Create Service Categories for Rooman
  const catSkilling = await prisma.serviceCategory.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: 'Career Mentorship & Skilling',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Career Mentorship & Skilling',
    },
  });

  const catEnterprise = await prisma.serviceCategory.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: 'Enterprise & Academic Partnerships',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Enterprise & Academic Partnerships',
    },
  });

  // 4. Create Rooman Staff Members
  const staff1 = await prisma.staff.upsert({
    where: {
      workspaceId_email: {
        workspaceId: workspace.id,
        email: 'manish.k@rooman.com',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: demoUser.id,
      name: 'Dr. Manish K. (Academic & CoE Director)',
      email: 'manish.k@rooman.com',
      timezone: 'Asia/Kolkata',
      isActive: true,
      workingHours: {
        create: [
          // Mon-Fri: 09:30 - 18:30 with 13:30 - 14:30 Lunch Break
          ...[1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            startTime: '09:30',
            endTime: '18:30',
            breaks: {
              create: [
                {
                  startTime: '13:30',
                  endTime: '14:30',
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
        email: 'priya.sharma@rooman.com',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Priya Sharma (Principal AI & Cloud Architect)',
      email: 'priya.sharma@rooman.com',
      timezone: 'Asia/Kolkata',
      isActive: true,
      workingHours: {
        create: [
          // Mon-Sat: 10:00 - 19:00
          ...[1, 2, 3, 4, 5, 6].map((day) => ({
            dayOfWeek: day,
            startTime: '10:00',
            endTime: '19:00',
          })),
        ],
      },
    },
  });

  const staff3 = await prisma.staff.upsert({
    where: {
      workspaceId_email: {
        workspaceId: workspace.id,
        email: 'rohan.verma@rooman.com',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Rohan Verma (Cybersecurity & Cisco Specialist)',
      email: 'rohan.verma@rooman.com',
      timezone: 'Asia/Kolkata',
      isActive: true,
      workingHours: {
        create: [
          // Mon-Fri: 10:00 - 18:00
          ...[1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            startTime: '10:00',
            endTime: '18:00',
          })),
        ],
      },
    },
  });

  // 5. Create Rooman Services
  const service1 = await prisma.service.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'career-guidance',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      categoryId: catSkilling.id,
      name: '1-on-1 IT Career & Certification Guidance',
      slug: 'career-guidance',
      description: 'Free 30-minute career roadmapping with Rooman senior advisors. Get tailored advice on AI/ML, Cloud Computing, Cybersecurity, and Cisco networking certifications.',
      durationMinutes: 30,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
      price: 0,
      currency: 'INR',
      locationType: 'ONLINE_MEETING',
      locationDetails: 'Google Meet link provided upon booking confirmation',
      isActive: true,
      staffAssignments: {
        create: [
          { staffId: staff1.id },
          { staffId: staff2.id },
          { staffId: staff3.id },
        ],
      },
    },
  });

  const service2 = await prisma.service.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'mock-interview-assessment',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      categoryId: catSkilling.id,
      name: 'Technical Mock Interview & Skill Assessment',
      slug: 'mock-interview-assessment',
      description: 'Comprehensive 45-minute technical mock interview assessing coding, cloud architecture, or networking skills with actionable scorecard and feedback.',
      durationMinutes: 45,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
      price: 499.00,
      currency: 'INR',
      locationType: 'ONLINE_MEETING',
      locationDetails: 'Google Meet video session with screen-share coding pad',
      isActive: true,
      staffAssignments: {
        create: [
          { staffId: staff2.id },
          { staffId: staff3.id },
        ],
      },
    },
  });

  const service3 = await prisma.service.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'university-coe-consultation',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      categoryId: catEnterprise.id,
      name: 'University Center of Excellence (CoE) Consultation',
      slug: 'university-coe-consultation',
      description: 'Strategic 60-minute partnership discovery for university deans, college trustees, and directors to establish on-campus Rooman Centers of Excellence.',
      durationMinutes: 60,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 20,
      price: 0,
      currency: 'INR',
      locationType: 'ONLINE_MEETING',
      locationDetails: 'Executive Google Meet briefing room',
      isActive: true,
      staffAssignments: {
        create: [
          { staffId: staff1.id },
        ],
      },
    },
  });

  const service4 = await prisma.service.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'corporate-upskilling-discovery',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      categoryId: catEnterprise.id,
      name: 'Corporate Workforce Upskilling Consultation',
      slug: 'corporate-upskilling-discovery',
      description: '45-minute enterprise consultation to design customized upskilling and reskilling cohorts in Generative AI, Cloud DevOps, and Cyber Defense for corporate teams.',
      durationMinutes: 45,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      price: 0,
      currency: 'INR',
      locationType: 'ONLINE_MEETING',
      locationDetails: 'Google Meet conference room',
      isActive: true,
      staffAssignments: {
        create: [
          { staffId: staff1.id },
          { staffId: staff2.id },
        ],
      },
    },
  });

  // 6. Create Rooman Public Booking Page
  await prisma.bookingPage.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'rooman-booking',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      slug: 'rooman-booking',
      title: 'Rooman Technologies Official Booking Portal',
      description: 'Book your career counseling, mock interview, university CoE partnership, or corporate training consultation with Rooman experts.',
      isPublished: true,
    },
  });

  console.log('✅ Rooman Technologies seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
