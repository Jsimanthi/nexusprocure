import { DashboardStats } from "@/types/dashboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Pusher from "pusher-js";
import { useEffect } from "react";
import { useUser } from "./useUser";

const fetchDashboardData = async (): Promise<DashboardStats> => {
    const response = await fetch("/api/dashboard");
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch dashboard data");
    }
    return response.json();
};

export function useDashboardData() {
    const { isAuthenticated } = useUser();
    const queryClient = useQueryClient();

    const query = useQuery<DashboardStats>({
        queryKey: ["dashboardData"],
        queryFn: fetchDashboardData,
        enabled: isAuthenticated,
    });

    useEffect(() => {
        if (
            process.env.NEXT_PUBLIC_PUSHER_KEY &&
            process.env.NEXT_PUBLIC_PUSHER_KEY !== "placeholder"
        ) {
            const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            });

            const channel = pusher.subscribe("dashboard-channel");

            channel.bind("dashboard-update", () => {
                queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
            });

            return () => {
                pusher.unsubscribe("dashboard-channel");
            };
        }
    }, [queryClient]);

    return query;
}
