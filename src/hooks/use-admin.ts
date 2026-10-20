'use client';

import { useMemoFirebase, useUser, useObject, useDatabase } from '@/firebase';
import { ref } from 'firebase/database';

export function useAdmin() {
  const { user, userProfile, isUserLoading, isProfileLoading } = useUser();
  const database = useDatabase();

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null;
    return ref(database, `roles_admin/${user.uid}`);
  }, [user, database]);

  const { data: adminRole, isLoading: isAdminRoleLoading } = useObject(adminRef);

  const roleStr = String(userProfile?.role || '').toLowerCase().trim();
  const isAdmin = !!adminRole || 
    (user?.email?.toLowerCase() === 'agus@umkm.id') || 
    roleStr === 'admin' || 
    roleStr === 'administrator' || 
    roleStr === 'superadmin';

  // Selesai memuat jika auth sudah selesai, dan jika user login, role database sudah selesai diambil
  const isAdminLoading = isUserLoading || (!!user && (isProfileLoading || isAdminRoleLoading));

  return {
    isAdmin,
    isAdminLoading,
    user,
    userProfile,
    role: userProfile?.role || (isAdmin ? 'admin' : undefined)
  };
}
