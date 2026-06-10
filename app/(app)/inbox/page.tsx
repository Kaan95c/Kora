"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Send,
  X,
  ArrowRight,
} from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  STATUS_CONFIG,
  initials,
  fullName,
  type ContactStatus,
} from "@/lib/contacts";
import { dayGroupLabel, dayKey, timeLabel, conversationDate } from "@/lib/messages";

// ───────────────────────── Types ─────────────────────────

type Direction = "OUTBOUND" | "INBOUND";

type Conversation = {
  contactId: string;
  contact: { firstName: string; lastName: string; status: ContactStatus } | null;
  lastMessage: {
    subject: string | null;
    body: string;
    direction: Direction;
    createdAt: string;
  };
  unreadCount: number;
};

type Message = {
  id: string;
  subject: string | null;
  body: string;
  direction: Direction;
  status: string;
  createdAt: string;
};

type Detail = {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    status: ContactStatus;
    email: string;
  };
  messages: Message[];
};

type ContactOption = { id: string; label: string; status: ContactStatus };

type Filter = "ALL" | "UNREAD" | "SENT";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
  { label: "Sent", value: "SENT" },
];

// ───────────────────────── Avatar ─────────────────────────

function Avatar({
  firstName,
  lastName,
  status,
  size = 40,
}: {
  firstName: string;
  lastName: string;
  status: ContactStatus;
  size?: number;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="font-inter flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: cfg.avatarBg,
        color: cfg.avatarText,
        fontSize: size <= 40 ? 13 : 15,
      }}
    >
      {initials(firstName, lastName)}
    </span>
  );
}

