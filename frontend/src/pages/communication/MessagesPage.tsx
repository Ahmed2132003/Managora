import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";

import { endpoints } from "../../shared/api/endpoints";
import { http } from "../../shared/api/http";
import { useMe } from "../../shared/auth/useMe";
import {
  registerPushSubscription,
  useChatConversations,
  useChatGroups,
  useChatMessages,
  useCreateChatGroup,
  useMarkNotificationRead,
  useNotifications,
  useSendMessage,
  useUpdateChatGroup,
  useUpsertGroupMember,
  type ChatMessage,
} from "../../shared/messaging/hooks";
import { DashboardShell } from "../DashboardShell";
import "./MessagesPage.css";

type Language = "en" | "ar";
type UserOption = { id: number; username: string };

const pageCopy = {
  en: {
    conversations: "Chats",
    groups: "Groups",
    createGroup: "Create group",
    groupName: "Group name",
    groupPrivate: "Private group",
    notifications: "Notification center",
    unread: "Unread",
    loading: "Loading...",
    emptyConversations: "No conversations yet.",
    emptyMessages: "No messages yet. Start the conversation.",
    selectConversationHint: "Pick a conversation to start chatting.",
    recipient: "Recipient",
    recipientPlaceholder: "Select teammate",
    messagePlaceholder: "Type a message",
    attachFile: "Attach files",
    send: "Send",
    enablePush: "Enable browser push",
    pushEnabled: "Push notifications enabled.",
    pickedFiles: "Selected files",
    saveImage: "Save image",
    imagePreviewAlt: "Chat attachment",
    conversationUpdatedLabel: "Updated",
    addAsAdmin: "Add as admin",
    addMember: "Add member",
    makePrivate: "Make private",
    makePublic: "Make public",
  },
  ar: {
    conversations: "المحادثات",
    groups: "الجروبات",
    createGroup: "إنشاء جروب",
    groupName: "اسم الجروب",
    groupPrivate: "جروب خاص",
    notifications: "مركز الإشعارات",
    unread: "غير مقروء",
    loading: "جارٍ التحميل...",
    emptyConversations: "لا توجد محادثات بعد.",
    emptyMessages: "لا توجد رسائل بعد. ابدأ المحادثة الآن.",
    selectConversationHint: "اختر محادثة أولاً لبدء المراسلة.",
    recipient: "المستلم",
    recipientPlaceholder: "اختر الزميل",
    messagePlaceholder: "اكتب رسالة",
    attachFile: "إرفاق ملفات",
    send: "إرسال",
    enablePush: "تفعيل إشعارات المتصفح",
    pushEnabled: "تم تفعيل إشعارات المتصفح بنجاح.",
    pickedFiles: "الملفات المحددة",
    saveImage: "حفظ الصورة",
    imagePreviewAlt: "صورة مرفقة",
    conversationUpdatedLabel: "آخر تحديث",
    addAsAdmin: "إضافة كأدمن",
    addMember: "إضافة عضو",
    makePrivate: "تحويل لخاص",
    makePublic: "تحويل لعام",
  },
} as const;

const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif", "heic", "heif"]);
const roleNames = new Set(["manager", "admin"]);

function isImageAttachment(fileNameOrUrl: string) {
  const normalized = fileNameOrUrl.split("?")[0].toLowerCase();
  const extension = normalized.split(".").pop();
  return extension ? imageExtensions.has(extension) : false;
}

