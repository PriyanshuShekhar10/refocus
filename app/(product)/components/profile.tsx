"use client";
import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, Plus, Copy } from "lucide-react";
import Link from "next/link";

type UserInfo = {
  email?: string;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  about?: string | null;
  interests?: string[];
  location?: string | null;
  website?: string | null;
};

type EditableFields = {
  username: string;
  firstname: string;
  lastname: string;
  about: string;
  interests: string[];
  location: string;
  website: string;
};

export default function Profile() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [editFields, setEditFields] = useState<EditableFields>({
    username: "",
    firstname: "",
    lastname: "",
    about: "",
    interests: [],
    location: "",
    website: "",
  });

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const data = await res.json();
      setUser(data?.user || null);
      if (data?.user) {
        setEditFields({
          username: data.user.username || "",
          firstname: data.user.firstname || "",
          lastname: data.user.lastname || "",
          about: data.user.about || "",
          interests: data.user.interests || [],
          location: data.user.location || "",
          website: data.user.website || "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleSave = async () => {
    if (usernameStatus === "taken" || usernameStatus === "checking") return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      if (res.ok) {
        setUsernameStatus("idle");
        await loadUser();
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditFields({
        username: user.username || "",
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        about: user.about || "",
        interests: user.interests || [],
        location: user.location || "",
        website: user.website || "",
      });
    }
    setUsernameStatus("idle");
    setIsEditing(false);
  };

  // Debounced username availability check
  useEffect(() => {
    if (!isEditing) return;
    const trimmed = editFields.username.trim().toLowerCase();
    if (!trimmed || trimmed === (user?.username || "")) {
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-z0-9_-]{3,20}$/.test(trimmed)) {
      setUsernameStatus("taken");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/username?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [editFields.username, isEditing, user?.username]);

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !editFields.interests.includes(trimmed)) {
      setEditFields((prev) => ({
        ...prev,
        interests: [...prev.interests, trimmed],
      }));
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setEditFields((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addInterest();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 w-full max-w-2xl mx-auto">
        <div className="h-20 rounded-lg border bg-muted/30 animate-pulse" />
        <div className="h-32 rounded-lg border bg-muted/30 animate-pulse" />
        <div className="h-24 rounded-lg border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  const firstname = user?.firstname ?? "";
  const lastname = user?.lastname ?? "";
  const displayName =
    [firstname, lastname].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email ||
    "User";
  const initials = `${(
    firstname?.[0] ||
    user?.name?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase()}${(lastname?.[0] || "").toUpperCase()}`;

  return (
    <div className="space-y-8 w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg font-medium bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{displayName}</h1>
            {user?.username && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Link
                  href={`/u/${user.username}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  @{user.username}
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/u/${user.username}`);
                  }}
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  title="Copy profile link"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
        </div>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Basic Info */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Basic Information
        </h2>
        {isEditing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="username" className="text-xs">
                Username
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  id="username"
                  value={editFields.username}
                  onChange={(e) =>
                    setEditFields((prev) => ({
                      ...prev,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                    }))
                  }
                  placeholder="username"
                  className="h-9 pl-7"
                  maxLength={20}
                />
              </div>
              {usernameStatus === "checking" && (
                <p className="text-xs text-muted-foreground">Checking availability...</p>
              )}
              {usernameStatus === "available" && (
                <p className="text-xs text-green-600">Username is available</p>
              )}
              {usernameStatus === "taken" && (
                <p className="text-xs text-red-500">
                  {editFields.username.length < 3
                    ? "Username must be at least 3 characters"
                    : "Username is already taken"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstname" className="text-xs">
                First Name
              </Label>
              <Input
                id="firstname"
                value={editFields.firstname}
                onChange={(e) =>
                  setEditFields((prev) => ({
                    ...prev,
                    firstname: e.target.value,
                  }))
                }
                placeholder="First name"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastname" className="text-xs">
                Last Name
              </Label>
              <Input
                id="lastname"
                value={editFields.lastname}
                onChange={(e) =>
                  setEditFields((prev) => ({
                    ...prev,
                    lastname: e.target.value,
                  }))
                }
                placeholder="Last name"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs">
                Location
              </Label>
              <Input
                id="location"
                value={editFields.location}
                onChange={(e) =>
                  setEditFields((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                placeholder="City, Country"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-xs">
                Website
              </Label>
              <Input
                id="website"
                value={editFields.website}
                onChange={(e) =>
                  setEditFields((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
                placeholder="yourwebsite.com"
                className="h-9"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">First Name</p>
              <p className="mt-0.5">{firstname || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Name</p>
              <p className="mt-0.5">{lastname || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="mt-0.5">{user?.location || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Website</p>
              {user?.website ? (
                <a
                  href={
                    user.website.startsWith("http")
                      ? user.website
                      : `https://${user.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 text-green-600 hover:underline block"
                >
                  {user.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <p className="mt-0.5">—</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t" />

      {/* About */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          About
        </h2>
        {isEditing ? (
          <Textarea
            value={editFields.about}
            onChange={(e) =>
              setEditFields((prev) => ({ ...prev, about: e.target.value }))
            }
            placeholder="Write a few words about yourself..."
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-muted-foreground">
            {user?.about || "No bio added yet."}
          </p>
        )}
      </section>

      {/* Divider */}
      <div className="border-t" />

      {/* Interests */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Interests
        </h2>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an interest..."
                className="h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInterest}
                disabled={!newInterest.trim()}
                className="h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editFields.interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => removeInterest(interest)}
                >
                  {interest}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(user?.interests?.length ?? 0) > 0 ? (
              user?.interests?.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No interests added yet.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
