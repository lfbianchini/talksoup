import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import http from 'http';
import lobbyService, { Lobby } from './services/lobbyService';
import { replyService, Reply } from './services/replyService';
import { answerService } from './services/answerService';
import { userService } from './services/userService';
import questionService from './services/questionService';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// WebSocket setup
const wss = new WebSocketServer({ server });

// Store connected clients and their lobby IDs
const clients = new Map();
const clientLobbies = new Map();
const lobbyTimers = new Map();
const lobbyPlayers = new Map<string, Set<string>>(); // Track players in each lobby

// Add a map to store user sessions
const userSessions = new Map<string, WebSocket>();

// Broadcast function to send messages to all clients in the same lobby
const broadcast = (message: any, lobbyId: string | null = null) => {
  clients.forEach((client, id) => {
    const clientLobbyId = clientLobbies.get(id);
    if (!lobbyId || clientLobbyId === lobbyId) {
      client.send(JSON.stringify(message));
    }
  });
};

// Function to start a timer for a lobby
const startLobbyTimer = (lobbyId: string, duration: number) => {
  // Clear any existing timer
  if (lobbyTimers.has(lobbyId)) {
    clearInterval(lobbyTimers.get(lobbyId));
  }

  // Start new timer
  const timer = setInterval(async () => {
    const currentTime = lobbyTimers.get(lobbyId)?.currentTime || duration;
    const newTime = currentTime - 1;

    if (newTime <= 0) {
      // Time's up, move to next question
      const { error: deleteError } = await supabase
        .from('answers')
        .delete()
        .eq('lobby_id', lobbyId)
        .eq('question_index', lobbyTimers.get(lobbyId)?.questionIndex || 0);

      if (deleteError) {
        console.error('Error deleting answers:', deleteError);
        return;
      }

      // Broadcast question change
      broadcast({
        type: 'question_changed',
        data: {
          questionIndex: (lobbyTimers.get(lobbyId)?.questionIndex || 0) + 1,
          answers: []
        }
      }, lobbyId);

      // Reset timer
      lobbyTimers.set(lobbyId, {
        currentTime: duration,
        questionIndex: (lobbyTimers.get(lobbyId)?.questionIndex || 0) + 1
      });
    } else {
      // Update timer
      lobbyTimers.set(lobbyId, {
        ...lobbyTimers.get(lobbyId),
        currentTime: newTime
      });

      // Broadcast timer update
      broadcast({
        type: 'timer_update',
        data: {
          timeRemaining: newTime
        }
      }, lobbyId);
    }
  }, 1000);

  lobbyTimers.set(lobbyId, {
    timer,
    currentTime: duration,
    questionIndex: 0
  });
};

// Function to stop a lobby timer
const stopLobbyTimer = (lobbyId: string) => {
  if (lobbyTimers.has(lobbyId)) {
    clearInterval(lobbyTimers.get(lobbyId).timer);
    lobbyTimers.delete(lobbyId);
  }
};

// Function to get current player count from database
const getLobbyPlayerCount = async (lobbyId: string) => {
  const { data: players } = await supabase
    .from('players')
    .select('player_id')
    .eq('lobby_id', lobbyId);
  return players?.length || 0;
};

// Function to update and broadcast lobby player count
const updateLobbyPlayers = async (lobbyId: string) => {
  const playerCount = await getLobbyPlayerCount(lobbyId);
  
  // Broadcast updated player count to all clients in the lobby
  broadcast({
    type: 'lobby_players_updated',
    data: {
      lobbyId,
      playerCount
    }
  }, lobbyId);
};

