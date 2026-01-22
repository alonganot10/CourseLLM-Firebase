import ClientOnly from '@/components/ClientOnly';
import RoleGuardClient from '@/components/RoleGuardClient';
import InnerAppShellClient from '@/components/InnerAppShellClient';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RoleGuardClient is client; InnerAppShellClient renders AppShell using profile
  return (
    <ClientOnly>
      <RoleGuardClient requiredRole="student">
        <InnerAppShellClient role="student">
          {children}
        </InnerAppShellClient>
      </RoleGuardClient>
    </ClientOnly>
  );
}
