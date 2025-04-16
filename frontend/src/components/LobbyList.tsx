
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { User } from '../data/mockData';
import UserAvatar from './UserAvatar';
import { LogIn, Plus, Shuffle } from 'lucide-react';

interface LobbyListProps {
  lobbies: {
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    host: User;
  }[];
  onJoinLobby: (lobbyId: string) => void;
  onViewHost: (host: User) => void;
  onCreateLobby?: () => void;
  onJoinRandom?: () => void;
}

const LobbyList: React.FC<LobbyListProps> = ({ 
  lobbies, 
  onJoinLobby, 
  onViewHost, 
  onCreateLobby, 
  onJoinRandom 
}) => {
  return (
    <div className="bg-card rounded-lg shadow-md border p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Available Lobbies</h2>
        <div className="flex gap-2">
          {onCreateLobby && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onCreateLobby}
              className="gap-1"
            >
              <Plus size={16} />
              Create Lobby
            </Button>
          )}
          {onJoinRandom && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onJoinRandom}
              className="gap-1"
            >
              <Shuffle size={16} />
              Random
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="h-[250px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Game</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Players</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lobbies.map((lobby) => (
              <TableRow key={lobby.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{lobby.name}</TableCell>
                <TableCell>
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-primary" 
                    onClick={() => onViewHost(lobby.host)}
                  >
                    <UserAvatar user={lobby.host} size="sm" />
                    <span>{lobby.host.nickname}</span>
                  </div>
                </TableCell>
                <TableCell>{lobby.players}/{lobby.maxPlayers}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => onJoinLobby(lobby.id)}
                    className="gap-1"
                  >
                    <LogIn size={14} />
                    Join
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default LobbyList;
