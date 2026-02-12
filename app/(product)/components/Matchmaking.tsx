"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, Zap } from "lucide-react";

type MatchUser = {
  _id: string;
  name: string | null;
  firstname: string | null; 
  lastname: string | null;
  about: string | null;
  interests: string[] | null;
  image?: string | null;
  score: number;
};

export default function Matchmaking() {
  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/community/match");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch matches");
      }
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: userId }),
      });
      if (!res.ok) throw new Error("Failed to send request");
      
      setSentRequests(prev => new Set(prev).add(userId));
    } catch (e) {
      console.error(e);
      alert("Failed to send friend request");
    }
  };

  const getInitials = (name: string | null) => {
    return (name || "U").slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={fetchMatches}>Try Again</Button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <Zap className="h-10 w-10 text-yellow-500" />
        <h3 className="text-lg font-semibold">No AI Matches Yet</h3>
        <p className="max-w-md text-sm text-gray-500">
          Try updating your profile bio and interests to get better recommendations. 
          The AI needs to know you to match you!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">AI Recommended Partners</h2>
        <p className="text-gray-500">
          We found these users based on your goals, working style, and interests.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((user) => (
          <Card key={user._id} className="flex flex-col overflow-hidden border-indigo-100 dark:border-indigo-900 transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <Avatar className="h-12 w-12 border-2 border-indigo-100 dark:border-indigo-900">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">
                  {getInitials(user.name || user.firstname)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <CardTitle className="text-base">
                  {user.name || `${user.firstname} ${user.lastname}`}
                </CardTitle>
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                   <Zap size={12} className="fill-green-600" />
                   {Math.round(user.score * 100)}% Match
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 pt-2">
              {user.about && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 italic">
                  &ldquo;{user.about}&rdquo;
                </p>
              )}
              
              <div className="flex flex-wrap gap-1.5">
                {user.interests?.slice(0, 4).map((interest, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
                    {interest}
                  </Badge>
                ))}
                {user.interests && user.interests.length > 4 && (
                    <span className="text-[10px] text-gray-400 self-center">+{user.interests.length - 4} more</span>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              {sentRequests.has(user._id) ? (
                 <Button className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200" variant="outline" disabled>
                    Request Sent
                 </Button>
              ) : (
                <Button 
                    className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" 
                    onClick={() => sendFriendRequest(user._id)}
                >
                    <UserPlus size={16} />
                    Connect
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
