"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import io, { Socket } from "socket.io-client";
import { Notification as NotificationType } from "@prisma/client"; // Import the real type

// --- API Fetching Functions ---
const fetchNotifications = async () => {
  const response = await fetch("/api/notifications");
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
};

const markNotificationRead = async (notificationId: string) => {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: "PATCH",
  });
  if (!response.ok) throw new Error("Failed to mark notification as read");
  return response.json();
};

export default function Notifications() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // --- Data Fetching ---
  const { data: notifications = [] } = useQuery<NotificationType[]>({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: !!session?.user?.id, // Only fetch if user is logged in
  });

  // --- Real-time Socket Connection ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const socket: Socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("Socket connected on client:", socket.id);
      socket.emit("register", session.user.id);
    });

    socket.on("notification", (newNotification) => {
      console.log("New notification received:", newNotification);
      // Invalidate the query to refetch and show the new notification
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => {
      console.log("Disconnecting socket");
      socket.disconnect();
    };
  }, [session, queryClient]);

  // --- Mutations ---
  const mutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      // When a notification is marked as read, refetch the list
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleMarkAsRead = (id: string) => {
    mutation.mutate(id);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${notification.read ? 'bg-gray-50' : 'bg-white'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={mutation.isPending && mutation.variables === notification.id}
                        className="ml-2 p-1 text-gray-400 hover:text-green-600 disabled:opacity-50"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}