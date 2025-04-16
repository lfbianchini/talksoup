import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameHeader from '@/components/GameHeader';
import GameContent from '@/components/GameContent';
import UserProfileModal from '@/components/UserProfileModal';
import { Answer, Reaction } from '@/types/answer';
import { Question } from '@/types/question';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '../hooks/useWebSocket';
import { WebSocketUser } from '../types/websocket';
import type { Lobby as LobbyType } from '../types/lobby';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useAnswerService } from '@/services/answerService';

const QUESTION_DURATION = 60; // 60 seconds (1 minute)

interface LobbyData {
  id: string;
  name: string;
  capacity: number;
  currentPlayers: number;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  questions: Question[];
}

const Lobby: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const { ws, isConnected, user, currentLobbyPlayers } = useWebSocket();
  const navigate = useNavigate();
  const { submitAnswer, addReaction, addReply } = useAnswerService();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedUser, setSelectedUser] = useState<WebSocketUser | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [newAnswer, setNewAnswer] = useState('');
  const [users, setUsers] = useState<Record<string, WebSocketUser>>({});

  // Update lobby data when player count changes
  useEffect(() => {
    if (lobby && currentLobbyPlayers !== lobby.currentPlayers) {
      setLobby(prev => prev ? {
        ...prev,
        currentPlayers: currentLobbyPlayers
      } : null);
    }
  }, [currentLobbyPlayers]);

  const handleSubmitAnswer = (answer: string) => {
    console.log('Submitting answer:', answer);
    if (!answer.trim() || !lobby || !user) return;
    
    // Send the answer through the WebSocket
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'submit_answer',
        data: {
          lobbyId: lobby.id,
          content: answer,
          questionIndex: currentQuestionIndex
        }
      }));
    } else {
      console.error('WebSocket not connected');
      toast({
        title: "Error",
        description: "Not connected to server",
        variant: "destructive",
      });
    }
    setNewAnswer('');
  };

  const handleReaction = (answerId: string, type: Reaction['type'], isRemove: boolean) => {
    addReaction(answerId, type, isRemove);
  };

  const handleReply = (answerId: string, content: string) => {
    if (!ws || !isConnected || !lobby) return;
    
    console.log('Adding reply to answer:', answerId, content);
    
    ws.send(JSON.stringify({
      type: 'submit_reply',
      lobbyId: lobby.id,
      answerId,
      content
    }));
  };

  const handleLeaveLobby = () => {
    if (!ws || !isConnected || !lobby) return;

    const message = {
      type: 'leave_lobby',
      lobbyId: lobby.id
    };

    console.log('Sending leave lobby message:', message);
    try {
      ws.send(JSON.stringify(message));
      navigate('/');
    } catch (error) {
      console.error('Error sending leave lobby message:', error);
      toast({
        title: "Error",
        description: "Failed to leave lobby",
        variant: "destructive",
      });
    }
  };

  const handleViewProfile = (user: WebSocketUser) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const handleAddFriend = (userId: string) => {
    // In a real app, this would send a friend request to the backend
    console.log(`Friend request sent to user ${userId}`);
  };

  const formatTimeRemaining = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  useEffect(() => {
    if (!ws || !isConnected || !id) {
      console.log('WebSocket not ready:', { ws, isConnected, id });
      return;
    }

    console.log('Setting up message handler. Connection state:', { isConnected });

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);

        switch (data.type) {
          case 'lobby_joined':
            console.log('Successfully joined lobby:', data.data);
            setLobby(data.data);
            setIsLoading(false);
            
            // Set existing answers if any
            if (data.data.existingAnswers) {
              // Filter out answers with invalid user data
              const validAnswers = data.data.existingAnswers.filter((answer: Answer) => answer.player_id);
              console.log('Valid answers:', validAnswers);
              setAnswers(validAnswers);
              
              // Request user info for all answer authors and reply authors
              validAnswers.forEach((answer: Answer) => {
                // Request info for answer author
                console.log('Answer author:', answer.player_id);
                if (!users[answer.player_id]) {
                  console.log('Requesting user info for answer author:', answer.player_id);
                  ws.send(JSON.stringify({
                    type: 'get_user_info',
                    data: { userId: answer.player_id }
                  }));
                }
                
                // Request info for reply authors
                if (answer.replies) {
                  answer.replies.forEach(reply => {
                    if (reply.player_id && !users[reply.player_id]) {
                      console.log('Requesting user info for reply author:', reply.player_id);
                      ws.send(JSON.stringify({
                        type: 'get_user_info',
                        data: { userId: reply.player_id }
                      }));
                    }
                  });
                }
              });
            }
            break;
          case 'lobby_updated':
            console.log('Lobby updated:', data.data);
            setLobby(data.data);
            break;
          case 'lobby_removed':
            console.log('Lobby removed:', data.data);
            toast({
              title: "Lobby Removed",
              description: "The lobby you were in has been removed.",
              variant: "destructive",
            });
            navigate('/');
            break;
          case 'answer_submitted':
            console.log('New answer received:', data.data);
            // Store user info if provided
            if (data.data.user) {
              console.log('Storing user info:', data.data.user);
              setUsers(prev => ({
                ...prev,
                [data.data.user.id]: data.data.user
              }));
            }
            // Store the answer without the user field
            const { user: _, ...answerData } = data.data;
            setAnswers(prev => {
              // Check if we already have this answer
              const exists = prev.some(a => a.id === answerData.id);
              if (exists) return prev;
              return [answerData, ...prev];
            });
            break;
          case 'answer_updated':
            console.log('Answer updated:', data.data);
            // Only update if the answer has a valid player_id
            if (data.data.player_id) {
              // Request user info for any new reply authors
              if (data.data.replies) {
                data.data.replies.forEach((reply: any) => {
                  if (reply.player_id && !users[reply.player_id]) {
                    console.log('Requesting user info for reply author:', reply.player_id);
                    ws.send(JSON.stringify({
                      type: 'get_user_info',
                      data: { userId: reply.player_id }
                    }));
                  }
                });
              }
              // Update the answer in the list
              setAnswers(prev => prev.map(answer => 
                answer.id === data.data.id ? {
                  ...answer,
                  ...data.data,
                  replies: data.data.replies || []
                } : answer
              ));
            } else {
              console.error('Received answer update with invalid player_id:', data.data);
            }
            break;
          case 'user_info':
            console.log('User info received:', data.data);
            setUsers(prev => ({
              ...prev,
              [data.data.id]: data.data
            }));
            break;
          case 'timer_update':
            setTimeRemaining(data.data.timeRemaining);
            break;
          case 'question_changed':
            console.log('Question changed:', data.data);
            setCurrentQuestionIndex(data.data.questionIndex);
            setAnswers(data.data.answers || []);
            break;
          case 'lobby_players_updated':
            console.log('Players updated:', data.data);
            break;
          case 'error':
            console.error('Received error from server:', data.data);
            toast({
              title: "Error",
              description: data.data,
              variant: "destructive",
            });
            setIsLoading(false);
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        toast({
          title: "Error",
          description: "Failed to parse server response",
          variant: "destructive",
        });
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, isConnected, id, navigate, toast]);

  useEffect(() => {
    if (!ws || !isConnected || !id) {
      console.log('Not ready to join lobby:', { ws, isConnected, id });
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const joinLobby = () => {
      // Clear any existing state
      setAnswers([]);
      setUsers({});
      setTimeRemaining(QUESTION_DURATION);
      setCurrentQuestionIndex(0);
      setIsLoading(true);

      const joinMessage = {
        type: 'join_lobby',
        lobbyId: id
      };
      console.log('Sending join lobby message:', joinMessage);
      ws.send(JSON.stringify(joinMessage));

      timeoutId = setTimeout(() => {
        console.log('Join lobby timeout - no response received');
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to join lobby - no response from server",
          variant: "destructive",
        });
      }, 5000); // 5 second timeout
    };

    // Set up a handler to clear the timeout when we get a response
    const handleJoinResponse = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'lobby_joined' || data.type === 'error') {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Error parsing join response:', error);
      }
    };

    ws.addEventListener('message', handleJoinResponse);
    joinLobby();

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      ws.removeEventListener('message', handleJoinResponse);
      
      // Send leave message when component unmounts
      if (ws && isConnected && id) {
        ws.send(JSON.stringify({
          type: 'leave_lobby',
          lobbyId: id
        }));
      }
    };
  }, [ws, isConnected, id, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Loading</CardTitle>
              <CardDescription>Connecting to lobby...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>Failed to join lobby</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate('/')} className="w-full">
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <GameHeader
        onLeaveGame={handleLeaveLobby}
        playerCount={currentLobbyPlayers}
        totalPlayers={lobby?.capacity || 0}
      />
      <GameContent
        timeRemaining={timeRemaining}
        totalDuration={QUESTION_DURATION}
        currentQuestion={lobby.questions[currentQuestionIndex]}
        currentQuestionIndex={currentQuestionIndex}
        questionCount={lobby.questions.length}
        answers={answers}
        users={users}
        onAddAnswer={handleSubmitAnswer}
        onAddReply={handleReply}
        onViewProfile={handleViewProfile}
        onReaction={handleReaction}
        formatTimeRemaining={formatTimeRemaining}
      />
      <UserProfileModal
        user={selectedUser}
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        onAddFriend={handleAddFriend}
      />
    </div>
  );
};

export default Lobby;
