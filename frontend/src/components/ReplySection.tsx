
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import UserAvatar from './UserAvatar';
import { Reply } from '../types/answer';
import { WebSocketUser } from '../types/websocket';
import { Input } from './ui/input';
import { Send, Reply as ReplyIcon } from 'lucide-react';

interface ReplySectionProps {
  replies: Reply[];
  users: Record<string, WebSocketUser>;
  onAddReply: (content: string) => void;
  onViewProfile: (user: WebSocketUser) => void;
}

const ReplySection: React.FC<ReplySectionProps> = ({ 
  replies, 
  users, 
  onAddReply,
  onViewProfile
}) => {
  const [newReply, setNewReply] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReply.trim()) {
      onAddReply(newReply);
      setNewReply('');
    }
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

  return (
    <div className="space-y-4">
      {replies.length > 0 && (
        <div className="border-l-2 border-border pl-4 space-y-4">
          {replies.map((reply) => {
            const user = users[reply.player_id];
            if (!user) {
              console.error(`User with ID ${reply.player_id} not found for reply`);
              return null;
            }
            
            return (
              <div key={reply.id} className="flex gap-3">
                <div className="cursor-pointer" onClick={() => onViewProfile(user)}>
                  <UserAvatar user={user} size="sm" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 
                      className="font-bold cursor-pointer hover:text-primary transition-colors"
                      onClick={() => onViewProfile(user)}
                    >
                      {user.username}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(reply.created_at)}
                    </span>
                  </div>
                  <p className="my-1">{reply.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <Input
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          placeholder="Write a reply..."
          className="flex-1"
        />
        <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
};

export default ReplySection;
