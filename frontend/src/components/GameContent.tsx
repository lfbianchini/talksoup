import React from 'react';
import QuestionPrompt from './QuestionPrompt';
import AnswerInput from './AnswerInput';
import AnswerList from './AnswerList';
import QuestionTimer from './QuestionTimer';
import { Answer, Reaction } from '../types/answer';
import { Question } from '../types/question';
import { WebSocketUser } from '../types/websocket';

interface GameContentProps {
  timeRemaining: number;
  totalDuration: number;
  currentQuestion: Question;
  currentQuestionIndex: number;
  questionCount: number;
  answers: Answer[];
  users: Record<string, WebSocketUser>;
  onAddAnswer: (content: string) => void;
  onAddReply: (answerId: string, content: string) => void;
  onViewProfile: (user: WebSocketUser) => void;
  onReaction: (answerId: string, type: Reaction['type'], isRemove: boolean) => void;
  formatTimeRemaining: (seconds: number) => string;
}

const GameContent: React.FC<GameContentProps> = ({
  timeRemaining,
  totalDuration,
  currentQuestion,
  currentQuestionIndex,
  questionCount,
  answers,
  users,
  onAddAnswer,
  onAddReply,
  onViewProfile,
  onReaction,
  formatTimeRemaining
}) => {
  return (
    <div className="container max-w-4xl mx-auto">
      <QuestionTimer 
        timeRemaining={timeRemaining}
        totalDuration={totalDuration}
        currentQuestionIndex={currentQuestionIndex}
        questionCount={questionCount}
        formatTimeRemaining={formatTimeRemaining}
      />
      <QuestionPrompt question={currentQuestion} />
      <AnswerInput onSubmit={onAddAnswer} />
      <AnswerList 
        answers={answers} 
        users={users} 
        onAddReply={onAddReply}
        onViewProfile={onViewProfile}
        onReaction={onReaction}
      />
    </div>
  );
};

export default GameContent;
