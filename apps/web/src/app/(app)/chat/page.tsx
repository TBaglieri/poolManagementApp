"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Hash, Star, Search, Pin, AlertTriangle, Megaphone, CalendarDays, CloudRain, Users, ArrowRight,
  MessageSquarePlus, UserPlus, X, ShieldOff,
} from "lucide-react";
import {
  getStaff, facilityName, relativeTime, CHANNEL_KIND_LABELS, getRole, staff as roster,
  canCreateGroupChat, canSendDirectMessage, canToggleDirectMessages, canManageChatMembers, canViewChannel,
  type Message, type Channel, type RoleSlug, type StaffProfile,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantConfig } from "@/lib/tenant/provider";
import { useStaffResolver } from "@/lib/staff-resolve";
import { PageHeader } from "@/components/ui/page-header";
import { StaffAvatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AnnouncementComposer } from "@/components/chat/announcement-composer";
import { cn } from "@/lib/cn";

const KIND_ICON: Record<string, { icon: typeof Megaphone; cls: string; label: string }> = {
  schedule_publish: { icon: CalendarDays, cls: "text-brand-600 bg-brand-50 border-brand-200", label: "Schedule" },
  weather_alert: { icon: CloudRain, cls: "text-amber-600 bg-amber-50 border-amber-200", label: "Weather" },
  shift_coverage: { icon: Users, cls: "text-sky-600 bg-sky-50 border-sky-200", label: "Coverage" },
  announcement: { icon: Megaphone, cls: "text-violet-600 bg-violet-50 border-violet-200", label: "Announcement" },
};

