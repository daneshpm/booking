/**
 * Client and Server SDK for FastAPI Python Backend
 * Multi-tenant appointment scheduling & authentication for Rooman Bookings
 */

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
}

export interface WorkspaceProfile {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
  workspace?: WorkspaceProfile;
}

export interface ServiceDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  price: number;
  currency: string;
  locationType: string;
  locationDetails?: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  displayTime: string;
  available: boolean;
  staffId?: string;
  staffName?: string;
}

export interface AvailabilityResponse {
  date: string;
  timezone: string;
  slots: AvailabilitySlot[];
}

export interface CreateBookingRequest {
  workspaceSlug: string;
  serviceSlug: string;
  staffId?: string;
  startTime: string; // ISO 8601 string
  endTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerTimezone?: string;
  notes?: string;
}

export interface BookingConfirmation {
  id: string;
  status: string;
  serviceName: string;
  staffName: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerEmail: string;
  meetingLink?: string;
  message: string;
}

/**
 * Register a user via Python FastAPI backend
 */
export async function pythonRegister(payload: {
  email: string;
  password?: string;
  name: string;
  workspaceName?: string;
  workspaceSlug?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${PYTHON_API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password || 'password123',
      name: payload.name,
      workspaceName: payload.workspaceName || 'Rooman Technologies',
      workspaceSlug: payload.workspaceSlug,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Registration failed');
  }

  return res.json();
}

/**
 * Log in a user via Python FastAPI backend
 */
export async function pythonLogin(email: string, password = 'password123'): Promise<AuthResponse> {
  const res = await fetch(`${PYTHON_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Invalid email or password');
  }

  return res.json();
}

/**
 * Fetch active services from Python FastAPI backend
 */
export async function pythonGetServices(
  workspaceSlug = 'rooman-technologies'
): Promise<ServiceDTO[]> {
  const res = await fetch(
    `${PYTHON_API_URL}/api/services?workspaceSlug=${encodeURIComponent(workspaceSlug)}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    throw new Error('Failed to retrieve services');
  }

  return res.json();
}

/**
 * Fetch open availability slots from Python FastAPI backend
 */
export async function pythonGetAvailability(
  workspaceSlug: string,
  serviceSlug: string,
  date: string,
  timezone = 'Asia/Kolkata'
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({
    workspaceSlug,
    serviceSlug,
    date,
    timezone,
  });

  const res = await fetch(`${PYTHON_API_URL}/api/availability?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve availability');
  }

  return res.json();
}

/**
 * Create a new appointment via Python FastAPI backend with PostgreSQL collision checks
 */
export async function pythonCreateBooking(
  booking: CreateBookingRequest
): Promise<BookingConfirmation> {
  const res = await fetch(`${PYTHON_API_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to confirm booking');
  }

  return res.json();
}