// ───────────────────────── Bulle message ─────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const out = message.direction === "OUTBOUND";
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[70%]">
        <div
          className={`px-4 py-3 text-sm ${
            out
              ? "bg-[#52634c] text-white"
              : "border border-[#c4c8be] bg-white text-[#1b1c1a]"
          }`}
          style={{
            borderRadius: out ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          }}
        >
          {message.subject && (
            <p
              className={`font-manrope mb-1 text-sm font-semibold ${
                out ? "text-white" : "text-[#1b1c1a]"
              }`}
            >
              {message.subject}
            </p>
          )}
          <p className="font-manrope whitespace-pre-wrap leading-relaxed">
            {message.body}
          </p>
        </div>
        <p
          className={`font-inter mt-1 text-[11px] ${
            out ? "text-right text-[#444841]" : "text-left text-[#444841]"
          }`}
        >
          {timeLabel(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ───────────────────────── Compose modal ─────────────────────────

function ComposeModal({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: (contactId: string) => void;
}) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [toId, setToId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setToId("");
    setSubject("");
    setBody("");
    setError(null);
    setSending(false);
    fetch("/api/contacts")
      .then((r) => r.json())
      .then(
        (
          data: { id: string; firstName: string; lastName: string; status: ContactStatus }[]
        ) =>
          setContacts(
            Array.isArray(data)
              ? data.map((c) => ({
                  id: c.id,
                  label: `${c.firstName} ${c.lastName}`,
                  status: c.status,
                }))
              : []
          )
      )
      .catch(() => setContacts([]));
  }, [open]);

  if (!open) return null;

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!toId) return setError("Choose a recipient.");
    if (!body.trim()) return setError("Write a message.");
    setSending(true);
    setError(null);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: toId, subject, body }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "Failed to send.");
    }
    onSent(toId);
  }

  const inputCls =
    "font-inter w-full rounded-lg border border-[#c4c8be] bg-white px-3 py-2.5 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <form
        onSubmit={send}
        className="relative w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-modal"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
            New message
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#f5f3f0]"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-inter mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#444841]">
              To
            </label>
            <select
              className={inputCls}
              value={toId}
              onChange={(e) => setToId(e.target.value)}
            >
              <option value="">Select a contact…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-inter mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#444841]">
              Subject
            </label>
            <input
              className={inputCls}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="font-inter mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#444841]">
              Message
            </label>
            <textarea
              className={`${inputCls} resize-y`}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
            />
          </div>
          {error && (
            <p className="font-inter rounded-lg bg-error-container px-3 py-2 text-sm text-[#93000a]">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-inter rounded-lg px-4 py-2.5 text-sm font-medium text-[#444841] transition-colors hover:bg-[#f5f3f0]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="font-inter flex items-center gap-2 rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
          >
            <Send className="h-4 w-4" strokeWidth={2} />
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ───────────────────────── Page ─────────────────────────

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [composeOpen, setComposeOpen] = useState(false);

  // Composer
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [sending, setSending] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function loadConversations() {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    }
  }

  async function loadDetail(contactId: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/messages/${contactId}`);
      if (!res.ok) {
        setDetail(null);
      } else {
        setDetail(await res.json());
        // Le GET a marqué les INBOUND comme lus → rafraîchit les badges.
        loadConversations();
      }
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  function selectConversation(contactId: string) {
    setSelectedId(contactId);
    setComposerSubject("");
    setComposerBody("");
    loadDetail(contactId);
  }

  // Scroll en bas quand la conversation change/grandit.
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [detail]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function sendMessage() {
    if (!selectedId || !composerBody.trim()) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: selectedId,
        subject: composerSubject,
        body: composerBody,
      }),
    });
    setSending(false);
    if (res.ok) {
      setComposerSubject("");
      setComposerBody("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      await loadDetail(selectedId);
      loadConversations();
    }
  }

  // Filtrage + recherche (client).
  const visible = useMemo(() => {
    const list = conversations ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (filter === "UNREAD" && c.unreadCount === 0) return false;
      if (filter === "SENT" && c.lastMessage.direction !== "OUTBOUND")
        return false;
      if (!q) return true;
      const name = c.contact
        ? fullName(c.contact.firstName, c.contact.lastName).toLowerCase()
        : "";
      return name.includes(q);
    });
  }, [conversations, filter, search]);

  // Groupes de messages par jour pour la conversation ouverte.
  const grouped = useMemo(() => {
    if (!detail) return [];
    const groups: { key: string; label: string; items: Message[] }[] = [];
    for (const m of detail.messages) {
      const key = dayKey(m.createdAt);
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        g = { key, label: dayGroupLabel(m.createdAt), items: [] };
        groups.push(g);
      }
      g.items.push(m);
    }
    return groups;
  }, [detail]);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] overflow-hidden rounded-2xl border border-[#c4c8be]/50 bg-white shadow-card">
      {/* ───────── Colonne gauche ───────── */}
      <div className="flex w-[320px] shrink-0 flex-col border-r border-[#c4c8be]/40">
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <h1 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
            Inbox
          </h1>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="font-inter flex items-center gap-1.5 rounded-lg bg-[#52634c] px-3 py-1.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Compose
          </button>
        </div>

        {/* Recherche */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
              strokeWidth={1.75}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="font-inter w-full rounded-lg border border-[#c4c8be] bg-white py-2 pl-9 pr-3 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]"
            />
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-1.5 px-4 pb-3">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`font-inter rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-[#52634c] text-white"
                  : "bg-[#efeeea] text-[#444841] hover:bg-[#e6e4df]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations === null ? (
            <div className="animate-pulse space-y-1 px-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#efeeea]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-[#efeeea]" />
                    <div className="h-2.5 w-40 rounded bg-[#efeeea]" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="font-inter px-4 py-8 text-center text-sm text-outline">
              No conversations found.
            </p>
          ) : (
            visible.map((c) => {
              const active = c.contactId === selectedId;
              const preview =
                (c.lastMessage.direction === "OUTBOUND" ? "You: " : "") +
                c.lastMessage.body;
              return (
                <button
                  key={c.contactId}
                  type="button"
                  onClick={() => selectConversation(c.contactId)}
                  className={`flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-[#52634c] bg-[#f5f3f0]"
                      : "border-transparent hover:bg-[#fbf9f5]"
                  }`}
                >
                  {c.contact && (
                    <Avatar
                      firstName={c.contact.firstName}
                      lastName={c.contact.lastName}
                      status={c.contact.status}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
                        {c.contact
                          ? fullName(c.contact.firstName, c.contact.lastName)
                          : "Unknown"}
                      </p>
                      <span className="font-inter shrink-0 text-[11px] text-[#444841]">
                        {conversationDate(c.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={`font-inter truncate text-[13px] ${
                          c.unreadCount > 0
                            ? "font-medium text-[#1b1c1a]"
                            : "text-[#444841]"
                        }`}
                      >
                        {preview}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="font-inter flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#3b82f6] px-1.5 text-[10px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ───────── Colonne droite ───────── */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#fbf9f5]">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <MessageSquare
              className="h-12 w-12 text-[#c4c8be]"
              strokeWidth={1.5}
            />
            <p className="font-manrope mt-4 text-lg font-medium text-[#444841]">
              Select a conversation
            </p>
            <p className="font-inter mt-1 text-sm text-outline">
              Choose a contact on the left to view your messages.
            </p>
          </div>
        ) : (
          <>
            {/* Header conversation */}
            <div className="flex items-center justify-between border-b border-[#c4c8be]/30 px-6 py-4">
              <div className="flex items-center gap-3">
                {detail?.contact && (
                  <Avatar
                    firstName={detail.contact.firstName}
                    lastName={detail.contact.lastName}
                    status={detail.contact.status}
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-manrope text-base font-semibold text-[#1b1c1a]">
                      {detail?.contact
                        ? fullName(
                            detail.contact.firstName,
                            detail.contact.lastName
                          )
                        : "…"}
                    </p>
                    {detail?.contact && (
                      <StatusBadge
                        status={STATUS_CONFIG[detail.contact.status].label}
                        variant={STATUS_CONFIG[detail.contact.status].variant}
                      />
                    )}
                  </div>
                  {detail?.contact && (
                    <Link
                      href={`/contacts/${detail.contact.id}`}
                      className="font-inter mt-0.5 inline-flex items-center gap-1 text-[13px] text-[#52634c] hover:underline"
                    >
                      View Contact
                      <ArrowRight className="h-3 w-3" strokeWidth={2} />
                    </Link>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Conversation options"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea]"
              >
                <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 overflow-y-auto px-6 py-6">
              {detailLoading && !detail ? (
                <p className="font-inter text-center text-sm text-outline">
                  Loading…
                </p>
              ) : (
                grouped.map((g) => (
                  <div key={g.key} className="mb-4">
                    <div className="mb-4 flex items-center justify-center">
                      <span className="font-inter text-[11px] font-semibold uppercase tracking-wide text-[#c4c8be]">
                        {g.label}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {g.items.map((m) => (
                        <MessageBubble key={m.id} message={m} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-[#c4c8be]/30 p-4">
              <input
                value={composerSubject}
                onChange={(e) => setComposerSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="font-inter mb-2 w-full rounded-lg bg-[#efeeea] px-3 py-2 text-sm text-[#1b1c1a] outline-none placeholder:text-outline focus:ring-2 focus:ring-[#52634c]/20"
              />
              <textarea
                ref={textareaRef}
                value={composerBody}
                onChange={(e) => {
                  setComposerBody(e.target.value);
                  autoGrow();
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={3}
                placeholder="Write a message…"
                className="font-inter w-full resize-none rounded-xl bg-[#efeeea] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none placeholder:text-outline focus:ring-2 focus:ring-[#52634c]/20"
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Attach file"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-outline transition-colors hover:bg-[#efeeea]"
                >
                  <Paperclip className="h-5 w-5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !composerBody.trim()}
                  className="font-inter flex items-center gap-2 rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" strokeWidth={2} />
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Compose modal */}
      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={(contactId) => {
          setComposeOpen(false);
          loadConversations();
          selectConversation(contactId);
        }}
      />
    </div>
  );
}
