"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  onAuthStateChanged, 
  signInAnonymously,
  User 
} from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  serverTimestamp,
  addDoc,
  deleteDoc,
  getDocs,
  updateDoc
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cn, copyToClipboard } from "@/lib/utils";
import { RoomData, RoomUser, RetroColumn, RetroCard } from "@/types";
import { EMOJIS } from "@/constants";

// Extracted Components
import { PlanningBoard } from "@/components/room/PlanningBoard";
import { RetroBoard } from "@/components/room/RetroBoard";
import { UserSidebar } from "@/components/room/UserSidebar";
import { JoinRoomModal } from "@/components/room/JoinRoomModal";
import { RoomHeader } from "@/components/room/RoomHeader";

export default function RoomPage() {
  const { id: roomId } = useParams() as { id: string };
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");
  const [userGroup, setUserGroup] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"planning" | "retro">("planning");
  const [room, setRoom] = useState<RoomData | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [columns, setColumns] = useState<RetroColumn[]>([]);
  const [cards, setCards] = useState<RetroCard[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [idCopyFeedback, setIdCopyFeedback] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState(false);
  const [userHasJoined, setUserHasJoined] = useState(false);

  const isAdmin = useMemo(() => user?.uid === room?.creatorId, [user, room]);

  // --- Auth & Session ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const syncAuth = async () => {
        setUser(u);
        
        const globalName = localStorage.getItem("scrum_user_name");
        const roomSpecificName = localStorage.getItem(`scrum_name_${roomId}`);
        const savedName = roomSpecificName || globalName;
        
        const globalAvatar = localStorage.getItem("scrum_user_avatar");
        const roomSpecificAvatar = localStorage.getItem(`scrum_avatar_${roomId}`);
        const savedAvatar = roomSpecificAvatar || globalAvatar;

        const globalGroup = localStorage.getItem("scrum_user_group");
        const roomSpecificGroup = localStorage.getItem(`scrum_group_${roomId}`);
        const savedGroup = roomSpecificGroup || globalGroup;

        const defaultEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        if (savedName) setDisplayName(savedName);
        if (savedAvatar) setAvatar(savedAvatar);
        else if (!avatar) setAvatar(defaultEmoji);
        if (savedGroup) setUserGroup(savedGroup);

        const isCreator = localStorage.getItem(`scrum_is_creator_${roomId}`) === "true";
        const sessionJoined = sessionStorage.getItem(`scrum_joined_${roomId}`);
        
        if (!u) {
          await signInAnonymously(auth);
        }
        
        if ((!sessionJoined && !isCreator) || !savedGroup) {
          setShowJoinModal(true);
        } else {
          setUserHasJoined(true);
        }

        if (u && savedName) {
          // If already joined in session or is creator, sync with Firestore
          await setDoc(doc(db, "rooms", roomId, "users", u.uid), {
            name: savedName,
            avatar: savedAvatar || defaultEmoji,
            group: savedGroup || "",
            lastSeen: serverTimestamp(),
            joinedAt: serverTimestamp(),
          }, { merge: true });
          
          if (isCreator) {
            sessionStorage.setItem(`scrum_joined_${roomId}`, "true");
            setUserHasJoined(true);
          }
        }

        setLoading(false);
      };

      syncAuth();
    });
    return () => unsubscribe();
  }, [roomId, router]);

  useEffect(() => {
    if (roomId) {
      localStorage.setItem("scrum_last_room", roomId);
    }

    const lastTab = localStorage.getItem(`scrum_tab_${roomId}`) as "planning" | "retro";
    if (lastTab) setActiveTab(lastTab);
  }, [roomId]);

  // --- Heartbeat & Cleanup ---
  useEffect(() => {
    if (!user || !roomId) return;

    const heartbeat = setInterval(async () => {
      await updateDoc(doc(db, "rooms", roomId, "users", user.uid), {
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }, 30000);

    const handleUnload = () => {
      if (user?.uid && roomId) {
        deleteDoc(doc(db, "rooms", roomId, "users", user.uid));
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user, roomId]);

  useEffect(() => {
    if (room && isAdmin && !displayName && room.creatorName) {
      setDisplayName(room.creatorName);
    }
  }, [room, isAdmin, displayName]);

  // --- Data Listeners ---
  useEffect(() => {
    if (!roomId) return;

    const roomSub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (snap.exists()) {
        const roomData = snap.data() as RoomData;
        setRoom(roomData);
        
        // Auto-join if creator
        if (user?.uid === roomData.creatorId) {
          const sessionJoined = sessionStorage.getItem(`scrum_joined_${roomId}`);
          if (!sessionJoined) {
            sessionStorage.setItem(`scrum_joined_${roomId}`, "true");
            setUserHasJoined(true);
            setShowJoinModal(false);
            
            // Sync creator presence to Firestore immediately if not already there
            const creatorAvatar = avatar || localStorage.getItem("scrum_user_avatar") || EMOJIS[0];
            const creatorName = roomData.creatorName || displayName || localStorage.getItem("scrum_user_name") || "Creator";
            const creatorGroup = userGroup || localStorage.getItem("scrum_user_group") || "";

            setDoc(doc(db, "rooms", roomId, "users", user.uid), {
              name: creatorName,
              avatar: creatorAvatar,
              group: creatorGroup,
              lastSeen: serverTimestamp(),
              joinedAt: serverTimestamp(),
            }, { merge: true });
          }
        }
      } else {
        router.push("/");
      }
    });

    const usersSub = onSnapshot(collection(db, "rooms", roomId, "users"), (snap) => {
      const now = Date.now() / 1000;
      const uList = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as RoomUser))
        .filter(u => {
          if (!u.lastSeen?.seconds) return true; 
          return now - u.lastSeen.seconds < 600;
        });
      setUsers(uList.sort((a,b) => a.joinedAt?.seconds - b.joinedAt?.seconds));
    });

    const colsSub = onSnapshot(
      query(collection(db, "rooms", roomId, "columns"), orderBy("order")), 
      (snap) => {
        const cList = snap.docs.map(d => ({ id: d.id, ...d.data() } as RetroColumn));
        setColumns(cList);
      }
    );

    const cardsSub = onSnapshot(
      query(collection(db, "rooms", roomId, "cards"), orderBy("createdAt")), 
      (snap) => {
        const dList = snap.docs.map(d => ({ id: d.id, ...d.data() } as RetroCard));
        setCards(dList);
      }
    );

    return () => {
      roomSub();
      usersSub();
      colsSub();
      cardsSub();
    };
  }, [roomId, router, user, displayName, avatar]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.id === room?.creatorId) return -1;
      if (b.id === room?.creatorId) return 1;
      return (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0);
    });
  }, [users, room]);

  const handleJoin = async (name: string, group: string) => {
    if (!name.trim()) return;
    
    setDisplayName(name);
    setUserGroup(group);
    localStorage.setItem(`scrum_name_${roomId}`, name);
    localStorage.setItem("scrum_user_name", name);
    localStorage.setItem(`scrum_avatar_${roomId}`, avatar);
    localStorage.setItem("scrum_user_avatar", avatar);
    localStorage.setItem(`scrum_group_${roomId}`, group);
    localStorage.setItem("scrum_user_group", group);
    sessionStorage.setItem(`scrum_joined_${roomId}`, "true");
    setUserHasJoined(true);
    setShowJoinModal(false);

    let uid = user?.uid;
    if (!uid) {
      const anon = await signInAnonymously(auth);
      uid = anon.user.uid;
    }

    await setDoc(doc(db, "rooms", roomId, "users", uid), {
      name,
      avatar,
      group,
      vote: null,
      joinedAt: serverTimestamp(),
    });
  };

  const handleTabSwitch = async (tab: "planning" | "retro") => {
    setActiveTab(tab);
    localStorage.setItem(`scrum_tab_${roomId}`, tab);
    
    if (tab === "retro" && roomId) {
      const colSnap = await getDocs(collection(db, "rooms", roomId, "columns"));
      if (colSnap.empty) {
        const defaults = ["What went well", "What could be improved", "Action Items"];
        for (let i = 0; i < defaults.length; i++) {
          await addDoc(collection(db, "rooms", roomId, "columns"), {
            title: defaults[i],
            order: i
          });
        }
      }
    }
  };

  if (loading || (!room && !showJoinModal)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]" suppressHydrationWarning>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" suppressHydrationWarning></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b] text-white overflow-hidden relative" suppressHydrationWarning>
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(67,56,202,0.08),transparent_50%)] pointer-events-none"></div>
      
      <RoomHeader 
        roomId={roomId}
        activeTab={activeTab}
        handleTabSwitch={handleTabSwitch}
        users={users}
        copyToClipboard={copyToClipboard}
        idCopyFeedback={idCopyFeedback}
        setIdCopyFeedback={setIdCopyFeedback}
        inviteFeedback={inviteFeedback}
        setInviteFeedback={setInviteFeedback}
        onLogoClick={() => router.push("/")}
      />

      <div className="flex flex-1 overflow-hidden">
        <UserSidebar 
          sortedUsers={sortedUsers} 
          room={room} 
          user={user} 
          setShowJoinModal={setShowJoinModal}
        />

        <main className="flex-1 bg-black/40 overflow-hidden relative">
          {activeTab === "planning" ? (
             <PlanningBoard 
               room={room as RoomData} 
               roomId={roomId} 
               users={users} 
               isAdmin={isAdmin} 
               currentUserId={user?.uid || ""} 
             />
          ) : (
            <RetroBoard 
              room={room}
              roomId={roomId}
              users={users}
              columns={columns}
              cards={cards}
              isAdmin={isAdmin}
              currentUserId={user?.uid || ""}
              displayName={displayName}
              avatar={avatar}
            />
          )}
        </main>
      </div>

      {showJoinModal && (
        <JoinRoomModal 
          avatar={avatar}
          defaultName={displayName}
          defaultGroup={userGroup}
          buttonText={userHasJoined ? "Update Profile" : "Join Room"}
          setAvatar={setAvatar}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          handleJoin={handleJoin}
          onClose={userHasJoined ? () => setShowJoinModal(false) : undefined}
        />
      )}
    </div>
  );
}
