import { loadEnvFile } from '../packages/database/src/load-env';
loadEnvFile('.env');
import { prisma } from '../packages/database/src/client';

async function seedServices() {
  const ws = await prisma.workspace.findFirst({ where: { slug: 'rooman-technologies' } });
  if (!ws) {
    console.error('Workspace rooman-technologies not found');
    return;
  }

  const staff = await prisma.staff.findFirst({ where: { workspaceId: ws.id } });
  if (!staff) {
    console.error('Staff not found');
    return;
  }

  // Upsert Tech Consultation & Strategy with Dynamic Off-Peak Yield Pricing
  const s1 = await prisma.service.upsert({
    where: { workspaceId_slug: { workspaceId: ws.id, slug: 'tech-consultation' } },
    update: {
      hasYieldPricing: true,
      yieldDiscountPercent: 20,
      yieldDays: '1,2,3,4,5',
      yieldStartTime: '11:00',
      yieldEndTime: '15:00',
      yieldLabel: 'Off-Peak Happy Hour',
    },
    create: {
      workspaceId: ws.id,
      name: 'Tech Consultation & Strategy',
      slug: 'tech-consultation',
      description:
        'Strategic technical advisory session with architecture review and roadmap planning.',
      durationMinutes: 45,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      price: 150.0,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      hasYieldPricing: true,
      yieldDiscountPercent: 20,
      yieldDays: '1,2,3,4,5',
      yieldStartTime: '11:00',
      yieldEndTime: '15:00',
      yieldLabel: 'Off-Peak Happy Hour',
    },
  });

  // Assign staff
  await prisma.serviceStaff.upsert({
    where: { serviceId_staffId: { serviceId: s1.id, staffId: staff.id } },
    update: {},
    create: { serviceId: s1.id, staffId: staff.id },
  });

  // Service 2: Quick Advisory
  const s2 = await prisma.service.upsert({
    where: { workspaceId_slug: { workspaceId: ws.id, slug: 'quick-advisory' } },
    update: {},
    create: {
      workspaceId: ws.id,
      name: 'Quick 15-Min Standup Advisory',
      slug: 'quick-advisory',
      description: 'Rapid question and triage session for urgent engineering queries.',
      durationMinutes: 15,
      price: 50.0,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
    },
  });

  await prisma.serviceStaff.upsert({
    where: { serviceId_staffId: { serviceId: s2.id, staffId: staff.id } },
    update: {},
    create: { serviceId: s2.id, staffId: staff.id },
  });

  console.log('Successfully seeded services with Dynamic Off-Peak Yield Pricing enabled!');
}

seedServices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
