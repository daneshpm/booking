'use server';

import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { pythonLogin, pythonRegister } from '@/lib/python-api';

export interface SignupInput {
  name: string;
  email: string;
  password?: string;
  workspaceName: string;
}

export interface AuthResult {
  success: boolean;
  workspaceSlug?: string;
  error?: string;
}

export async function signupUserAction(data: SignupInput): Promise<AuthResult> {
  try {
    const { name, email, workspaceName } = data;

    if (!name || !email || !workspaceName) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanWorkspaceName = workspaceName.trim();
    let slug = cleanWorkspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) slug = 'workspace';

    // Ensure unique slug
    let finalSlug = slug;
    let counter = 1;
    while (await prisma.workspace.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    // 1. Upsert or create user
    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: { name },
      create: {
        email: cleanEmail,
        name,
        passwordHash: '$2a$12$eX4mpleHashedPasswordForDevelopmentOnly1234567890',
      },
    });

    // 2. Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: cleanWorkspaceName,
        slug: finalSlug,
        timezone: 'America/New_York',
        currency: 'USD',
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });

    // 3. Create default service category & services
    const category = await prisma.serviceCategory.create({
      data: {
        workspaceId: workspace.id,
        name: 'General Consultations',
      },
    });

    const service1 = await prisma.service.create({
      data: {
        workspaceId: workspace.id,
        categoryId: category.id,
        name: 'Consultation & Strategy',
        slug: 'consultation-strategy',
        description: 'Comprehensive 45-minute strategic consultation with our lead advisor.',
        durationMinutes: 45,
        bufferBeforeMinutes: 15,
        bufferAfterMinutes: 15,
        price: 85.0,
        currency: 'USD',
        locationType: 'ONLINE_MEETING',
        isActive: true,
      },
    });

    const service2 = await prisma.service.create({
      data: {
        workspaceId: workspace.id,
        categoryId: category.id,
        name: 'Quick Review',
        slug: 'quick-review',
        description: '30-minute rapid review session.',
        durationMinutes: 30,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 10,
        price: 50.0,
        currency: 'USD',
        locationType: 'ONLINE_MEETING',
        isActive: true,
      },
    });

    // 4. Create owner staff profile with working hours
    const staff = await prisma.staff.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        name,
        email: cleanEmail,
        timezone: 'America/New_York',
        isActive: true,
        workingHours: {
          create: [1, 2, 3, 4, 5].map((day) => ({
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
        },
        serviceAssignments: {
          create: [
            { serviceId: service1.id },
            { serviceId: service2.id },
          ],
        },
      },
    });

    // 5. Create default booking page
    await prisma.bookingPage.create({
      data: {
        workspaceId: workspace.id,
        slug: finalSlug,
        title: `${cleanWorkspaceName} Booking Portal`,
        description: `Schedule an appointment with ${cleanWorkspaceName}`,
        isPublished: true,
      },
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('active_workspace', finalSlug, { path: '/', httpOnly: false });
    cookieStore.set('user_name', name, { path: '/', httpOnly: false });
    cookieStore.set('user_email', cleanEmail, { path: '/', httpOnly: false });

    return {
      success: true,
      workspaceSlug: finalSlug,
    };
  } catch (err: any) {
    console.error('Error during signup:', err);
    return {
      success: false,
      error: err.message || 'Failed to create workspace.',
    };
  }
}

export async function loginUserAction(email: string): Promise<AuthResult> {
  try {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Authenticate with FastAPI Python backend
    try {
      const pyAuth = await pythonLogin(cleanEmail, 'password123');
      if (pyAuth && pyAuth.access_token) {
        const cookieStore = await cookies();
        cookieStore.set('auth_token', pyAuth.access_token, { path: '/', httpOnly: false });
        if (pyAuth.workspace) {
          cookieStore.set('active_workspace', pyAuth.workspace.slug, { path: '/', httpOnly: false });
        }
        cookieStore.set('user_name', pyAuth.user.name, { path: '/', httpOnly: false });
        cookieStore.set('user_email', cleanEmail, { path: '/', httpOnly: false });

        return {
          success: true,
          workspaceSlug: pyAuth.workspace?.slug || 'rooman',
        };
      }
    } catch (apiErr: any) {
      console.warn('Python auth API unavailable or credentials check failed:', apiErr.message);
    }

    // 2. Direct database lookup fallback
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      // If user doesn't exist, create a default workspace for them
      return await signupUserAction({
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        workspaceName: 'rooman',
      });
    }

    const workspace = user.memberships[0].workspace;
    const cookieStore = await cookies();
    cookieStore.set('active_workspace', workspace.slug, { path: '/', httpOnly: false });
    cookieStore.set('user_name', user.name, { path: '/', httpOnly: false });
    cookieStore.set('user_email', cleanEmail, { path: '/', httpOnly: false });

    return {
      success: true,
      workspaceSlug: workspace.slug,
    };
  } catch (err: any) {
    console.error('Error during login:', err);
    return {
      success: false,
      error: err.message || 'Failed to sign in.',
    };
  }
}
