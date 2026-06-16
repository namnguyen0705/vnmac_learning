import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getMyNotifications,
  getNotificationStreamUrl,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/notifications";
import { formatDateTime } from "../lib/format";
import { useAuthStore } from "../stores/auth-store";
import type { NotificationResponse } from "../types/api";

const notificationQueryKey = ["notifications", "me"] as const;

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<NotificationResponse | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const accessToken = useAuthStore((state) => state.session?.tokens.accessToken ?? null);

  const query = useQuery({
    queryKey: notificationQueryKey,
    queryFn: getMyNotifications,
  });

  const markOneMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (data) => queryClient.setQueryData(notificationQueryKey, data),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: (data) => queryClient.setQueryData(notificationQueryKey, data),
  });

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const eventSource = new EventSource(getNotificationStreamUrl(accessToken));
    const handleChanged = () => {
      window.setTimeout(() => {
        void queryClient.fetchQuery({
          queryKey: notificationQueryKey,
          queryFn: getMyNotifications,
        }).then((data) => {
          const newestUnread = data.items.find((item) => !item.isRead);
          if (newestUnread) {
            setToast(newestUnread);
          }
        });
      }, 250);
    };

    eventSource.addEventListener("notifications.changed", handleChanged);

    return () => {
      eventSource.removeEventListener("notifications.changed", handleChanged);
      eventSource.close();
    };
  }, [accessToken, queryClient]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const unreadCount = query.data?.unreadCount ?? 0;
  const items = query.data?.items ?? [];

  useEffect(() => {
    updateBrowserTabBadge(unreadCount > 0);
  }, [unreadCount]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        className={cn(
          "relative grid place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-[#163b7b]/35 hover:text-slate-950",
          compact ? "size-9 rounded-xl border-0 bg-transparent" : "size-10",
        )}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-950">Thông báo</p>
              <p className="text-sm text-slate-500">{unreadCount} thông báo chưa đọc</p>
            </div>
            <Button
              className="h-8 rounded-xl px-2 text-xs"
              type="button"
              variant="ghost"
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck className="size-4" />
              Đã đọc
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {query.isLoading ? (
              <div className="px-3 py-8 text-center text-sm text-slate-500">Đang tải thông báo...</div>
            ) : items.length ? (
              items.map((item) => (
                <NotificationItem
                  item={item}
                  key={item.id}
                  onOpen={() => {
                    if (!item.isRead) {
                      markOneMutation.mutate(item.id);
                    }
                    setIsOpen(false);
                  }}
                />
              ))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-slate-500">Chưa có thông báo.</div>
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[80] w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
          <button
            className="block w-full p-4 text-left"
            type="button"
            onClick={() => {
              if (!toast.isRead) {
                markOneMutation.mutate(toast.id);
              }
              if (toast.linkUrl) {
                navigate(toast.linkUrl);
              }
              setToast(null);
            }}
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf3ff] text-[#163b7b]">
                <Bell className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-950">{toast.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{toast.message}</p>
                <p className="mt-2 text-xs font-medium text-[#163b7b]">Bấm để xem chi tiết</p>
              </div>
            </div>
          </button>
          <button
            className="absolute right-2 top-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            type="button"
            onClick={() => setToast(null)}
          >
            Đóng
          </button>
        </div>
      ) : null}
    </div>
  );
}

function updateBrowserTabBadge(hasUnread: boolean) {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.fillStyle = "#0d2857";
  context.beginPath();
  context.roundRect(4, 4, 24, 24, 7);
  context.fill();

  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(10, 14);
  context.lineTo(16, 11);
  context.lineTo(22, 14);
  context.lineTo(16, 17);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.moveTo(12, 16);
  context.lineTo(12, 20);
  context.quadraticCurveTo(16, 23, 20, 20);
  context.lineTo(20, 16);
  context.stroke();

  if (hasUnread) {
    context.fillStyle = "#ef4444";
    context.beginPath();
    context.arc(24, 8, 6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.stroke();
  }

  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.type = "image/png";
  link.href = canvas.toDataURL("image/png");
}

function NotificationItem({ item, onOpen }: { item: NotificationResponse; onOpen: () => void }) {
  const content = (
    <div
      className={cn(
        "rounded-xl px-3 py-3 transition hover:bg-slate-50",
        !item.isRead && "bg-[#f2f7ff]",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-1 size-2 rounded-full", item.isRead ? "bg-slate-300" : "bg-[#163b7b]")} />
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{item.message}</p>
          <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
        </div>
      </div>
    </div>
  );

  if (item.linkUrl) {
    return (
      <Link to={item.linkUrl} onClick={onOpen}>
        {content}
      </Link>
    );
  }

  return (
    <button className="block w-full text-left" type="button" onClick={onOpen}>
      {content}
    </button>
  );
}
