
import React, { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface QuestionTimerProps {
  timeRemaining: number;
  totalDuration: number;
  currentQuestionIndex: number;
  questionCount: number;
  formatTimeRemaining: (seconds: number) => string;
}

const QuestionTimer: React.FC<QuestionTimerProps> = ({
  timeRemaining,
  totalDuration,
  currentQuestionIndex,
  questionCount,
  formatTimeRemaining
}) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <div className="relative mb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <span className="font-medium">{formatTimeRemaining(timeRemaining)}</span>
        </div>
        <Collapsible
          open={isInfoOpen}
          onOpenChange={setIsInfoOpen}
          className="w-auto"
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <Info size={16} />
              {isInfoOpen ? (
                <>
                  <span className="hidden sm:inline">Hide Info</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Game Info</span>
                  <ChevronDown size={14} />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden bg-muted/50 backdrop-blur-sm p-4 rounded-lg mt-2 text-sm animate-fade-in">
            <p>Questions cycle every minute. Submit your best answers and get reactions from other players!</p>
            <p className="mt-2 font-medium">Current question: {currentQuestionIndex + 1} of {questionCount}</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <Progress 
        value={(timeRemaining / totalDuration) * 100} 
        className="h-2 mb-4"
      />
    </div>
  );
};

export default QuestionTimer;
