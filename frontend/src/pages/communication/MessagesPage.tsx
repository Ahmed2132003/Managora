import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";

import { endpoints } from "../../shared/api/endpoints";
import { http } from "../../shared/api/http";
import { useMe } from "../../shared/auth/useMe";
import {
  registerPushSubscription,
  useChatConversations,
  useChatMessages,
  useMarkNotificationRead,
  useNotifications,
  useSendMessage,
  type ChatMessage,
} from "../../shared/messaging/hooks";
import { DashboardShell } from "../DashboardShell";
import "./MessagesPage.css";

type Language = "en" | "ar";
type UserOption = { id: number; username: string };

const shellCopy: Record<Language, { title: string; subtitle: string; helper: string; tags: string[] }> = {
  en: {
    title: "Internal messaging",
    subtitle: "WhatsApp-style company chat with a built-in notification center.",
    helper: "Conversations and notifications refresh live without page reload.",
    tags: ["Chat", "Notifications", "Realtime"],
  },
  ar: {
    title: "الرسائل الداخلية",
    subtitle: "شات داخلي بنفس أسلوب واتساب مع مركز إشعارات متكامل.",
    helper: "المحادثات والإشعارات تتحدث بشكل مباشر بدون إعادة تحميل.",
    tags: ["شات", "إشعارات", "مباشر"],
  },
};

const pageCopy = {
  en: {
    conversations: "Chats",
    notifications: "Notification center",
    unread: "Unread",
    loading: "Loading...",
    emptyConversations: "No conversations yet.",
    emptyMessages: "No messages yet. Start the conversation.",
    recipient: "Recipient",
    recipientPlaceholder: "Select teammate",
    messagePlaceholder: "Type a message",
    attachFile: "Attach files",
    send: "Send",
    enablePush: "Enable browser push",
    pushEnabled: "Push notifications enabled.",
    pushMissingKey: "Push key is not configured (VITE_WEB_PUSH_PUBLIC_KEY). Add it to frontend/.env then restart Vite.",
    pushDenied: "Browser notification permission was denied.",
    pushUnsupported: "Push notifications are not supported in this browser.",
    pushGenericError: "Could not enable browser push notifications.",
    pickedFiles: "Selected files",
  },
  ar: {
    conversations: "المحادثات",
    notifications: "مركز الإشعارات",
    unread: "غير مقروء",
    loading: "جارٍ التحميل...",
    emptyConversations: "لا توجد محادثات بعد.",
    emptyMessages: "لا توجد رسائل بعد. ابدأ المحادثة الآن.",
    recipient: "المستلم",
    recipientPlaceholder: "اختر الزميل",
    messagePlaceholder: "اكتب رسالة",
    attachFile: "إرفاق ملفات",
    send: "إرسال",
    enablePush: "تفعيل إشعارات المتصفح",
    pushEnabled: "تم تفعيل إشعارات المتصفح بنجاح.",
    pushMissingKey: "مفتاح Push غير مضبوط (VITE_WEB_PUSH_PUBLIC_KEY). أضِفه داخل frontend/.env ثم أعد تشغيل Vite.",
    pushDenied: "تم رفض إذن الإشعارات من المتصفح.",
    pushUnsupported: "المتصفح الحالي لا يدعم إشعارات Push.",
    pushGenericError: "تعذر تفعيل إشعارات Push في المتصفح.",
    pickedFiles: "الملفات المحددة",
  },
} as const;

