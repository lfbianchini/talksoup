
import React from 'react';
import LobbyList from './LobbyList';
import UserProfileModal from './UserProfileModal';
import { User } from '../data/mockData';

interface GameLobbyProps {
  lobbies: {
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    host: User;
  }[];
  selectedUser: User | null;
  showUserProfile: boolean;
  onJoinLobby: (lobbyId: string) => void;
  onViewProfile: (user: User) => void;
  onCloseUserProfile: () => void;
  onCreateLobby: () => void;
  onJoinRandom: () => void;
  onAddFriend: (userId: string) => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({
  lobbies,
  selectedUser,
  showUserProfile,
  onJoinLobby,
  onViewProfile,
  onCloseUserProfile,
  onCreateLobby,
  onJoinRandom,
  onAddFriend
}) => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">TalkSoup</h1>
        <LobbyList 
          lobbies={lobbies} 
          onJoinLobby={onJoinLobby}
          onViewHost={onViewProfile}
          onCreateLobby={onCreateLobby}
          onJoinRandom={onJoinRandom}
        />
      </div>
      <UserProfileModal
        user={selectedUser}
        isOpen={showUserProfile}
        onClose={onCloseUserProfile}
        onAddFriend={onAddFriend}
      />
    </div>
  );
};

export default GameLobby;
