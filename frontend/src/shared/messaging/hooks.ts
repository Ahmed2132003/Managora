import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type ChatMessageAttachment = {
  id: number;
  file: string;
  file_url: string;
  original_name: string;
  file_size: number;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  conversation: number;
  sender: number;
  sender_name: string;
  recipient: number | null;
  group: number | null;
  body: string;
  is_read: boolean;
  created_at: string;
  attachments: ChatMessageAttachment[];
};

export type ChatConversation = {
  id: number;
  type: "direct" | "group";
  other_user_id: number | null;
  other_user_name: string | null;
  group_id: number | null;
  group_name: string | null;
  updated_at: string;
  last_message: ChatMessage | null;
};

export type ChatGroupMember = {
  id: number;
  user: number;
  user_name: string;
  is_admin: boolean;
  created_at: string;
};

export type ChatGroup = {
  id: number;
  name: string;
  description: string;
  is_private: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  members: ChatGroupMember[];
};

export type InAppNotification = {
  id: number;
  title: string;
  body: string;
  sender: number | null;
  sender_name: string | null;
  message: number | null;
  is_read: boolean;
  created_at: string;
};

export function useChatConversations() {
  return useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: async () => {
      const response = await http.get<ChatConversation[]>(endpoints.messaging.conversations);
      return response.data;
    },
    refetchInterval: 2500,
  });
}

export function useChatGroups() {
  return useQuery({
    queryKey: ["chat", "groups"],
    queryFn: async () => {
      const response = await http.get<ChatGroup[]>(endpoints.messaging.groups);
      return response.data;
    },
    refetchInterval: 5000,
  });
}

export function useCreateChatGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; is_private?: boolean; member_ids?: number[] }) => {
      const response = await http.post<ChatGroup>(endpoints.messaging.groups, payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
  });
}

export function useUpdateChatGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { groupId: number; name?: string; description?: string; is_private?: boolean }) => {
      const response = await http.patch<ChatGroup>(endpoints.messaging.group(payload.groupId), payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
  });
}

export function useUpsertGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { groupId: number; user_id: number; is_admin?: boolean }) => {
      await http.post(endpoints.messaging.groupMembers(payload.groupId), {
        user_id: payload.user_id,
        is_admin: payload.is_admin ?? false,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
    },
  });
}

export function useChatMessages(conversationId: number | null, afterId?: number | null) {
  return useQuery({
    queryKey: ["chat", "messages", conversationId, afterId ?? null],
    queryFn: async () => {
      if (!conversationId) {
        return [] as ChatMessage[];
      }
      const response = await http.get<ChatMessage[]>(
        endpoints.messaging.conversationMessages(conversationId),
        {
          params: afterId ? { after_id: afterId } : {},
        }
      );
      return response.data;
    },
    enabled: Boolean(conversationId),
    refetchInterval: 1500,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { recipient_id?: number; group_id?: number; body: string; attachments?: File[] }) => {
      const formData = new FormData();
      if (payload.recipient_id) {
        formData.append("recipient_id", String(payload.recipient_id));
      }
      if (payload.group_id) {
        formData.append("group_id", String(payload.group_id));
      }
      formData.append("body", payload.body);
      for (const file of payload.attachments ?? []) {
        formData.append("attachments", file);
      }
      const response = await http.post<ChatMessage>(endpoints.messaging.sendMessage, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await http.get<InAppNotification[]>(endpoints.messaging.notifications);
      return response.data;
    },
    refetchInterval: 2000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: number) => {
      await http.post(endpoints.messaging.markNotificationRead(notificationId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export async function registerPushSubscription(vapidPublicKey?: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" } as const;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "denied" } as const;
  }

  if (!vapidPublicKey) {
    return { ok: false, reason: "missing_vapid" } as const;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const subscriptionJson = subscription.toJSON();
  if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
    return { ok: false, reason: "invalid_subscription" } as const;
  }

  await http.post(endpoints.messaging.pushSubscriptions, {
    endpoint: subscriptionJson.endpoint,
    p256dh: subscriptionJson.keys.p256dh,
    auth: subscriptionJson.keys.auth,
    user_agent: navigator.userAgent,
  });

  return { ok: true } as const;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}