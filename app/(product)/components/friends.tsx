"use client";
import React, { useEffect, useState } from "react";

type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export default function Friends() {
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/friends/requests?type=incoming");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setIncoming(data.requests || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, action: "accept" | "decline") => {
    try {
      const res = await fetch(`/api/friends/requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Incoming requests</h2>
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="divide-y rounded-md border">
        {incoming.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No incoming requests</div>
        ) : (
          incoming.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div className="text-sm">
                From: <span className="font-mono">{r.from_user_id}</span>
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs uppercase">
                  {r.status}
                </span>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => act(r.id, "accept")}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => act(r.id, "decline")}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
