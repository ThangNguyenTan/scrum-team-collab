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
  updateDoc,
  limit
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { copyToClipboard } from "@/lib/utils";
import { RoomData, RoomUser, RetroColumn, RetroCard } from "@/types";
import { EMOJIS } from "@/constants";
import { playTada, playSuccess, playFail, playPing } from "@/lib/audioSynth";
import { ReactionOverlay } from "@/components/room/ReactionOverlay";
import { ReactionsPanel } from "@/components/room/ReactionsPanel";
import { ExportModal } from "@/components/room/ExportModal";
import { generateMeetingSummary } from "@/lib/exportUtils";
import { Ticket } from "@/types";

// Extracted Components
import { PlanningBoard } from "@/components/room/PlanningBoard";
import { RetroBoard } from "@/components/room/RetroBoard";
import { UserSidebar } from "@/components/room/UserSidebar";
import { JoinRoomModal } from "@/components/room/JoinRoomModal";
import { RoomHeader } from "@/components/room/RoomHeader";
import { CustomDialog, useCustomDialog } from "@/components/room/CustomDialog";

export default function RoomPage() {
  const { id: roomId } = useParams() as { id: string };
  const router = useRouter();
  const { confirmCustom, dialogProps } = useCustomDialog();
  
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
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMarkdown, setExportMarkdown] = useState("");

  const isAdmin = useMemo(() => user?.uid === room?.creatorId, [user, room]);

  // --- Auth & Session ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      
      const syncAuth = async () => {
        const globalName = localStorage.getItem("scrum_user_name");
        const roomSpecificName = localStorage.getItem(`scrum_name_${roomId}`);
        const savedName = roomSpecificName || globalName;
        
        const globalAvatar = localStorage.getItem("scrum_user_avatar");
        const roomSpecificAvatar = localStorage.getItem(`scrum_avatar_${roomId}`);
        const savedAvatar = roomSpecificAvatar || globalAvatar;

        const globalGroup = localStorage.getItem("scrum_user_group");
        const roomSpecificGroup = localStorage.getItem(`scrum_group_${roomId}`);
        const savedGroup = roomSpecificGroup || globalGroup;

        // Initialize state from storage only if not already set
        if (savedName) setDisplayName(prev => prev || savedName);
        if (savedAvatar) setAvatar(prev => prev || savedAvatar);
        if (savedGroup) setUserGroup(prev => prev || savedGroup);

        // Fallback for avatar if nothing in storage and nothing in state
        if (!savedAvatar) {
          setAvatar(prev => {
            if (prev) return prev;
            return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
          });
        }

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
            avatar: savedAvatar || avatar || EMOJIS[0],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Removed router and avatar from dependencies

  // Rest unchanged ...
  useEffect(() => {
    if (roomId) {
      localStorage.setItem("scrum_last_room", roomId);
    }

    const lastTab = localStorage.getItem(`scrum_tab_${roomId}`) as "planning" | "retro";
    if (lastTab) setTimeout(() => setActiveTab(lastTab), 0);
  }, [roomId]);

  // --- Heartbeat & Cleanup ---
  useEffect(() => {
    if (!user || !roomId) return;

    // Throttle heartbeat to 2 minutes to reduce read/write costs significantly
    const heartbeat = setInterval(async () => {
      await updateDoc(doc(db, "rooms", roomId, "users", user.uid), {
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }, 120000);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, roomId]);

  // Handle auto-join for creator separately from the listeners
  useEffect(() => {
    if (room && user && user.uid === room.creatorId) {
      const sessionJoined = sessionStorage.getItem(`scrum_joined_${roomId}`);
      if (!sessionJoined) {
        sessionStorage.setItem(`scrum_joined_${roomId}`, "true");
        
        setTimeout(() => {
          setUserHasJoined(true);
          setShowJoinModal(false);
        }, 0);
        
        const creatorAvatar = avatar || localStorage.getItem("scrum_user_avatar") || EMOJIS[0];
        const creatorName = room.creatorName || displayName || localStorage.getItem("scrum_user_name") || "Creator";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.creatorId, user?.uid, roomId]);

  // --- Data Listeners ---
  useEffect(() => {
    if (!roomId) return;

    const roomSub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (snap.exists()) {
        const roomData = snap.data() as RoomData;
        setRoom(roomData);
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
          // Match the increased heartbeat interval (user considered offline after 1 hour of no activity)
          return now - u.lastSeen.seconds < 3600;
        });
      setUsers(uList.sort((a,b) => (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0)));
    });

    let colsSub = () => {};
    let cardsSub = () => {};

    // Only subscribe to retro data if we are actually viewing the retro board
    // This saves a huge amount of reads during planning sessions
    if (activeTab === "retro") {
      colsSub = onSnapshot(
        query(collection(db, "rooms", roomId, "columns"), orderBy("order")), 
        (snap) => {
          const cList = snap.docs.map(d => ({ id: d.id, ...d.data() } as RetroColumn));
          setColumns(cList);
        }
      );

      cardsSub = onSnapshot(
        query(collection(db, "rooms", roomId, "cards"), orderBy("createdAt")), 
        (snap) => {
          const dList = snap.docs.map(d => ({ id: d.id, ...d.data() } as RetroCard));
          setCards(dList);
        }
      );
    }

    return () => {
      roomSub();
      usersSub();
      colsSub();
      cardsSub();
    };
  }, [roomId, activeTab, router]); // Minimized dependencies to prevent redundant resubscriptions

  // --- Real-time Synchronized Soundboard listener ---
  useEffect(() => {
    if (!roomId) return;
    const startTimestamp = Date.now() - 3000; // 3-second buffer to ignore older sounds on join
    const processedIds = new Set<string>();

    const q = query(
      collection(db, "rooms", roomId, "sounds"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const docId = change.doc.id;

          if (processedIds.has(docId)) return;
          processedIds.add(docId);

          const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
          if (createdAt > startTimestamp) {
            const soundType = data.soundType;
            if (soundType === "tada") playTada();
            else if (soundType === "success") playSuccess();
            else if (soundType === "fail") playFail();
            else if (soundType === "ping") playPing();
          }
        }
      });
    });

    return () => unsub();
  }, [roomId]);

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
        const defaults = [
          { title: "What went well", color: "emerald" },
          { title: "What could be improved", color: "rose" },
          { title: "Action Items", color: "purple" }
        ];
        for (let i = 0; i < defaults.length; i++) {
          await addDoc(collection(db, "rooms", roomId, "columns"), {
            title: defaults[i].title,
            color: defaults[i].color,
            order: i
          });
        }
      }
    }
  };

  const handleKickUser = async (userId: string) => {
    if (!isAdmin || !roomId) return;
    const confirmed = await confirmCustom("Remove User", "Are you sure you want to remove this user from the room?", "danger", "Remove");
    if (confirmed) {
      await deleteDoc(doc(db, "rooms", roomId, "users", userId));
    }
  };

  const handleTransferHost = async (targetUser: RoomUser) => {
    if (!isAdmin || !roomId || targetUser.id === user?.uid) return;
    const confirmed = await confirmCustom("Transfer Host Role", `Transfer Host (Admin) role to ${targetUser.name}? You will lose administrative privileges.`, "danger", "Transfer");
    if (confirmed) {
      await updateDoc(doc(db, "rooms", roomId), {
        creatorId: targetUser.id,
        creatorName: targetUser.name
      });
      localStorage.removeItem(`scrum_is_creator_${roomId}`);
    }
  };

  const handleExport = async () => {
    if (!roomId) return;
    
    // Fetch all tickets
    const ticketsSnap = await getDocs(query(collection(db, "rooms", roomId, "tickets")));
    const allTickets = ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
    
    // Fetch all columns
    const colsSnap = await getDocs(query(collection(db, "rooms", roomId, "columns")));
    const allColumns = colsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RetroColumn));
    
    // Fetch all cards
    const cardsSnap = await getDocs(query(collection(db, "rooms", roomId, "cards")));
    const allCards = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RetroCard));
    
    const markdown = generateMeetingSummary(allTickets, allColumns, allCards);
    setExportMarkdown(markdown);
    setShowExportModal(true);
  };

  if (loading || (!room && !showJoinModal)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" suppressHydrationWarning>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" suppressHydrationWarning></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden relative" suppressHydrationWarning>
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(67,56,202,0.08),transparent_50%)] pointer-events-none"></div>
      
      {/* Floating live reaction overlay */}
      <ReactionOverlay roomId={roomId} />
      
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
        onExportClick={handleExport}
      />

      <div className="flex flex-1 overflow-hidden">
        <UserSidebar 
          sortedUsers={sortedUsers} 
          room={room} 
          user={user} 
          setShowJoinModal={setShowJoinModal}
          isAdmin={isAdmin}
          onKickUser={handleKickUser}
          onTransferHost={handleTransferHost}
        />

        <main className="flex-1 bg-zinc-50/50 dark:bg-black/40 overflow-hidden relative">
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

      {/* Floating control dock for reactions & sounds */}
      {user && (
        <ReactionsPanel 
          roomId={roomId} 
          senderId={user.uid} 
          senderName={displayName} 
        />
      )}

      {showExportModal && (
        <ExportModal 
          markdown={exportMarkdown} 
          onClose={() => setShowExportModal(false)} 
        />
      )}
      <CustomDialog {...dialogProps} />
    </div>
  );
}
