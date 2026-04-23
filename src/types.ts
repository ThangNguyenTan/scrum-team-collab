import { ElementType } from "react";

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toMillis: () => number;
}

export interface RoomData {
  creatorId: string;
  creatorName: string;
  status: "planning" | "retro";
  revealed: boolean;
  createdAt: FirestoreTimestamp;
  currentTicket?: string;
  activeTicketId?: string | null;
}

export interface Ticket {
  id?: string;
  name: string;
  link?: string;
  status: "todo" | "planning" | "completed" | "open";
  estimate?: string | null;
  votesAtCompletion?: number;
  totalUsersAtCompletion?: number;
  order?: number;
  createdAt: FirestoreTimestamp;
}

export interface RoomUser {
  id: string;
  name: string;
  avatar?: string;
  group?: string;
  vote: string | null;
  lastSeen: FirestoreTimestamp;
  joinedAt: FirestoreTimestamp;
}

export interface RetroColumn {
  id: string;
  title: string;
  order: number;
}

export interface RetroCard {
  id: string;
  columnId: string;
  text: string;
  imageUrl?: string;
  upvotes: string[];
  authorName: string;
  authorId: string;
  authorAvatar?: string;
  createdAt: FirestoreTimestamp;
}

export interface Feature {
  title: string;
  desc: string;
  icon: ElementType;
  color: string;
  styles: string;
  iconStyles: string;
}
