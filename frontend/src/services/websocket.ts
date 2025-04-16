import { create } from 'zustand';

interface Lobby {
  id: string;
  name: string;
  capacity: number;
  currentPlayers: number;
  hostId: string;
  status: 'waiting' | 'in_progress' | 'finished';
  createdAt: string;
}

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  lobbies: Lobby[];
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  createLobby: (name: string, capacity: number) => void;
  joinLobby: (lobbyId: string) => void;
  leaveLobby: (lobbyId: string) => void;
}

export const useWebSocket = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  lobbies: [],
  error: null,

  connect: () => {
    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
      set({ socket, isConnected: true, error: null });
    };

    socket.onclose = () => {
      set({ socket: null, isConnected: false });
    };

    socket.onerror = (error) => {
      set({ error: 'WebSocket connection error' });
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'lobbies':
          set({ lobbies: message.data });
          break;
          
        case 'lobby_created':
          set((state) => ({
            lobbies: [...state.lobbies, message.data]
          }));
          break;
          
        case 'lobby_updated':
          set((state) => ({
            lobbies: state.lobbies.map(lobby => 
              lobby.id === message.data.id ? message.data : lobby
            )
          }));
          break;
          
        case 'lobby_removed':
          set((state) => ({
            lobbies: state.lobbies.filter(lobby => lobby.id !== message.data)
          }));
          break;
          
        case 'error':
          set({ error: message.data });
          break;
      }
    };
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  createLobby: (name: string, capacity: number) => {
    const { socket } = get();
    if (socket) {
      socket.send(JSON.stringify({
        type: 'create_lobby',
        name,
        capacity
      }));
    }
  },

  joinLobby: (lobbyId: string) => {
    const { socket } = get();
    if (socket) {
      socket.send(JSON.stringify({
        type: 'join_lobby',
        lobbyId
      }));
    }
  },

  leaveLobby: (lobbyId: string) => {
    const { socket } = get();
    if (socket) {
      socket.send(JSON.stringify({
        type: 'leave_lobby',
        lobbyId
      }));
    }
  }
})); 