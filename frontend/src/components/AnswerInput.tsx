import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AnswerInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
}

const AnswerInput: React.FC<AnswerInputProps> = ({ 
  onSubmit,
  placeholder = "Share your answer..."
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        variant: "destructive",
        title: "Oops!",
        description: "Your answer can't be empty.",
      });
      return;
    }

    setIsSubmitting(true);
    onSubmit(content);
    setContent('');
    setIsSubmitting(false);
    
    toast({
      title: "Answer submitted!",
      description: "Your brilliant thought is now live.",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto mb-8">
      <div className="bg-white dark:bg-secondary rounded-2xl p-4 shadow-md">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-[80px] bg-secondary/30 dark:bg-secondary/50 rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            disabled={isSubmitting}
          />
          <div className="mt-2 flex justify-end">
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-2 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Answer"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default AnswerInput;
