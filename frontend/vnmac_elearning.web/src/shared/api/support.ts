import { apiRequest } from "./client";
import type { SupportInfo, SupportTicket, SupportTicketCategory, SupportTicketList, SupportTicketStatus } from "../types/api";

export function getSupportInfo() {
  return apiRequest<SupportInfo>("/api/support/info", { auth: false });
}

export function createSupportTicket(payload: { subject: string; category: SupportTicketCategory; description: string; attachment?: File }) {
  const form = new FormData();
  form.set("subject", payload.subject);
  form.set("category", payload.category);
  form.set("description", payload.description);
  if (payload.attachment) form.set("attachment", payload.attachment);
  return apiRequest<SupportTicket>("/api/support", { method: "POST", body: form });
}

export function getMySupportTickets() {
  return apiRequest<SupportTicket[]>("/api/support/mine");
}

export function getAdminSupportTickets(filters: { search?: string; status?: string; category?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "all" && value !== "") params.set(key, String(value)); });
  return apiRequest<SupportTicketList>(`/api/support/admin?${params}`);
}

export function updateSupportTicket(id: string, payload: { status: SupportTicketStatus; assignedUserId?: string; adminResponse?: string }) {
  return apiRequest<SupportTicket>(`/api/support/admin/${id}`, { method: "PUT", body: payload });
}
