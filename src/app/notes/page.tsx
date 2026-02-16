"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function NotesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[] | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [exploitError, setExploitError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUser(user);
      loadMyNotes(user.id);
    });
  }, [router, supabase]);

  async function loadMyNotes(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setMyNotes(data ?? []);
    setLoading(false);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    await supabase.from("notes").insert({
      user_id: user.id,
      title,
      content,
    });

    setTitle("");
    setContent("");
    loadMyNotes(user.id);
  }

  async function deleteNote(id: string) {
    if (!user) return;
    await supabase.from("notes").delete().eq("id", id);
    loadMyNotes(user.id);
  }

  async function exploitFetchAllNotes() {
    setExploitError(null);
    // This is the "attack" - fetching ALL notes without filtering by user_id.
    // Without proper RLS, this returns every user's private notes.
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setExploitError(error.message);
      setAllNotes(null);
      return;
    }

    setAllNotes(data);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const otherUsersNotes = allNotes?.filter((n) => n.user_id !== user.id) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Secret Notes
            </h1>
            <p className="text-sm text-gray-500">
              Logged in as <span className="font-mono">{user.email}</span>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1 rounded"
          >
            Sign Out
          </button>
        </div>

        {/* Add Note Form */}
        <form
          onSubmit={addNote}
          className="bg-white rounded-lg shadow p-4 space-y-3"
        >
          <h2 className="font-semibold text-gray-800">New Note</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Write your secret note..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Save Note
          </button>
        </form>

        {/* My Notes */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-800 mb-3">
            My Notes ({myNotes.length})
          </h2>
          {myNotes.length === 0 ? (
            <p className="text-gray-400 text-sm">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {myNotes.map((note) => (
                <div
                  key={note.id}
                  className="border border-gray-200 rounded p-3 flex justify-between items-start"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{note.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {note.content}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-red-500 hover:text-red-700 text-sm ml-3 shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exploit Section */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-red-800 text-lg">
            RLS Vulnerability Demo
          </h2>
          <p className="text-sm text-red-700">
            The button below runs{" "}
            <code className="bg-red-100 px-1 py-0.5 rounded font-mono text-xs">
              SELECT * FROM notes
            </code>{" "}
            without any user_id filter. Without proper Row Level Security
            policies, this will return <strong>every user&apos;s</strong> private
            notes.
          </p>

          <button
            onClick={exploitFetchAllNotes}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold"
          >
            View ALL Notes (RLS Bug)
          </button>

          {exploitError && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
              Error: {exploitError}
            </p>
          )}

          {allNotes !== null && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-red-800">
                Returned {allNotes.length} note(s) total -{" "}
                {otherUsersNotes.length} from OTHER users:
              </p>

              {allNotes.length === 0 && (
                <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                  No notes returned - RLS is working correctly!
                </p>
              )}

              {otherUsersNotes.length === 0 && allNotes.length > 0 && (
                <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                  Only your own notes were returned - RLS is working
                  correctly!
                </p>
              )}

              {otherUsersNotes.length > 0 && (
                <p className="text-sm text-red-700 bg-red-100 p-2 rounded font-bold">
                  VULNERABILITY: You can see {otherUsersNotes.length} note(s)
                  from other users!
                </p>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allNotes.map((note) => {
                  const isMine = note.user_id === user.id;
                  return (
                    <div
                      key={note.id}
                      className={`border rounded p-2 text-sm ${
                        isMine
                          ? "border-gray-200 bg-white"
                          : "border-red-400 bg-red-100"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">
                          {note.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            isMine
                              ? "bg-green-100 text-green-700"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          {isMine ? "Your note" : "OTHER USER"}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        user_id: {note.user_id}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded p-3 text-sm text-yellow-800">
                <strong>How to fix:</strong> Run the commented-out SQL in{" "}
                <code className="bg-yellow-100 px-1 rounded font-mono text-xs">
                  supabase-schema.sql
                </code>{" "}
                (Step 2) in your Supabase SQL Editor. This replaces the
                permissive SELECT policy with one that checks{" "}
                <code className="bg-yellow-100 px-1 rounded font-mono text-xs">
                  auth.uid() = user_id
                </code>
                . Then click the button again to verify the fix.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
