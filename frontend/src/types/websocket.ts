export interface WebSocketUser {
  id: string;
  username: string;
  avatar_url: string;
  color: string;
  is_host: boolean;
  is_ready: boolean;
  score: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
} 