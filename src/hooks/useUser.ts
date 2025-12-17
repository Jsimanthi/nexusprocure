import { Permission, Role } from "@/types/auth";
import { useSession } from "next-auth/react";

export function useUser() {
    const { data: session, status } = useSession();
    const user = session?.user;
    const isLoading = status === "loading";

    const hasPermission = (permission: Permission) => {
        if (!user) return false;
        if (user.role?.name === Role.ADMINISTRATOR) return true;
        return user.permissions?.includes(permission) ?? false;
    };

    const hasRole = (role: Role) => {
        return user?.role?.name === role;
    };

    return {
        user,
        session,
        isLoading,
        isAuthenticated: status === "authenticated",
        hasPermission,
        hasRole,
    };
}
