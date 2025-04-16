import React, { useMemo } from 'react';
import { Answer, Reaction } from '../types/answer';
import { WebSocketUser } from '../types/websocket';
import AnswerCard from './AnswerCard';
import { motion, AnimatePresence } from 'framer-motion';

interface AnswerListProps {
  answers: Answer[];
  users: Record<string, WebSocketUser>;
  onAddReply: (answerId: string, content: string) => void;
  onViewProfile: (user: WebSocketUser) => void;
  onReaction: (answerId: string, type: Reaction['type'], isRemove: boolean) => void;
}

const AnswerList: React.FC<AnswerListProps> = ({ 
  answers, 
  users, 
  onAddReply,
  onViewProfile,
  onReaction
}) => {
  console.log('Answers:', answers);
  const sortedAnswers = useMemo(() => {
    return [...answers].sort((a, b) => {
      const aUpvotes = a.reactions.find(r => r.type === 'upvote')?.count || 0;
      const bUpvotes = b.reactions.find(r => r.type === 'upvote')?.count || 0;
      return bUpvotes - aUpvotes;
    });
  }, [answers]);

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {sortedAnswers.map((answer) => (
          <motion.div
            key={answer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AnswerCard
              answer={answer}
              users={users}
              onReply={onAddReply}
              onViewProfile={onViewProfile}
              onReaction={onReaction}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AnswerList;
