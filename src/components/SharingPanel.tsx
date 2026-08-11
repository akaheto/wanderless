"use client";

import { useState, useTransition } from "react";
import type { TripShare, TripCollaborator, TripInvite } from "@/lib/db/users";
import type { User } from "@/lib/db/users";
import { createShareLinkAction, deleteShareAction, inviteCollaboratorAction, revokeInviteAction } from "@/app/actions";
import { Badge, Button, Card, CardHeader } from "./ui";
import { formatDate } from "@/lib/dates";

export interface SharingPanelProps {
  shares: TripShare[];
  tripId: number;
  tripName: string;
  owner?: User | null;
  currentUser?: User | null;
  collaborators?: TripCollaborator[];
  invites?: TripInvite[];
}

export function SharingPanel({ shares, tripId, tripName, owner, currentUser, collaborators = [], invites = [] }: SharingPanelProps) {
  const [pending, startTransition] = useTransition();
  const [showShareForm, setShowShareForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [note, setNote] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = useState("");
  const isOwner = currentUser?.id === owner?.id;

  const handleCreateShare = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("tripId", String(tripId));
      formData.set("note", note);
      await createShareLinkAction(formData);
      setNote("");
      setShowShareForm(false);
    });
  };

  const handleDeleteShare = (shareId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("shareId", shareId);
      formData.set("tripId", String(tripId));
      await deleteShareAction(formData);
    });
  };

  const handleInviteCollaborator = () => {
    setInviteError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("tripId", String(tripId));
      formData.set("email", inviteEmail);
      formData.set("role", inviteRole);
      const result = await inviteCollaboratorAction(formData);
      
      if (result.error) {
        setInviteError(result.error);
      } else {
        setInviteEmail("");
        setInviteRole("editor");
        setShowInviteForm(false);
      }
    });
  };

  const handleRevokeInvite = (token: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("tripId", String(tripId));
      formData.set("token", token);
      await revokeInviteAction(formData);
    });
  };

  return (
    <Card>
      <CardHeader
        title="Share this trip"
        note={
          owner ? `Trip by ${owner.email}${isOwner ? " (you)" : ""}` : "Shared by unknown user"
        }
      />

      <div className="space-y-6 px-4 py-4">
        {/* Collaborators Section */}
        <div>
          <h3 className="mb-3 text-[12px] font-medium text-ink-2">Collaborators</h3>
          <div className="space-y-2">
            {/* Owner */}
            <div className="flex items-center justify-between rounded bg-sunken px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="text-[13px] text-ink-1">{owner?.email}</div>
                <Badge tone="neutral">Owner</Badge>
              </div>
            </div>

            {/* Other collaborators */}
            {collaborators.length > 0 ? (
              collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center justify-between rounded bg-sunken px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-ink-1">{collab.userId}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={collab.role === "editor" ? "accent" : "neutral"}>
                      {collab.role}
                    </Badge>
                    {isOwner && (
                      <button
                        onClick={() => {
                          // TODO: Add remove collaborator action
                        }}
                        className="text-[11px] text-link hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[12px] text-ink-4">No collaborators yet</div>
            )}
          </div>
        </div>

        {/* Pending Invites Section */}
        {invites.length > 0 && (
          <div>
            <h3 className="mb-3 text-[12px] font-medium text-ink-2">Pending Invitations</h3>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between rounded bg-amber-50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-amber-900">{invite.invitedEmail}</div>
                    <div className="text-[11px] text-amber-800">
                      Expires {formatDate(invite.expiresAt, { year: false })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="warning">{invite.role}</Badge>
                    {isOwner && (
                      <button
                        onClick={() => handleRevokeInvite(invite.token)}
                        disabled={pending}
                        className="text-[11px] text-link hover:underline disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Form */}
        {isOwner && (
          <div className="border-t border-line pt-4">
            {!showInviteForm ? (
              <button
                onClick={() => setShowInviteForm(true)}
                disabled={pending}
                className="text-[13px] text-accent hover:underline disabled:text-ink-4"
              >
                + Invite by email
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleInviteCollaborator();
                }}
                className="space-y-3"
              >
                <label className="block text-[12px]">
                  <span className="text-ink-3">Email address</span>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="collaborator@example.com"
                    className="mt-1 w-full rounded border border-line bg-surface-1 px-2.5 py-2 text-[13px] text-ink-2"
                    required
                  />
                </label>
                <label className="block text-[12px]">
                  <span className="text-ink-3">Role</span>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                    className="mt-1 w-full rounded border border-line bg-surface-1 px-2.5 py-2 text-[13px] text-ink-2"
                  >
                    <option value="editor">Editor (can edit)</option>
                    <option value="viewer">Viewer (read-only)</option>
                  </select>
                </label>
                {inviteError && (
                  <div className="rounded bg-red-50 px-3 py-2 text-[12px] text-red-900">
                    {inviteError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={pending}
                    variant="primary"
                    className="text-[12px]"
                  >
                    Send invite
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail("");
                      setInviteRole("editor");
                      setInviteError("");
                    }}
                    disabled={pending}
                    className="rounded px-3 py-1.5 text-[12px] text-ink-3 hover:bg-surface-1 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Share Links Section */}
        <div className="border-t border-line pt-4">
          <h3 className="mb-3 text-[12px] font-medium text-ink-2">Share Links</h3>

          {shares.length === 0 ? (
            <div className="text-[13px] text-ink-3 mb-3">No share links created yet.</div>
          ) : (
            <div className="space-y-3 border-b border-line pb-4 mb-4">
              {shares.map((share) => (
                <div key={share.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="break-all font-mono text-[11px] text-accent">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/share/${share.token}`
                        : `/share/${share.token}`}
                    </div>
                    {share.note && (
                      <div className="mt-1 text-[12px] text-ink-3">{share.note}</div>
                    )}
                    <div className="mt-1 text-[11px] text-ink-4">
                      Shared {formatDate(share.createdAt, { year: false })}
                      {share.expiresAt && ` · expires ${formatDate(share.expiresAt, { year: false })}`}
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteShare(share.id)}
                      disabled={pending}
                      className="shrink-0 text-[12px] text-link hover:underline disabled:text-ink-4"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOwner && (
            <>
              {!showShareForm ? (
                <button
                  onClick={() => setShowShareForm(true)}
                  disabled={pending}
                  className="text-[13px] text-accent hover:underline disabled:text-ink-4"
                >
                  + Create new share link
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateShare();
                  }}
                  className="space-y-3"
                >
                  <label className="block text-[12px]">
                    <span className="text-ink-3">Optional note</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., 'Share with travel buddies' or 'Group planning'"
                      className="mt-1 w-full rounded border border-line bg-surface-1 px-2.5 py-2 text-[13px] text-ink-2"
                      rows={2}
                      maxLength={200}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={pending}
                      variant="primary"
                      className="text-[12px]"
                    >
                      Create link
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowShareForm(false);
                        setNote("");
                      }}
                      disabled={pending}
                      className="rounded px-3 py-1.5 text-[12px] text-ink-3 hover:bg-surface-1 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {!isOwner && currentUser && (
          <div className="rounded bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            You are a collaborator on this trip. Only the owner can manage sharing and invites.
          </div>
        )}

        {!currentUser && (
          <div className="rounded bg-sunken px-3 py-2 text-[12px] text-ink-3">
            <p className="font-medium text-ink-2">Sign in to collaborate</p>
            <p className="mt-1">Sign in to be added as a collaborator and edit this trip.</p>
          </div>
        )}

        <div className="mt-4 rounded bg-sunken px-3 py-2 text-[12px] text-ink-3">
          <p className="font-medium text-ink-2">How sharing works</p>
          <p className="mt-1">Share links let anyone see your destination, itinerary, bookings, and saved places—but not your personal notes or rejected options. Collaborators can edit the trip and access all details.</p>
        </div>
      </div>
    </Card>
  );
}
