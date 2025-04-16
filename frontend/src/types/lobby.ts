export interface Lobby {
  id: string;
  name: string;
  capacity: number;
  currentPlayers: number;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
  updatedAt: string;
} 