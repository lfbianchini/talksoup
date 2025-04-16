export interface Reaction {
  type: 'upvote' | 'downvote' | 'laugh' | 'love' | 'wow';
  count: number;
}

export interface Reply {
  id: string;
  player_id: string;
  content: string;
  created_at: string;
  reactions: Reaction[];
}

export interface Answer {
  id: string;
  player_id: string;
  content: string;
  created_at: string;
  reactions: Reaction[];
  replies: Reply[];
}
