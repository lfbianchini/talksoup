import { useWebSocket } from '@/hooks/useWebSocket';
import { Reaction } from '@/types/answer';

export const useAnswerService = () => {
  const { ws, isConnected } = useWebSocket();

  const submitAnswer = (lobbyId: string, content: string, questionIndex: number) => {
    if (!ws || !isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    console.log('Sending submit_answer message:', { lobbyId, content, questionIndex });
    ws.send(JSON.stringify({
      type: 'submit_answer',
      data: {
        lobbyId,
        content,
        questionIndex
      }
    }));
  };

  const addReaction = (answerId: string, type: Reaction['type'], isRemove: boolean = false) => {
    if (!ws || !isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    console.log('Sending add_reaction message:', { answerId, type, isRemove });
    ws.send(JSON.stringify({
      type: 'add_reaction',
      data: {
        answerId,
        reactionType: type,
        isRemove
      }
    }));
  };

  const addReply = (answerId: string, content: string) => {
    if (!ws || !isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    console.log('Sending add_reply message:', { answerId, content });
    ws.send(JSON.stringify({
      type: 'add_reply',
      data: {
        answerId,
        content
      }
    }));
  };

  return {
    submitAnswer,
    addReaction,
    addReply
  };
};
