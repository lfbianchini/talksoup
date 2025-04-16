import React from 'react';
import { Question } from '../types/question';

interface QuestionPromptProps {
  question: Question;
}

const QuestionPrompt: React.FC<QuestionPromptProps> = ({ question }) => {
  return (
    <div className="mb-8 text-center">
      <div className="inline-block bg-primary/10 dark:bg-primary/20 rounded-2xl p-4 md:p-6 max-w-3xl mx-auto shadow-lg animate-pulse-soft">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-foreground mb-2">
          {question.content}
        </h1>
      </div>
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

export default QuestionPrompt;
