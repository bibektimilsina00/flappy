export interface CommunityWork {
  id: string;
  title: string;
  author: string;
  duration: string; // "1:03"
  timeAgo: string; // "2 weeks ago"
  gradient: string; // thumbnail background
  likes: number;
  bookmarks: number;
  comments: number;
  badge?: string; // e.g. "Short Film · Episode 3 of 4"
}
