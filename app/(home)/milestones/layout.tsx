import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

export default function MilestonesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