export function MessagesPage() {
  const [manuallySelectedConversationId, setManuallySelectedConversationId] = useState<number | null>(null);
  const [recipientId, setRecipientId] = useState<number | "">("");
  const [messageBody, setMessageBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const meQuery = useMe();
  const conversationsQuery = useChatConversations();
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const sendMessageMutation = useSendMessage();

  const selectedConversationId = manuallySelectedConversationId ?? conversationsQuery.data?.[0]?.id ?? null;

  const selectedConversation = useMemo(
    () => conversationsQuery.data?.find((item) => item.id === selectedConversationId) ?? null,
    [conversationsQuery.data, selectedConversationId]
  );

  const initialMessagesQuery = useChatMessages(selectedConversationId, null);
  const lastInitialMessageId = initialMessagesQuery.data?.[initialMessagesQuery.data.length - 1]?.id ?? null;
  const incrementalMessagesQuery = useChatMessages(selectedConversationId, lastInitialMessageId);

  const messages = useMemo(() => {
    const seen = new Set<number>();
    const next: ChatMessage[] = [];
    for (const item of initialMessagesQuery.data ?? []) {
      seen.add(item.id);
      next.push(item);
    }
    for (const item of incrementalMessagesQuery.data ?? []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        next.push(item);
      }
    }
    return next;
  }, [incrementalMessagesQuery.data, initialMessagesQuery.data]);

  const usersQuery = useQuery({
    queryKey: ["messaging", "users"],
    queryFn: async () => {
      const response = await http.get(endpoints.users, { params: { page_size: 200 } });
      const raw = response.data as { results?: UserOption[] } | UserOption[];
      return Array.isArray(raw) ? raw : raw.results ?? [];
    },
  });

  async function handleSend() {
    if (!recipientId || (!messageBody.trim() && files.length === 0)) return;

    await sendMessageMutation.mutateAsync({
      recipient_id: Number(recipientId),
      body: messageBody.trim(),
      attachments: files,
    });

    setMessageBody("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleEnablePush(language: Language) {
    const result = await registerPushSubscription(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined);
    if (result.ok) return notifications.show({ message: pageCopy[language].pushEnabled, color: "green" });
    if (result.reason === "missing_vapid") return notifications.show({ message: pageCopy[language].pushMissingKey, color: "yellow" });
    if (result.reason === "denied") return notifications.show({ message: pageCopy[language].pushDenied, color: "yellow" });
    if (result.reason === "unsupported") return notifications.show({ message: pageCopy[language].pushUnsupported, color: "yellow" });
    notifications.show({ message: pageCopy[language].pushGenericError, color: "red" });
  }

  return (
    <DashboardShell copy={shellCopy} className="messages-page">
      {({ language, isArabic }) => {
        const copy = pageCopy[language as Language];
        const unreadCount = (notificationsQuery.data ?? []).filter((item) => !item.is_read).length;
        const users = (usersQuery.data ?? []).filter((user) => user.id !== meQuery.data?.user.id);

        return (
          <div className="messages-grid">
            <section className="panel panel--compact conversations-panel">
              <div className="panel__header">
                <h2>{copy.conversations}</h2>
                <span className="pill">{conversationsQuery.data?.length ?? 0}</span>
              </div>
              {conversationsQuery.isLoading ? (
                <p className="helper-text">{copy.loading}</p>
              ) : (conversationsQuery.data?.length ?? 0) === 0 ? (
                <p className="helper-text">{copy.emptyConversations}</p>
              ) : (
                <div className="messages-list">
                  {(conversationsQuery.data ?? []).map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`message-item ${selectedConversationId === conversation.id ? "message-item--active" : ""}`}
                      onClick={() => {
                        setManuallySelectedConversationId(conversation.id);
                        setRecipientId(conversation.other_user_id);
                      }}
                    >
                      <strong>{conversation.other_user_name}</strong>
                      <span>{conversation.last_message?.body || "📎"}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="panel chat-panel">
              <div className="panel__header">
                <h2>{selectedConversation?.other_user_name ?? copy.conversations}</h2>
                <button type="button" className="table-action" onClick={() => void handleEnablePush(language as Language)}>
                  {copy.enablePush}
                </button>
              </div>

              <div className="messages-chat-body">
                {(initialMessagesQuery.isLoading || incrementalMessagesQuery.isLoading) && messages.length === 0 ? (
                  <p className="helper-text">{copy.loading}</p>
                ) : messages.length === 0 ? (
                  <p className="helper-text">{copy.emptyMessages}</p>
                ) : (
                  messages.map((message) => {
                    const mine = message.sender === meQuery.data?.user.id;
                    return (
                      <div key={message.id} className={`bubble ${mine ? "bubble--mine" : "bubble--other"}`}>
                        {message.body ? <span>{message.body}</span> : null}
                        {message.attachments.length > 0 ? (
                          <div className="bubble-attachments">
                            {message.attachments.map((attachment) => (
                              <a key={attachment.id} href={attachment.file_url || attachment.file} target="_blank" rel="noreferrer">
                                📎 {attachment.original_name}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <small>{new Date(message.created_at).toLocaleTimeString()}</small>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="messages-compose">
                <label className="field">
                  <span>{copy.recipient}</span>
                  <select
                    value={recipientId}
                    onChange={(event) => setRecipientId(event.target.value ? Number(event.target.value) : "")}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    <option value="">{copy.recipientPlaceholder}</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea value={messageBody} placeholder={copy.messagePlaceholder} onChange={(event) => setMessageBody(event.target.value)} />
                <div className="compose-actions">
                  <label className="table-action table-action--ghost file-label" htmlFor="chat-files">
                    {copy.attachFile}
                  </label>
                  <input
                    id="chat-files"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                  />
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() => void handleSend()}
                    disabled={sendMessageMutation.isPending || !recipientId || (!messageBody.trim() && files.length === 0)}
                  >
                    {copy.send}
                  </button>
                </div>
                {files.length > 0 ? (
                  <p className="helper-text">
                    {copy.pickedFiles}: {files.map((file) => file.name).join(", ")}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="panel panel--compact notifications-panel">
              <div className="panel__header">
                <h2>{copy.notifications}</h2>
                <span className="pill">{copy.unread}: {unreadCount}</span>
              </div>
              {notificationsQuery.isLoading ? (
                <p className="helper-text">{copy.loading}</p>
              ) : (
                <div className="messages-list">
                  {(notificationsQuery.data ?? []).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`message-item ${item.is_read ? "" : "message-item--unread"}`}
                      onClick={() => markReadMutation.mutate(item.id)}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        );
      }}
    </DashboardShell>
  );
}