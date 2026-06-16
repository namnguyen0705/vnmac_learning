import { apiRequest, resolveApiUrl } from "./client";
import type { NotificationListResponse } from "../types/api";

export function getMyNotifications() {
  return apiRequest<NotificationListResponse>("/api/notifications/me");
}

export function markNotificationAsRead(notificationId: string) {
  return apiRequest<NotificationListResponse>(`/api/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

export function markAllNotificationsAsRead() {
  return apiRequest<NotificationListResponse>("/api/notifications/read-all", {
    method: "POST",
  });
}

export function getNotificationStreamUrl(accessToken: string) {
  return resolveApiUrl(`/api/notifications/stream?access_token=${encodeURIComponent(accessToken)}`);
}