export function MessagesPage() {
  const [manuallySelectedConversationId, setManuallySelectedConversationId] = useState<number | null>(null);
  const [recipientId, setRecipientId] = useState<number | "">("");
  const [memberToAdd, setMemberToAdd] = useState<number | "">("");
  const [messageBody, setMessageBody] = useState("");
  const [groupName, setGroupName] = useState("");
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  const meQuery = useMe();
  const conversationsQuery = useChatConversations();
  const groupsQuery = useChatGroups();
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const sendMessageMutation = useSendMessage();
  const createGroupMutation = useCreateChatGroup();
  const addMemberMutation = useUpsertGroupMember();
  const updateGroupMutation = useUpdateChatGroup();

  const selectedConversation = useMemo(
    () => conversationsQuery.data?.find((item) => item.id === manuallySelectedConversationId) ?? null,
    [conversationsQuery.data, manuallySelectedConversationId]
  );
  const selectedGroup = useMemo(() => {
    if (!selectedConversation?.group_id) return null;
    return groupsQuery.data?.find((item) => item.id === selectedConversation.group_id) ?? null;
  }, [groupsQuery.data, selectedConversation?.group_id]);

  const initialMessagesQuery = useChatMessages(manuallySelectedConversationId, null);
  const lastInitialMessageId = initialMessagesQuery.data?.[initialMessagesQuery.data.length - 1]?.id ?? null;
  const incrementalMessagesQuery = useChatMessages(manuallySelectedConversationId, lastInitialMessageId);

  const messages = useMemo(() => {
    const seen = new Set<number>();
    const next: ChatMessage[] = [];
    for (const item of initialMessagesQuery.data ?? []) {
      seen.add(item.id);
      next.push(item);
    }
    for (const item of incrementalMessagesQuery.data ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      next.push(item);
    }
    return next;
  }, [incrementalMessagesQuery.data, initialMessagesQuery.data]);

  const language = (localStorage.getItem("language") as Language | null) ?? "en";
  const copy = pageCopy[language];

  const usersQuery = useQuery({
    queryKey: ["users", "light"],
    queryFn: async () => {
      const response = await http.get<{ id: number; username: string }[]>(endpoints.users);
      return response.data;
    },
  });

  const users = useMemo<UserOption[]>(() => {
    const me = meQuery.data?.user.id;
    return (usersQuery.data ?? []).filter((user) => user.id !== me);
  }, [usersQuery.data, meQuery.data?.user.id]);

  const unreadCount = useMemo(() => (notificationsQuery.data ?? []).filter((item) => !item.is_read).length, [notificationsQuery.data]);
  const isManager = useMemo(() => (meQuery.data?.roles ?? []).some((r) => roleNames.has(r.name.toLowerCase())), [meQuery.data?.roles]);
  const canManageGroup = Boolean(selectedGroup?.members.some((m) => m.user === meQuery.data?.user.id && m.is_admin)) || isManager;

  useEffect(() => {
    if (!manuallySelectedConversationId && conversationsQuery.data?.length) {
      setManuallySelectedConversationId(conversationsQuery.data[0].id);
    }
  }, [manuallySelectedConversationId, conversationsQuery.data]);

  useEffect(() => {
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleEnablePush = async () => {
    const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
    const result = await registerPushSubscription(vapidPublicKey);
    if (result.ok) notifications.show({ title: "Push", message: copy.pushEnabled });
  };

  const handleSend = async () => {
    if (!selectedConversation) return;
    await sendMessageMutation.mutateAsync({
      recipient_id: selectedConversation.type === "direct" ? (selectedConversation.other_user_id ?? undefined) : undefined,
      group_id: selectedConversation.type === "group" ? (selectedConversation.group_id ?? undefined) : undefined,
      body: messageBody.trim(),
      attachments: files,
    });
    setMessageBody("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    await createGroupMutation.mutateAsync({ name: groupName.trim(), is_private: newGroupPrivate, member_ids: recipientId ? [recipientId] : [] });
    setGroupName("");
    setNewGroupPrivate(false);
  };

  const shellCopy: Record<Language, { title: string; subtitle: string; helper: string; tags: string[] }> = {
    en: { title: "Internal messaging", subtitle: "", helper: "", tags: ["Chat", "Realtime"] },
    ar: { title: "الرسائل الداخلية", subtitle: "", helper: "", tags: ["شات", "مباشر"] },
  };

  return (
    <DashboardShell copy={shellCopy}>
      {() => (
        <>
          <div className="messages-grid">
            <section className="panel conversations-panel">
              <div className="panel__header"><h2>{copy.conversations}</h2></div>
              <div className="messages-list">
                {(conversationsQuery.data ?? []).map((conversation) => (
                  <button key={conversation.id} type="button" className={`message-item ${manuallySelectedConversationId === conversation.id ? "message-item--active" : ""}`} onClick={() => setManuallySelectedConversationId(conversation.id)}>
                    <strong>{conversation.type === "group" ? `# ${conversation.group_name}` : conversation.other_user_name}</strong>
                    <span>{copy.conversationUpdatedLabel}: {new Date(conversation.updated_at).toLocaleString()}</span>
                  </button>
                ))}
              </div>
              {isManager ? (
                <div className="messages-compose">
                  <input value={groupName} placeholder={copy.groupName} onChange={(e) => setGroupName(e.target.value)} />
                  <label><input type="checkbox" checked={newGroupPrivate} onChange={(e) => setNewGroupPrivate(e.target.checked)} /> {copy.groupPrivate}</label>
                  <button type="button" className="pill-button" onClick={() => void handleCreateGroup()}>{copy.createGroup}</button>
                </div>
              ) : null}
            </section>

            <section className="panel chat-panel">
              <div className="panel__header">
                <h2>{selectedConversation?.type === "group" ? selectedConversation.group_name : selectedConversation?.other_user_name ?? copy.conversations}</h2>
                <button type="button" className="table-action" onClick={() => void handleEnablePush()}>{copy.enablePush}</button>
              </div>

              <div ref={chatBodyRef} className="messages-chat-body">
                {!manuallySelectedConversationId ? <p className="helper-text">{copy.selectConversationHint}</p> : messages.map((message) => {
                  const mine = message.sender === meQuery.data?.user.id;
                  return (
                    <div key={message.id} className={`bubble ${mine ? "bubble--mine" : "bubble--other"}`}>
                      {!mine && selectedConversation?.type === "group" ? <strong>{message.sender_name}</strong> : null}
                      {message.body ? <span>{message.body}</span> : null}
                      {message.attachments.map((attachment) => {
                        const attachmentUrl = attachment.file_url || attachment.file;
                        const imageAttachment = isImageAttachment(attachment.original_name || attachmentUrl);
                        if (!imageAttachment) return <a key={attachment.id} href={attachmentUrl} target="_blank" rel="noreferrer">📎 {attachment.original_name}</a>;
                        return <button key={attachment.id} type="button" className="image-attachment" onClick={() => setEnlargedImage({ src: attachmentUrl, label: attachment.original_name || copy.imagePreviewAlt })}><img src={attachmentUrl} alt={attachment.original_name || copy.imagePreviewAlt} loading="lazy" /><span>{attachment.original_name}</span></button>;
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="messages-compose">
                {selectedConversation?.type === "direct" ? (
                  <label className="field">
                    <span>{copy.recipient}</span>
                    <select value={recipientId} onChange={(event) => setRecipientId(event.target.value ? Number(event.target.value) : "")}>
                      <option value="">{copy.recipientPlaceholder}</option>
                      {users.map((user) => (<option key={user.id} value={user.id}>{user.username}</option>))}
                    </select>
                  </label>
                ) : null}
                <textarea value={messageBody} placeholder={copy.messagePlaceholder} onChange={(event) => setMessageBody(event.target.value)} />
                <div className="compose-actions">
                  <label className="table-action table-action--ghost file-label" htmlFor="chat-files">{copy.attachFile}</label>
                  <input id="chat-files" ref={fileInputRef} type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
                  <button type="button" className="pill-button" onClick={() => void handleSend()} disabled={sendMessageMutation.isPending || (!messageBody.trim() && files.length === 0)}>{copy.send}</button>
                </div>
                {selectedGroup && canManageGroup ? (
                  <div className="compose-actions">
                    <select value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value ? Number(e.target.value) : "")}> 
                      <option value="">{copy.addMember}</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                    <button type="button" className="table-action" onClick={() => memberToAdd && addMemberMutation.mutate({ groupId: selectedGroup.id, user_id: memberToAdd })}>{copy.addMember}</button>
                    <button type="button" className="table-action" onClick={() => updateGroupMutation.mutate({ groupId: selectedGroup.id, is_private: !selectedGroup.is_private })}>{selectedGroup.is_private ? copy.makePublic : copy.makePrivate}</button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="panel panel--compact notifications-panel">
              <div className="panel__header"><h2>{copy.notifications}</h2><span className="pill">{copy.unread}: {unreadCount}</span></div>
              <div className="messages-list">
                {(notificationsQuery.data ?? []).map((item) => (
                  <button key={item.id} type="button" className={`message-item ${item.is_read ? "" : "message-item--unread"}`} onClick={() => markReadMutation.mutate(item.id)}>
                    <strong>{item.title}</strong><span>{item.body}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          {enlargedImage ? <div className="image-preview-overlay" role="dialog" aria-modal="true" onClick={() => setEnlargedImage(null)}><div className="image-preview" onClick={(event) => event.stopPropagation()}><img src={enlargedImage.src} alt={enlargedImage.label} /><div className="image-preview__actions"><a className="table-action" href={enlargedImage.src} download>{copy.saveImage}</a></div></div></div> : null}
        </>
      )}
    </DashboardShell>
  );
}