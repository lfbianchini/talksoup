import React from 'react';
import { Button } from '@/components/ui/button';
import PlayerCounter from './PlayerCounter';
import { LogOut } from 'lucide-react';

interface GameHeaderProps {
  onLeaveGame: () => void;
  playerCount: number;
  totalPlayers: number;
}

const GameHeader: React.FC<GameHeaderProps> = ({ onLeaveGame, playerCount, totalPlayers }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-2xl font-bold">TalkSoup</h1>
      <div className="flex items-center gap-3">
        <PlayerCounter initialCount={playerCount} totalPlayers={totalPlayers} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onLeaveGame} 
          className="gap-2"
        >
          <LogOut size={16} />
          Leave Game
        </Button>
      </div>
    </div>
  );
};

export default GameHeader;
