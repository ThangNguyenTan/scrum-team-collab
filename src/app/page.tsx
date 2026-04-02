"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { LayoutPanelLeft, Users, Zap, CheckCircle2, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      // Auto-redirect to last room if logged in and at root
      if (u) {
        const lastRoom = localStorage.getItem("scrum_last_room");
        if (lastRoom) {
          router.push(`/room/${lastRoom}`);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const createRoom = async () => {
    if (!user) return;
    setCreating(true);
    try {
      // Create a new room in Firestore
      const roomRef = await addDoc(collection(db, "rooms"), {
        creatorId: user.uid,
        creatorName: user.displayName,
        status: "planning", // default starting mode
        revealed: false,
        createdAt: serverTimestamp(),
      });
      
      // Redirect to the new room
      router.push(`/room/${roomRef.id}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0b] text-white selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ScrumCollab</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <img 
                  src={user.photoURL || ""} 
                  alt={user.displayName || "User"} 
                  className="h-8 w-8 rounded-full border border-white/10"
                />
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="rounded-full bg-white/5 py-2 px-6 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:ring-1 hover:ring-white/20"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative flex-grow flex items-center justify-center overflow-hidden pt-16">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute top-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]"></div>

        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="flex flex-col items-center gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-400"></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Real-time Collaboration</span>
              </div>
              
              <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
                Agile teams stay <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">in perfect sync.</span>
              </h1>
              
              <p className="max-w-xl text-lg leading-relaxed text-zinc-400">
                The ultimate friction-free tool for Sprint Planning and Retrospectives. 
                Guests join via URL—no account creation required for your team members.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {user ? (
                  <button 
                    onClick={createRoom}
                    disabled={creating}
                    className="group relative flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] disabled:opacity-50"
                  >
                    {creating ? "Creating Room..." : "Create new Scrum Room"}
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                ) : (
                  <button 
                    onClick={handleLogin}
                    className="flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-white/10 hover:ring-1 hover:ring-white/30"
                  >
                    <img src="https://www.google.com/favicon.ico" className="h-5 w-5" alt="Google" />
                    Sign in with Google to start
                  </button>
                )}
                <div className="flex -space-x-3 overflow-hidden ml-4">
                  {[1,2,3,4].map(i => (
                    <img 
                      key={i}
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-[#0a0a0b]" 
                      src={`https://i.pravatar.cc/100?u=${i}`} 
                      alt="" 
                    />
                  ))}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-[10px] ring-2 ring-[#0a0a0b]">+12</div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="group rounded-3xl border border-white/5 bg-gradient-to-b from-white/10 to-transparent p-8 backdrop-blur-xl transition-all hover:border-white/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Planning Poker</h3>
                <p className="text-zinc-400">Fibonacci-based voting with instant average calculation and admin reveal controls.</p>
              </div>
              
              <div className="group rounded-3xl border border-white/5 bg-gradient-to-b from-white/10 to-transparent p-8 backdrop-blur-xl transition-all hover:border-white/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                  <LayoutPanelLeft className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Retrospectives</h3>
                <p className="text-zinc-400">Real-time Kanban boards with upvoting and customizable columns for deep team insights.</p>
              </div>
              
              <div className="group rounded-3xl border border-white/5 bg-gradient-to-b from-white/10 to-transparent p-8 backdrop-blur-xl transition-all hover:border-white/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Guest Access</h3>
                <p className="text-zinc-400">Teammates join via URL with one click. No login fatigue, just collaboration.</p>
              </div>
              
              <div className="group rounded-3xl border border-white/5 bg-gradient-to-b from-white/10 to-transparent p-8 backdrop-blur-xl transition-all hover:border-white/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Export Ready</h3>
                <p className="text-zinc-400">Generate professional PDFs or clean CSVs of your session data instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-zinc-500">
          © 2026 ScrumCollab. Built for high-performance agile teams.
        </div>
      </footer>
    </div>
  );
}
