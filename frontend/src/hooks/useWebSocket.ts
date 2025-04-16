import { useState, useEffect, useCallback } from 'react';
import { User } from '../types/user';

interface WebSocketContext {
  ws: WebSocket | null;
  isConnected: boolean;
  user: User | null;
  currentLobbyPlayers: number;
}

// Create a singleton WebSocket instance
let globalWs: WebSocket | null = null;
let globalIsConnected = false;
let globalUser: User | null = null;
let globalCurrentLobbyPlayers = 0;

export const useWebSocket = (url: string = 'ws://localhost:3001'): WebSocketContext => {
  const [ws, setWs] = useState<WebSocket | null>(globalWs);
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const [user, setUser] = useState<User | null>(globalUser);
  const [currentLobbyPlayers, setCurrentLobbyPlayers] = useState(globalCurrentLobbyPlayers);

  useEffect(() => {
    if (!globalWs || globalWs.readyState === WebSocket.CLOSED) {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log('WebSocket connected');
        globalIsConnected = true;
        setIsConnected(true);
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        globalIsConnected = false;
        setIsConnected(false);
        setUser(null);
        globalUser = null;
        setCurrentLobbyPlayers(0);
        globalCurrentLobbyPlayers = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          switch (message.type) {
            case 'user_info':
              console.log('Received user info:', message.data);
              setUser(message.data);
              globalUser = message.data;
              break;
              
            case 'lobby_joined':
            case 'lobby_updated':
              if (message.data.currentPlayers !== undefined) {
                console.log('Updating player count:', message.data.currentPlayers);
                setCurrentLobbyPlayers(message.data.currentPlayers);
                globalCurrentLobbyPlayers = message.data.currentPlayers;
              }
              break;
              
            case 'lobby_players_updated':
              if (message.data.playerCount !== undefined) {
                console.log('Player count updated:', message.data.playerCount);
                setCurrentLobbyPlayers(message.data.playerCount);
                globalCurrentLobbyPlayers = message.data.playerCount;
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      globalWs = socket;
      setWs(socket);
    }

    return () => {
      // Don't close the WebSocket on component unmount
      // This allows the connection to persist during navigation
    };
  }, [url]);

  return { ws, isConnected, user, currentLobbyPlayers };
}; 