wss.on('connection', (ws: WebSocket) => {
  const clientId = Date.now().toString();
  let user = userService.getUser(clientId);
  
  // If user doesn't exist, create a new one
  if (!user) {
    user = userService.createUser(clientId);
  }
  
  console.log(`New connection: ${clientId} (${user.username})`);
  
  // Store the WebSocket connection with the user session
  userSessions.set(clientId, ws);
  
  // Send user info to the client
  ws.send(JSON.stringify({
    type: 'user_info',
    data: user
  }));

  clients.set(clientId, ws);
  clientLobbies.set(clientId, null);

  // Handle messages from client
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data);

      switch (data.type) {
        case 'create_lobby':
          try {
            const { name, capacity } = data;
            console.log('Attempting to create lobby:', { name, capacity, clientId });
            const result = await lobbyService.createLobby(name, capacity, clientId);
            console.log('Lobby creation result:', result);
            
            if (result.success && result.data) {
              // Get random questions for the lobby
              const questions = await questionService.getRandomQuestions(10);
              console.log('Got random questions:', questions);
              
              // Add questions to the lobby data while preserving other fields
              const lobbyData = {
                ...result.data,
                questions,
                currentQuestionIndex: 0
              };

              if (!lobbyData.id) {
                throw new Error('Invalid lobby ID');
              }
              
              // Store questions in the lobby
              await lobbyService.updateLobby(lobbyData.id, { questions });

              // Update client's lobby tracking
              clientLobbies.set(clientId, lobbyData.id);

              // Get current player count
              const currentPlayers = await getLobbyPlayerCount(lobbyData.id);
              
              // Send lobby data to the client with current player count
              ws.send(JSON.stringify({
                type: 'lobby_created',
                data: {
                  ...lobbyData,
                  currentPlayers
                }
              }));

              // Start timer for the lobby
              startLobbyTimer(lobbyData.id, 60);

              // Broadcast lobby update to all clients
              broadcast({
                type: 'lobby_updated',
                data: {
                  ...lobbyData,
                  currentPlayers
                }
              });
            } else {
              console.error('Failed to create lobby:', result.error);
              ws.send(JSON.stringify({
                type: 'error',
                data: result.error
              }));
            }
          } catch (error) {
            console.error('Error creating lobby:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to create lobby'
            }));
          }
          break;

        case 'join_random_lobby':
          try {
            console.log('Attempting to join random lobby for client:', clientId);
            const lobbies = await lobbyService.getLobbies();
            console.log('Available lobbies:', lobbies);
            
            const availableLobbies = lobbies.filter((lobby: Lobby) => 
              lobby.status === 'waiting' && 
              lobby.currentPlayers < lobby.capacity
            );
            console.log('Filtered available lobbies:', availableLobbies);

            if (availableLobbies.length === 0) {
              console.log('No available lobbies found');
              ws.send(JSON.stringify({
                type: 'error',
                data: 'No available lobbies found'
              }));
              return;
            }

            const randomLobby = availableLobbies[Math.floor(Math.random() * availableLobbies.length)];
            console.log('Selected random lobby:', randomLobby);
            
            const result = await lobbyService.joinLobby(randomLobby.id, clientId);
            console.log('Join lobby result:', result);

            if (result.success && result.lobby) {
              console.log('Successfully joined lobby, sending response');
              const response = {
                type: 'lobby_joined',
                data: {
                  id: result.lobby.id,
                  name: result.lobby.name,
                  capacity: result.lobby.capacity,
                  currentPlayers: result.lobby.currentPlayers,
                  hostId: result.lobby.hostId,
                  status: result.lobby.status
                }
              };
              console.log('Sending response:', response);
              ws.send(JSON.stringify(response));
            } else {
              console.error('Failed to join lobby:', result.error);
              ws.send(JSON.stringify({
                type: 'error',
                data: result.error || 'Failed to join lobby'
              }));
            }
          } catch (error) {
            console.error('Error joining random lobby:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to join random lobby'
            }));
          }
          break;

        case 'leave_lobby':
          try {
            const { lobbyId } = data;
            const result = await lobbyService.leaveLobby(lobbyId, clientId);
            if (result.success) {
              // Remove client from lobby
              clientLobbies.set(clientId, null);
              
              // Remove player from lobby's player set
              lobbyPlayers.get(lobbyId)?.delete(clientId);
              
              // Update and broadcast player count
              updateLobbyPlayers(lobbyId);
              
              // If no more clients in lobby, stop timer
              if (lobbyPlayers.get(lobbyId)?.size === 0) {
                stopLobbyTimer(lobbyId);
                lobbyPlayers.delete(lobbyId);
              }
              
              if (result.lobby) {
                // Send the updated lobby to the leaving client
                ws.send(JSON.stringify({
                  type: 'lobby_updated',
                  data: result.lobby
                }));
                
                // Broadcast the updated lobby to all other clients in the same lobby
                broadcast({
                  type: 'lobby_updated',
                  data: result.lobby
                }, lobbyId);
              } else {
                // If the lobby was deleted, broadcast to all clients in the lobby
                broadcast({
                  type: 'lobby_updated',
                  data: result.lobby
                }, lobbyId);
              }
            }
          } catch (error) {
            console.error('Error leaving lobby:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to leave lobby'
            }));
          }
          break;

        case 'create_reply':
          try {
            const { answerId, content } = data;
            const reply = await replyService.createReply(answerId, clientId, content);
            broadcast({
              type: 'reply_created',
              data: reply
            });
          } catch (error) {
            console.error('Error creating reply:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to create reply'
            }));
          }
          break;

        case 'get_replies':
          try {
            const { answerId } = data;
            const replies = await replyService.getRepliesForAnswer(answerId);
            ws.send(JSON.stringify({
              type: 'replies',
              data: replies
            }));
          } catch (error) {
            console.error('Error getting replies:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to get replies'
            }));
          }
          break;

        case 'delete_reply':
          try {
            const { replyId } = data;
            const success = await replyService.deleteReply(replyId, clientId);
            if (success) {
              broadcast({
                type: 'reply_deleted',
                data: { replyId }
              });
            }
          } catch (error) {
            console.error('Error deleting reply:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to delete reply'
            }));
          }
          break;

        case 'join_lobby':
          try {
            const { lobbyId } = data;
            
            // Check if client is already in a lobby
            const currentLobbyId = clientLobbies.get(clientId);
            if (currentLobbyId && currentLobbyId !== lobbyId) {
              // Leave the current lobby first
              await lobbyService.leaveLobby(currentLobbyId, clientId);
            }

            // Join the new lobby
            const result = await lobbyService.joinLobby(lobbyId, clientId);
            
            if (result.success && result.lobby) {
              // Get the lobby data including questions
              const lobbyResult = await lobbyService.getLobby(lobbyId);
              
              if (!lobbyResult.success || !lobbyResult.data) {
                throw new Error('Lobby not found');
              }

              const lobbyData = lobbyResult.data;

              // Update client's lobby
              clientLobbies.set(clientId, lobbyId);

              // Get current player count
              const currentPlayers = await getLobbyPlayerCount(lobbyId);

              // Get existing answers for the current question
              const existingAnswers = await answerService.getAnswersForLobby(
                lobbyId, 
                lobbyData.currentQuestionIndex || 0
              );

              // Send lobby data to the joining client
              ws.send(JSON.stringify({
                type: 'lobby_joined',
                data: {
                  ...lobbyData,
                  existingAnswers,
                  currentPlayers
                }
              }));

              // Broadcast updated lobby data to all clients
              broadcast({
                type: 'lobby_updated',
                data: {
                  ...lobbyData,
                  currentPlayers
                }
              }, lobbyId);

              // Start timer if it doesn't exist
              if (!lobbyTimers.has(lobbyId)) {
                startLobbyTimer(lobbyId, 60);
              }

              // Send current timer state to the joining client
              if (lobbyTimers.has(lobbyId)) {
                ws.send(JSON.stringify({
                  type: 'timer_update',
                  data: {
                    timeRemaining: lobbyTimers.get(lobbyId).currentTime
                  }
                }));
              }
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                data: result.error || 'Failed to join lobby'
              }));
            }
          } catch (error) {
            console.error('Error joining lobby:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to join lobby'
            }));
          }
          break;

        case 'submit_answer':
          try {
            const { lobbyId, content, questionIndex } = data.data;
            if (!lobbyId || content === undefined || questionIndex === undefined) {
              console.error('Missing required fields in submit_answer:', data);
              ws.send(JSON.stringify({
                type: 'error',
                data: 'Missing required fields'
              }));
              return;
            }

            // Create the answer
            const answer = await answerService.createAnswer(lobbyId, clientId, content, questionIndex);
            console.log('Answer submitted:', answer);
            
            // Get user info
            const userInfo = userService.getUser(clientId);
            if (!userInfo) {
              console.error('User not found for answer:', clientId);
              ws.send(JSON.stringify({
                type: 'error',
                data: 'Failed to submit answer - user not found'
              }));
              return;
            }
            
            // Broadcast to all clients in the lobby (including sender)
            broadcast({
              type: 'answer_submitted',
              data: {
                ...answer,
                user: userInfo
              }
            }, lobbyId);
          } catch (error) {
            console.error('Error submitting answer:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to submit answer'
            }));
          }
          break;

        case 'add_reaction':
          try {
            const { answerId, reactionType, isRemove } = data.data;
            const updatedAnswer = await answerService.addReaction(answerId, reactionType, isRemove);
            
            // Broadcast the updated answer to all clients in the same lobby
            broadcast({
              type: 'answer_updated',
              data: updatedAnswer
            }, clientLobbies.get(clientId) || null);
          } catch (error) {
            console.error('Error managing reaction:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to manage reaction'
            }));
          }
          break;

        case 'add_reply':
          try {
            const { answerId, content } = data;
            const lobbyId = clientLobbies.get(clientId);
            if (!lobbyId) {
              throw new Error('Client not in a lobby');
            }
            const updatedAnswer = await answerService.addReply(lobbyId, answerId, clientId, content);
            
            // Broadcast the updated answer to all clients in the same lobby
            broadcast({
              type: 'answer_updated',
              data: updatedAnswer
            }, lobbyId);
          } catch (error) {
            console.error('Error adding reply:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to add reply'
            }));
          }
          break;

        case 'get_user_info':
          try {
            const { userId } = data.data;
            if (!userId) {
              console.error('No userId provided in get_user_info request');
              ws.send(JSON.stringify({
                type: 'error',
                data: 'No userId provided'
              }));
              return;
            }
            const userInfo = userService.getUser(userId);
            if (userInfo) {
              ws.send(JSON.stringify({
                type: 'user_info',
                data: userInfo
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                data: `User not found: ${userId}`
              }));
            }
          } catch (error) {
            console.error('Error handling get_user_info:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to get user info'
            }));
          }
          break;

        case 'change_question':
          try {
            const { lobbyId, questionIndex } = data;
            
            // Delete all answers for the current question
            const { error: deleteError } = await supabase
              .from('answers')
              .delete()
              .eq('lobby_id', lobbyId)
              .eq('question_index', questionIndex);

            if (deleteError) {
              console.error('Error deleting answers:', deleteError);
              ws.send(JSON.stringify({
                type: 'error',
                data: 'Failed to delete answers'
              }));
              return;
            }

            // Broadcast the question change to all clients in the lobby
            broadcast({
              type: 'question_changed',
              data: {
                questionIndex,
                answers: [] // Empty array since we just deleted all answers
              }
            }, lobbyId);
          } catch (error) {
            console.error('Error changing question:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to change question'
            }));
          }
          break;

        case 'submit_reply':
          try {
            const { lobbyId, answerId, content } = data;
            const updatedAnswer = await answerService.addReply(lobbyId, answerId, clientId, content);
            
            // Broadcast the updated answer with the new reply to all clients in the lobby
            broadcast({
              type: 'answer_updated',
              data: updatedAnswer
            }, lobbyId);
          } catch (error) {
            console.error('Error submitting reply:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to submit reply'
            }));
          }
          break;

        default:
          // Broadcast other messages to all clients except sender
          clients.forEach((client, id) => {
            if (id !== clientId) {
              client.send(JSON.stringify({
                type: 'message',
                data,
                sender: clientId
              }));
            }
          });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Invalid message format'
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', async () => {
    const clientLobbyId = clientLobbies.get(clientId);
    if (clientLobbyId) {
      try {
        // Update the database first
        const result = await lobbyService.leaveLobby(clientLobbyId, clientId);
        
        // Remove player from lobby's player set
        lobbyPlayers.get(clientLobbyId)?.delete(clientId);
        
        // Update and broadcast player count
        updateLobbyPlayers(clientLobbyId);
        
        // If no more clients in lobby, stop timer
        if (lobbyPlayers.get(clientLobbyId)?.size === 0) {
          stopLobbyTimer(clientLobbyId);
          lobbyPlayers.delete(clientLobbyId);
        }

        // Broadcast the updated lobby to remaining clients if the lobby still exists
        if (result.lobby) {
          broadcast({
            type: 'lobby_updated',
            data: result.lobby
          }, clientLobbyId);
        }
      } catch (error) {
        console.error('Error handling client disconnect:', error);
      }
    }
    
    // Remove the user session but don't delete the user
    userSessions.delete(clientId);
    clients.delete(clientId);
    clientLobbies.delete(clientId);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Add periodic cleanup
setInterval(async () => {
  try {
    // Clean up old lobbies (and their answers)
    await lobbyService.cleanupOldLobbies();
    // Clean up any orphaned answers
    await lobbyService.cleanupOrphanedAnswers();
  } catch (error) {
    console.error('Error in periodic cleanup:', error);
  }
}, 2 * 60 * 1000); // Run every 5 minutes 