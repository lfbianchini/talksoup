import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PlayerCounterProps {
  initialCount: number;
  totalPlayers: number;
}

const PlayerCounter: React.FC<PlayerCounterProps> = ({ initialCount, totalPlayers }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm hover:bg-background/90 transition-all flex items-center gap-1 py-1.5 pl-1.5 pr-2.5">
            <Users size={14} className="text-primary" />
            <span className="font-semibold">{initialCount}/{totalPlayers}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{initialCount} of {totalPlayers} players in lobby</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PlayerCounter;
