import ClientOnly from '@/components/ClientOnly';
import RoleGuardClient from '@/components/RoleGuardClient';
import InnerAppShellClient from '@/components/InnerAppShellClient';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <RoleGuardClient requiredRole="teacher">
        <InnerAppShellClient role="teacher">
          {children}
        </InnerAppShellClient>
      </RoleGuardClient>
    </ClientOnly>
  );
}