export default function ChatPage() {
  const { role, can, staffId } = useAccess();
  const config = useTenantConfig();
  const resolveStaff = useStaffResolver();
  const orgId = config.slug; // tenant scope key (mock); RLS scopes by real org id in supabase mode
  const channels = useDemo((s) => s.channels);
  const messages = useDemo((s) => s.messages);
  const dmsDisabled = useDemo((s) => s.dmsDisabled);
  const togglePin = useDemo((s) => s.togglePinMessage);
  const postMessage = useDemo((s) => s.postMessage);
  const createGroupChat = useDemo((s) => s.createGroupChat);
  const createDirectChat = useDemo((s) => s.createDirectChat);
  const addChannelMember = useDemo((s) => s.addChannelMember);
  const removeChannelMember = useDemo((s) => s.removeChannelMember);
  const setDmsDisabled = useDemo((s) => s.setDmsDisabled);
  const markChannelRead = useDemo((s) => s.markChannelRead);
  // Real staff roster (Supabase) when available, else the seed roster (demo/mock).
  // The member picker MUST use real staff so selections resolve to profile ids.
  const storeRoster = useDemo((s) => s.staffRoster);
  const people = storeRoster.length ? storeRoster : roster;

  const [activeId, setActiveId] = useState("ch_all");
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState<null | "group" | "dm">(null);
  const [showMembers, setShowMembers] = useState(false);

  const ctx = { orgId, staffId, role };
  const canCreateGroup = canCreateGroupChat(role);
  const canDM = canSendDirectMessage(role, dmsDisabled);
  const canToggleDM = canToggleDirectMessages(role);

  // Tenant + membership + role scoped — a user only ever sees chats they're allowed to.
  const visibleChannels = useMemo(
    () => channels.filter((c) => canViewChannel(c, ctx)),
    [channels, orgId, staffId, role],
  );
  const active = visibleChannels.find((c) => c.id === activeId) ?? visibleChannels[0];
  const isMemberChat = active?.chatType === "group" || active?.chatType === "dm";

  const openChannel = (id: string) => { setActiveId(id); setShowMembers(false); markChannelRead(id); };

  const channelMessages = useMemo(() => {
    return messages
      .filter((m) => m.channelId === active?.id)
      .filter((m) => !search || m.body.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }, [messages, active?.id, search]);

  const pinned = channelMessages.filter((m) => m.pinned);
  const canManage = active ? canManageChatMembers(active, ctx) : false;
  const members = (active?.memberIds ?? []).map((id) => resolveStaff(id)).filter(Boolean);

  return (
    <div className="space-y-5">
      <PageHeader title="Team Chat" subtitle="Announcements, group chats, and direct messages across your team."
        actions={
          <div className="flex items-center gap-2">
            {canToggleDM && (
              <button
                onClick={() => setDmsDisabled(!dmsDisabled, role)}
                className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  dmsDisabled ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                title="Turn direct messages on or off for staff, organization-wide">
                <ShieldOff className="h-3.5 w-3.5" /> {dmsDisabled ? "DMs disabled" : "DMs enabled"}
              </button>
            )}
            {canDM && <Button variant="secondary" icon="MessageSquarePlus" onClick={() => setComposer("dm")}>New DM</Button>}
            {canCreateGroup && <Button icon="Plus" onClick={() => setComposer("group")}>New group chat</Button>}
          </div>
        } />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Channel list */}
        <aside className="card h-fit overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Channels & chats</p>
          </div>
          <ul className="p-2">
            {visibleChannels.map((c) => {
              const unreadDot = c.unread > 0;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => openChannel(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active?.id === c.id ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <ChannelIcon channel={c} active={active?.id === c.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-slate-400">{channelSubtitle(c)}</span>
                    </span>
                    {unreadDot && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </button>
                </li>
              );
            })}
            {visibleChannels.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-400">No chats yet.{canCreateGroup ? " Create a group chat to get started." : ""}</li>
            )}
          </ul>
        </aside>

        {/* Thread */}
        <section className="card flex h-[calc(100vh-260px)] min-h-[480px] flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              {active && <ChannelIcon channel={active} active />}
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{active?.name}</h2>
                <p className="text-xs text-slate-400">{active ? channelSubtitle(active) : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isMemberChat && (
                <button onClick={() => setShowMembers((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Users className="h-3.5 w-3.5" /> {members.length}
                </button>
              )}
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-40 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-sm focus:border-brand-400 focus:bg-white focus:outline-none" />
              </div>
            </div>
          </header>

          {/* Member panel for group chats / DMs */}
          {isMemberChat && showMembers && active && (
            <MemberPanel
              channel={active} canManage={canManage} currentStaffId={staffId} roster={people}
              onAdd={(sid) => addChannelMember(active.id, sid, { staffId, role })}
              onRemove={(sid) => removeChannelMember(active.id, sid, { staffId, role })}
            />
          )}

          {pinned.length > 0 && (
            <div className="border-b border-amber-100 bg-amber-50/50 px-5 py-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <Pin className="h-3.5 w-3.5" /> {pinned.length} pinned · {pinned[pinned.length - 1].body.slice(0, 60)}…
              </p>
            </div>
          )}

          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {channelMessages.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-400">No messages yet. Start the conversation below.</p>
            )}
            {channelMessages.map((m) => (
              <MessageRow key={m.id} message={m} canPin={can("chat.announce")} onPin={() => togglePin(m.id)} resolveStaff={resolveStaff} />
            ))}
          </div>

          <div className="border-t border-slate-100 p-4">
            {active && isMemberChat
              ? <ChatComposer onSend={(body) => staffId && postMessage(active.id, staffId, body)} />
              : active && <AnnouncementComposer channelId={active.id} />}
          </div>
        </section>
      </div>

      {composer && (
        <CreateChatModal
          type={composer} onClose={() => setComposer(null)} currentStaffId={staffId} roster={people}
          onCreateGroup={(name, memberIds) => {
            const res = createGroupChat({ name, memberIds, createdBy: staffId ?? "", creatorRole: role, organizationId: orgId });
            if (res.ok) { setComposer(null); openChannel(res.id); }
            return res.ok ? null : res.error;
          }}
          onCreateDm={(toStaffId) => {
            const res = createDirectChat({ fromStaffId: staffId ?? "", toStaffId, senderRole: role, organizationId: orgId });
            if (res.ok) { setComposer(null); openChannel(res.id); }
            return res.ok ? null : res.error;
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------- pieces --------------------------------- */

function ChannelIcon({ channel: c, active }: { channel: Channel; active: boolean }) {
  if (c.chatType === "dm") return <MessageSquarePlus className="h-4 w-4 shrink-0 text-indigo-400" />;
  if (c.chatType === "group") return <Users className="h-4 w-4 shrink-0 text-brand-500" />;
  if (c.kind === "all_staff") return <Star className={cn("h-4 w-4 shrink-0", active ? "text-brand-500" : "text-amber-400")} fill="currentColor" />;
  return <Hash className="h-4 w-4 shrink-0 text-slate-400" />;
}

function channelSubtitle(c: Channel): string {
  if (c.chatType === "dm") return "Direct message";
  if (c.chatType === "group") return `${c.memberIds?.length ?? 0} members`;
  if (c.facilityId) return facilityName(c.facilityId);
  return CHANNEL_KIND_LABELS[c.kind] ?? "";
}

/** Simple text composer for group chats & DMs (Enter to send). */
function ChatComposer({ onSend }: { onSend: (body: string) => void }) {
  const [body, setBody] = useState("");
  const send = () => { const v = body.trim(); if (!v) return; onSend(v); setBody(""); };
  return (
    <div className="flex items-center gap-2">
      <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
      <Button icon="Send" onClick={send} disabled={!body.trim()}>Send</Button>
    </div>
  );
}

function MemberPanel({
  channel, canManage, currentStaffId, roster, onAdd, onRemove,
}: {
  channel: Channel; canManage: boolean; currentStaffId: string | null; roster: StaffProfile[];
  onAdd: (staffId: string) => void; onRemove: (staffId: string) => void;
}) {
  const memberIds = channel.memberIds ?? [];
  const candidates = roster.filter((s) => !memberIds.includes(s.id));
  const staffOf = (id: string) => roster.find((x) => x.id === id || x.userId === id) ?? getStaff(id);
  const nameOf = (id: string) => { const s = staffOf(id); return s ? `${s.firstName} ${s.lastName}`.trim() : "Team member"; };
  const [adding, setAdding] = useState(false);
  return (
    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>
        {canManage && channel.chatType === "group" && (
          <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800">
            <UserPlus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {memberIds.map((id) => {
          const s = staffOf(id);
          const isCreator = channel.createdBy === id;
          return (
            <li key={id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-xs">
              <StaffAvatar name={nameOf(id)} color={s?.avatarColor ?? "#0E7490"} size="xs" />
              <span className="font-medium text-slate-700">{nameOf(id)}</span>
              {isCreator && <span className="text-[10px] text-slate-400">· owner</span>}
              {canManage && channel.chatType === "group" && !isCreator && id !== currentStaffId && (
                <button onClick={() => onRemove(id)} className="text-slate-300 hover:text-rose-500" title="Remove"><X className="h-3 w-3" /></button>
              )}
            </li>
          );
        })}
      </ul>
      {adding && canManage && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
          {candidates.map((s) => (
            <button key={s.id} onClick={() => onAdd(s.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50">
              <StaffAvatar name={`${s.firstName} ${s.lastName}`} color={s.avatarColor} size="xs" />
              <span className="flex-1 truncate text-slate-700">{s.firstName} {s.lastName}</span>
              <RoleBadge role={s.primaryRole} />
            </button>
          ))}
          {candidates.length === 0 && <p className="px-2 py-2 text-xs text-slate-400">Everyone's already a member.</p>}
        </div>
      )}
    </div>
  );
}

function CreateChatModal({
  type, onClose, currentStaffId, roster, onCreateGroup, onCreateDm,
}: {
  type: "group" | "dm";
  onClose: () => void;
  currentStaffId: string | null;
  roster: StaffProfile[];
  onCreateGroup: (name: string, memberIds: string[]) => string | null;
  onCreateDm: (toStaffId: string) => string | null;
}) {
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<Set<RoleSlug>>(new Set());
  const [people, setPeople] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const selectable = roster.filter((s) => s.id !== currentStaffId);
  const tiers = Array.from(new Set(selectable.map((s) => s.primaryRole)))
    .sort((a, b) => getRole(b).level - getRole(a).level);

  // Everyone in a selected tier, plus anyone individually picked.
  const memberIds = useMemo(() => {
    const set = new Set<string>(people);
    for (const s of selectable) if (roles.has(s.primaryRole)) set.add(s.id);
    return [...set];
  }, [roles, people, selectable]);

  const toggle = <T,>(set: Set<T>, v: T): Set<T> => {
    const next = new Set(set); next.has(v) ? next.delete(v) : next.add(v); return next;
  };

  const submitGroup = () => {
    if (!name.trim()) { setError("Give the chat a name."); return; }
    if (memberIds.length === 0) { setError("Add at least one person or tier."); return; }
    setError(onCreateGroup(name.trim(), memberIds));
  };

  return (
    <Modal open onClose={onClose} title={type === "group" ? "New group chat" : "New direct message"} size="lg"
      footer={type === "group"
        ? <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon="Users" onClick={submitGroup}>Create chat</Button></>
        : <Button variant="secondary" onClick={onClose}>Cancel</Button>}>
      {type === "group" ? (
        <div className="space-y-4">
          <Field label="Chat name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lifeguard chat, Managers & above" autoFocus /></Field>

          <div>
            <p className="label">Include tiers</p>
            <p className="mb-2 text-xs text-slate-400">Pick whole role tiers — everyone in them is added. Flexible: combine tiers and individuals.</p>
            <div className="flex flex-wrap gap-2">
              {tiers.map((r) => (
                <button key={r} type="button" onClick={() => setRoles((s) => toggle(s, r))}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    roles.has(r) ? "border-brand-400 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                  {getRole(r).name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label">Add individuals</p>
            <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200">
              {selectable.map((s) => {
                const viaRole = roles.has(s.primaryRole);
                const checked = viaRole || people.has(s.id);
                return (
                  <label key={s.id} className={cn("flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50", viaRole && "opacity-70")}>
                    <input type="checkbox" checked={checked} disabled={viaRole} onChange={() => setPeople((p) => toggle(p, s.id))} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                    <StaffAvatar name={`${s.firstName} ${s.lastName}`} color={s.avatarColor} size="xs" />
                    <span className="flex-1 truncate text-slate-700">{s.firstName} {s.lastName}</span>
                    <RoleBadge role={s.primaryRole} />
                  </label>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-500">{memberIds.length} member{memberIds.length === 1 ? "" : "s"} selected (plus you).</p>
          {error && <p className="flex items-center gap-1.5 text-xs text-rose-600"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Start a direct message with a teammate.</p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {selectable.map((s) => (
              <button key={s.id} onClick={() => setError(onCreateDm(s.id))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <StaffAvatar name={`${s.firstName} ${s.lastName}`} color={s.avatarColor} size="xs" />
                <span className="flex-1 truncate text-slate-700">{s.firstName} {s.lastName}</span>
                <RoleBadge role={s.primaryRole} />
              </button>
            ))}
          </div>
          {error && <p className="flex items-center gap-1.5 text-xs text-rose-600"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</p>}
        </div>
      )}
    </Modal>
  );
}

function MessageRow({ message: m, canPin, onPin, resolveStaff }: { message: Message; canPin: boolean; onPin: () => void; resolveStaff: (id: string | null | undefined) => ReturnType<typeof getStaff> }) {
  const sender = resolveStaff(m.senderId);
  const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : "Team member";
  const special = m.kind && KIND_ICON[m.kind];
  const urgent = m.priority === "urgent";

  if (special) {
    const K = special.icon;
    return (
      <div className={cn("rounded-xl border p-4", special.cls)}>
        <div className="flex items-center gap-2">
          <K className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">{special.label}</span>
          {urgent && <span className="chip bg-rose-100 text-rose-700"><AlertTriangle className="h-3 w-3" /> Urgent</span>}
          <span className="ml-auto text-xs text-slate-400">{relativeTime(m.sentAt)}</span>
        </div>
        <p className="mt-2 text-sm font-medium text-slate-800">{m.body}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">{senderName}</span>
          {m.linkUrl && <Link href={m.linkUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">View <ArrowRight className="h-3 w-3" /></Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3">
      <StaffAvatar name={senderName} color={sender?.avatarColor ?? "#0E7490"} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{senderName}</span>
          {sender && <RoleBadge role={sender.primaryRole} />}
          <span className="text-xs text-slate-400">{relativeTime(m.sentAt)}</span>
          {m.pinned && <Pin className="h-3 w-3 text-amber-500" />}
          {urgent && <span className="chip bg-rose-50 text-rose-700"><AlertTriangle className="h-3 w-3" /> Urgent</span>}
        </div>
        <p className={cn("mt-0.5 text-sm text-slate-700", urgent && "font-medium")}>{m.body}</p>
      </div>
      {canPin && (
        <button onClick={onPin} className="opacity-0 transition-opacity group-hover:opacity-100" title={m.pinned ? "Unpin" : "Pin"}>
          <Pin className={cn("h-4 w-4", m.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500")} />
        </button>
      )}
    </div>
  );
}
