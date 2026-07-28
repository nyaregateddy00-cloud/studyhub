import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  LogOut,
  Plus,
  Search,
  Send,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/groups")({
  head: () => ({
    meta: [
      { title: "Study Groups — StudyHub" },
      {
        name: "description",
        content:
          "Create or join study groups with classmates and schoolmates, then revise together in a shared group chat.",
      },
      { property: "og:title", content: "Study Groups — StudyHub" },
      {
        property: "og:description",
        content: "Team up with classmates and schoolmates to study together on StudyHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Groups,
});

type GroupRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  subject: string | null;
  institution: string | null;
  is_public: boolean;
  join_code: string;
  member_count: number;
  created_at: string;
};

function Groups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [institution, setInstitution] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["study-groups", search],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("study_groups")
        .select("*")
        .order("member_count", { ascending: false })
        .limit(60);
      if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);
      const [{ data: groups, error }, memberships] = await Promise.all([
        query,
        supabase.from("study_group_members").select("group_id").eq("user_id", user!.id),
      ]);
      if (error) throw error;
      return {
        groups: (groups ?? []) as GroupRow[],
        myGroupIds: new Set((memberships.data ?? []).map((row) => row.group_id)),
      };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["study-groups"] });

  const createGroup = useMutation({
    mutationFn: async () => {
      const { data: group, error } = await supabase
        .from("study_groups")
        .insert({
          owner_id: user!.id,
          name: name.trim(),
          description: description.trim() || null,
          subject: subject.trim() || null,
          institution: institution.trim() || null,
          is_public: isPublic,
        })
        .select("*")
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase.from("study_group_members").insert({
        group_id: group.id,
        user_id: user!.id,
        role: "owner",
        display_name: user!.user_metadata?.display_name ?? user!.email?.split("@")[0] ?? "Member",
      });
      if (memberError) throw memberError;
      return group as GroupRow;
    },
    onSuccess: (group) => {
      toast.success("Study group created");
      setCreating(false);
      setName("");
      setDescription("");
      setSubject("");
      setInstitution("");
      setIsPublic(true);
      refresh();
      setOpenId(group.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("study_group_members").insert({
        group_id: groupId,
        user_id: user!.id,
        display_name: user!.user_metadata?.display_name ?? user!.email?.split("@")[0] ?? "Member",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You joined the group");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinByCode = useMutation({
    mutationFn: async () => {
      const code = joinCode.trim().toUpperCase();
      const { data: group, error } = await supabase
        .from("study_groups")
        .select("id")
        .eq("join_code", code)
        .maybeSingle();
      if (error) throw error;
      if (!group) throw new Error("No group found with that code");
      const { error: joinError } = await supabase.from("study_group_members").insert({
        group_id: group.id,
        user_id: user!.id,
        display_name: user!.user_metadata?.display_name ?? user!.email?.split("@")[0] ?? "Member",
      });
      if (joinError) throw joinError;
      return group.id;
    },
    onSuccess: (groupId) => {
      toast.success("Joined via invite code");
      setJoinCode("");
      refresh();
      setOpenId(groupId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leaveGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("study_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You left the group");
      setOpenId(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("study_groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Group deleted");
      setOpenId(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openGroup = data?.groups.find((group) => group.id === openId) ?? null;

  if (openGroup) {
    return (
      <GroupRoom
        group={openGroup}
        isMember={data!.myGroupIds.has(openGroup.id)}
        onBack={() => setOpenId(null)}
        onJoin={() => joinGroup.mutate(openGroup.id)}
        onLeave={() => leaveGroup.mutate(openGroup.id)}
        onDelete={() => deleteGroup.mutate(openGroup.id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Study groups
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect with classmates and schoolmates, then revise together in a shared space.
          </p>
        </div>
        <Button onClick={() => setCreating((value) => !value)}>
          <Plus className="mr-2 size-4" />
          New group
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search groups by name"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="Invite code"
            className="sm:w-40"
          />
          <Button
            variant="secondary"
            disabled={!joinCode.trim() || joinByCode.isPending}
            onClick={() => joinByCode.mutate()}
          >
            Join
          </Button>
        </div>
      </div>

      {creating && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="BSc Year 2 — Organic Chemistry"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-subject">Subject</Label>
              <Input
                id="group-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Chemistry"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="group-institution">School / institution</Label>
              <Input
                id="group-institution"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="University of Nairobi"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="group-description">What will you study together?</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Weekly revision sessions, past papers and shared notes."
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="group-public" checked={isPublic} onCheckedChange={setIsPublic} />
              <Label htmlFor="group-public" className="text-sm font-normal text-muted-foreground">
                {isPublic ? "Public — anyone can find and join" : "Private — invite code only"}
              </Label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                disabled={!name.trim() || createGroup.isPending}
                onClick={() => createGroup.mutate()}
              >
                Create group
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.groups.length ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <UsersRound className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No study groups yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create the first one and invite your classmates with the join code.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.groups.map((group) => {
            const member = data.myGroupIds.has(group.id);
            return (
              <article
                key={group.id}
                className="lift flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold leading-tight">{group.name}</h2>
                    <Badge variant={group.is_public ? "secondary" : "outline"}>
                      {group.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                  {group.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {group.subject && <Badge variant="outline">{group.subject}</Badge>}
                    {group.institution && <Badge variant="outline">{group.institution}</Badge>}
                    <Badge variant="outline">
                      {group.member_count} member{group.member_count === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {member ? (
                    <Button className="flex-1" onClick={() => setOpenId(group.id)}>
                      Open group
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      variant="secondary"
                      disabled={joinGroup.isPending}
                      onClick={() => joinGroup.mutate(group.id)}
                    >
                      Join group
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupRoom({
  group,
  isMember,
  onBack,
  onJoin,
  onLeave,
  onDelete,
}: {
  group: GroupRow;
  isMember: boolean;
  onBack: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const isOwner = group.owner_id === user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["study-group-room", group.id],
    enabled: isMember,
    refetchInterval: 15000,
    queryFn: async () => {
      const [members, messages] = await Promise.all([
        supabase
          .from("study_group_members")
          .select("*")
          .eq("group_id", group.id)
          .order("joined_at", { ascending: true }),
        supabase
          .from("study_group_messages")
          .select("*")
          .eq("group_id", group.id)
          .order("created_at", { ascending: true })
          .limit(200),
      ]);
      if (members.error) throw members.error;
      if (messages.error) throw messages.error;
      return { members: members.data ?? [], messages: messages.data ?? [] };
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("study_group_messages").insert({
        group_id: group.id,
        user_id: user!.id,
        display_name: user!.user_metadata?.display_name ?? user!.email?.split("@")[0] ?? "Member",
        body: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["study-group-room", group.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
            <ArrowLeft className="mr-1.5 size-4" />
            All groups
          </Button>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[group.institution, group.subject].filter(Boolean).join(" · ") || "Study together"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(group.join_code);
              toast.success(`Invite code ${group.join_code} copied`);
            }}
          >
            <Copy className="mr-1.5 size-4" />
            {group.join_code}
          </Button>
          {isMember && !isOwner && (
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut className="mr-1.5 size-4" />
              Leave
            </Button>
          )}
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="mr-1.5 size-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {!isMember ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">Join to see the group chat</p>
          <Button className="mt-3" onClick={onJoin}>
            Join group
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <section className="flex flex-col rounded-xl border border-border bg-surface">
            <div className="max-h-[55vh] flex-1 space-y-3 overflow-y-auto p-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-2/3 rounded-lg" />
                ))
              ) : !data?.messages.length ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No messages yet — say hello to your study partners.
                </p>
              ) : (
                data.messages.map((msg) => {
                  const mine = msg.user_id === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex", mine && "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                          mine ? "bg-primary text-primary-foreground" : "bg-secondary",
                        )}
                      >
                        {!mine && (
                          <p className="mb-0.5 text-xs font-medium opacity-70">
                            {msg.display_name ?? "Member"}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            <form
              className="flex gap-2 border-t border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (message.trim()) sendMessage.mutate();
              }}
            >
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Message the group"
              />
              <Button type="submit" size="icon" disabled={!message.trim() || sendMessage.isPending}>
                <Send className="size-4" />
              </Button>
            </form>
          </section>

          <aside className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Members ({data?.members.length ?? 0})</h2>
            <ul className="space-y-2 text-sm">
              {(data?.members ?? []).map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{member.display_name ?? "Member"}</span>
                  {member.role === "owner" && <Badge variant="outline">Owner</Badge>}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}