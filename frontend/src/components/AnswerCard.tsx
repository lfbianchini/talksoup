import React, { useState, useEffect } from 'react';
import { Answer, Reaction } from '../types/answer';
import { WebSocketUser } from '../types/websocket';
import UserAvatar from './UserAvatar';
import ReactionButton from './ReactionButton';
import ReplySection from './ReplySection';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';

type ReactionType = Reaction['type'];

interface AnswerCardProps {
  answer: Answer;
  users: Record<string, WebSocketUser>;
  onReply: (answerId: string, content: string) => void;
  onViewProfile: (user: WebSocketUser) => void;
  onReaction: (answerId: string, type: ReactionType, isRemove: boolean) => void;
}

const REACTION_TYPES: { type: ReactionType; label: string }[] = [
  { type: 'upvote', label: 'Upvote' },
  { type: 'love', label: 'Love' },
  { type: 'laugh', label: 'Laugh' },
  { type: 'wow', label: 'Wow' },
  { type: 'downvote', label: 'Downvote' },
];

const AnswerCard: React.FC<AnswerCardProps> = ({ 
  answer, 
  users, 
  onReply,
  onViewProfile,
  onReaction
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [activeReactions, setActiveReactions] = useState<ReactionType[]>([]);

  const { ws, isConnected } = useWebSocket();

  useEffect(() => {
    // Only request user info if we have a valid player_id and don't already have the user data
    if (answer.player_id && !users[answer.player_id]) {
      console.log('Requesting user info for answer author:', answer.player_id);
      ws.send(JSON.stringify({
        type: 'get_user_info',
        data: { userId: answer.player_id }
      }));
    }
  }, [answer.player_id, users, ws]);

  // Get user info for the answer author
  const user = answer.player_id ? users[answer.player_id] : null;

  // If we don't have valid user data but have a player_id, show loading state
  if (!user && answer.player_id) {
    return (
      <div className="bg-card p-4 rounded-lg shadow-sm">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  } else if (!user) {
    // If we don't have a user and no valid player_id, show error state
    return (
      <div className="bg-destructive/10 p-4 rounded-lg shadow-sm">
        <div className="text-destructive">Error: Invalid user data</div>
      </div>
    );
  }

  const handleReaction = (type: ReactionType) => {
    const isActive = activeReactions.includes(type);
    onReaction(answer.id, type, isActive);
    
    // Update local state only after sending the request
    setActiveReactions(prev => 
      isActive
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Get reaction count for a specific type
  const getReactionCount = (type: ReactionType) => {
    const reaction = answer.reactions.find(r => r.type === type);
    return reaction ? reaction.count : 0;
  };

  return (
    <div 
      className={cn(
        "answer-card group bg-card p-4 rounded-lg shadow-sm mb-4 transition-all duration-300 animate-fade-in-up",
        activeReactions.includes('upvote') && "border-l-4 border-primary"
      )}
    >
      <div className="flex gap-3">
        <div className="cursor-pointer" onClick={() => onViewProfile(user)}>
          <UserAvatar user={user} size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 
              className="font-bold cursor-pointer hover:text-primary transition-colors" 
              onClick={() => onViewProfile(user)}
            >
              {user.username}
            </h3>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(answer.created_at)}
            </span>
          </div>
          <p className="my-2">{answer.content}</p>
          
          {/* Reaction buttons */}
          <div className="flex flex-wrap gap-4 mt-3 opacity-70 group-hover:opacity-100 transition-opacity">
            {REACTION_TYPES.map(({ type, label }) => (
              <ReactionButton
                key={type}
                type={type}
                count={getReactionCount(type)}
                isActive={activeReactions.includes(type)}
                onClick={() => handleReaction(type)}
                label={label}
              />
            ))}
            
            <button 
              onClick={() => setShowReplies(!showReplies)}
              className="reaction-button ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare size={16} />
              <span>{answer.replies.length} {answer.replies.length === 1 ? 'reply' : 'replies'}</span>
              {showReplies ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Replies section */}
      {showReplies && (
        <div className="mt-4 pl-12">
          <ReplySection
            replies={answer.replies}
            users={users}
            onAddReply={(content) => onReply(answer.id, content)}
            onViewProfile={onViewProfile}
          />
        </div>
      )}
    </div>
  );
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
};

export default AnswerCard;
