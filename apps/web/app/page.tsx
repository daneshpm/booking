import { ApexLandingPage } from './components/ApexLandingPage';

export const metadata = {
  title: 'ApexBookings | Enterprise Appointment Scheduling Platform',
  description:
    'Modern, multi-tenant appointment scheduling platform with pure availability calculations, buffer management, concurrency safety, and automated video meetings.',
};

export default function HomePage() {
  return <ApexLandingPage />;
}
