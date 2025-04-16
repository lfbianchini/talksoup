import React from 'react';
import { ThumbsUp, ThumbsDown, Laugh, Heart, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

type ReactionType = 'upvote' | 'downvote' | 'laugh' | 'love' | 'wow';

export interface ReactionButtonProps {
  type: ReactionType;
  count: number;
  isActive?: boolean;
  onClick: () => void;
  label?: string;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  type,
  count,
  isActive,
  onClick,
  label,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'upvote':
        return <ThumbsUp size={16} />;
      case 'downvote':
        return <ThumbsDown size={16} />;
      case 'laugh':
        return <Laugh size={16} />;
      case 'love':
        return <Heart size={16} />;
      case 'wow':
        return <Eye size={16} />;
      default:
        return <ThumbsUp size={16} />;
    }
  };
  
  const getActiveColor = () => {
    switch (type) {
      case 'upvote':
        return 'text-green-500';
      case 'downvote':
        return 'text-red-500';
      case 'laugh':
        return 'text-amber-500';
      case 'love':
        return 'text-rose-500';
      case 'wow':
        return 'text-blue-500';
      default:
        return 'text-primary';
    }
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "reaction-button",
        isActive && getActiveColor()
      )}
    >
      {getIcon()}
      {count > 0 && <span>{count}</span>}
    </button>
  );
};

export default ReactionButton;
