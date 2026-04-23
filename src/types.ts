import { User } from "firebase/auth";

export interface RoomData {
  creatorId: string;
  creatorName: string;
  status: "planning" | "retro";
  revealed: boolean;
  createdAt: any;
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
  createdAt: any;
}

export interface RoomUser {
  id: string;
  name: string;
  avatar?: string;
  group?: string;
  vote: string | null;
  lastSeen: any;
  joinedAt: any;
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
  createdAt: any;
}

export interface Feature {
  title: string;
  desc: string;
  icon: any;
  color: string;
  styles: string;
  iconStyles: string;
}
