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
    // Toto je "utok" - nacteni VSECH poznamek bez filtrovani podle user_id.
    // Bez spravneho RLS toto vrati soukrome poznamky vsech uzivatelu.
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
        <p>Nacitani...</p>
      </div>
    );
  }

  const otherUsersNotes = allNotes?.filter((n) => n.user_id !== user.id) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Hlavicka */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tajne Poznamky
            </h1>
            <p className="text-sm text-gray-500">
              Prihlasen jako <span className="font-mono">{user.email}</span>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1 rounded"
          >
            Odhlasit se
          </button>
        </div>

        {/* Formular pro novou poznamku */}
        <form
          onSubmit={addNote}
          className="bg-white rounded-lg shadow p-4 space-y-3"
        >
          <h2 className="font-semibold text-gray-800">Nova poznamka</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Nazev"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Napiste svou tajnou poznamku..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Ulozit poznamku
          </button>
        </form>

        {/* Moje poznamky */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-800 mb-3">
            Moje poznamky ({myNotes.length})
          </h2>
          {myNotes.length === 0 ? (
            <p className="text-gray-400 text-sm">Zatim zadne poznamky.</p>
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
                    Smazat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sekce s exploitem */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-red-800 text-lg">
            Ukazka zranitelnosti RLS
          </h2>
          <p className="text-sm text-red-700">
            Tlacitko nize spusti{" "}
            <code className="bg-red-100 px-1 py-0.5 rounded font-mono text-xs">
              SELECT * FROM notes
            </code>{" "}
            bez filtrovani podle user_id. Bez spravnych Row Level Security
            politik toto vrati soukrome poznamky{" "}
            <strong>vsech uzivatelu</strong>.
          </p>

          <button
            onClick={exploitFetchAllNotes}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold"
          >
            Zobrazit VSECHNY poznamky (RLS chyba)
          </button>

          {exploitError && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
              Chyba: {exploitError}
            </p>
          )}

          {allNotes !== null && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-red-800">
                Vraceno {allNotes.length} poznamek celkem -{" "}
                {otherUsersNotes.length} od JINYCH uzivatelu:
              </p>

              {allNotes.length === 0 && (
                <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                  Zadne poznamky nebyly vraceny - RLS funguje spravne!
                </p>
              )}

              {otherUsersNotes.length === 0 && allNotes.length > 0 && (
                <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                  Byly vraceny pouze vase poznamky - RLS funguje spravne!
                </p>
              )}

              {otherUsersNotes.length > 0 && (
                <p className="text-sm text-red-700 bg-red-100 p-2 rounded font-bold">
                  ZRANITELNOST: Vidite {otherUsersNotes.length} poznamek od
                  jinych uzivatelu!
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
                          {isMine ? "Vase poznamka" : "JINY UZIVATEL"}
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
                <strong>Jak opravit:</strong> Spustte zakomentovany SQL v{" "}
                <code className="bg-yellow-100 px-1 rounded font-mono text-xs">
                  supabase-schema.sql
                </code>{" "}
                (Krok 2) ve vasem Supabase SQL Editoru. Tim se nahradi
                permisivni SELECT politika za takovou, ktera kontroluje{" "}
                <code className="bg-yellow-100 px-1 rounded font-mono text-xs">
                  auth.uid() = user_id
                </code>
                . Pote znovu kliknete na tlacitko pro overeni opravy.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
