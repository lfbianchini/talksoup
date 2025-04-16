import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Question } from './questionService';

dotenv.config();

interface Lobby {
  id: string;
  name: string;
  capacity: number;
  currentPlayers: number;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  questions: Question[];
  currentQuestionIndex: number;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface JoinLobbyResult {
  success: boolean;
  lobby?: Lobby;
  error?: string;
}

interface LeaveLobbyResult {
  success: boolean;
  lobby?: Lobby;
  error?: string;
}

interface LobbyQuestionResponse {
  question_id: string;
  questions: {
    id: string;
    content: string;
    type: 'text' | 'multiple_choice';
    theme: string;
    created_at: string;
    updated_at: string;
  };
}

class LobbyService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  async createLobby(name: string, capacity: number, hostId: string): Promise<ServiceResponse<Lobby>> {
    try {
      console.log('Creating lobby with:', { name, capacity, hostId });
      
      // Get random questions first
      const { data: questions, error: questionsError } = await this.supabase
        .from('questions')
        .select('*')
        .limit(10);

      if (questionsError) {
        console.error('Error getting random questions:', questionsError);
        throw questionsError;
      }

      // Shuffle the questions in memory
      const shuffledQuestions = this.shuffleArray(questions || []);
      
      // Create the lobby with questions
      const { data: lobbyData, error: lobbyError } = await this.supabase
        .from('lobbies')
        .insert({
          name,
          capacity,
          host_id: hostId,
          current_players: 1,
          status: 'waiting',
          current_question_index: 0,
          questions: shuffledQuestions // Store questions directly in the lobby
        })
        .select()
        .single();

      if (lobbyError) {
        console.error('Error creating lobby:', lobbyError);
        throw lobbyError;
      }

      if (!lobbyData) {
        console.error('No lobby data returned after creation');
        throw new Error('Failed to create lobby');
      }

      console.log('Lobby created:', lobbyData);

      // Add host to players table
      const { error: playerError } = await this.supabase
        .from('players')
        .insert({
          lobby_id: lobbyData.id,
          player_id: hostId,
          joined_at: new Date().toISOString()
        });

      if (playerError) {
        console.error('Error adding host to players:', playerError);
        // Don't throw here, just log the error
      }

      return {
        success: true,
        data: {
          id: lobbyData.id,
          name: lobbyData.name,
          capacity: lobbyData.capacity,
          currentPlayers: lobbyData.current_players,
          hostId: lobbyData.host_id,
          status: lobbyData.status,
          currentQuestionIndex: lobbyData.current_question_index,
          questions: shuffledQuestions
        }
      };
    } catch (error) {
      console.error('Error in createLobby:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create lobby'
      };
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async updateLobby(lobbyId: string, updates: Partial<Lobby>): Promise<ServiceResponse<Lobby>> {
    try {
      // First get the current lobby state
      const { data: currentLobby, error: getError } = await this.supabase
        .from('lobbies')
        .select()
        .eq('id', lobbyId)
        .single();

      if (getError) throw getError;

      // Prepare updates while preserving existing values if not provided
      const updatedFields = {
        name: updates.name ?? currentLobby.name,
        capacity: updates.capacity ?? currentLobby.capacity,
        host_id: updates.hostId ?? currentLobby.host_id,
        current_players: updates.currentPlayers ?? currentLobby.current_players,
        current_question_index: updates.currentQuestionIndex ?? currentLobby.current_question_index,
        status: updates.status ?? currentLobby.status,
        questions: updates.questions ?? currentLobby.questions,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('lobbies')
        .update(updatedFields)
        .eq('id', lobbyId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          capacity: data.capacity,
          currentPlayers: data.current_players,
          hostId: data.host_id,
          status: data.status,
          currentQuestionIndex: data.current_question_index,
          questions: data.questions || []
        }
      };
    } catch (error) {
      console.error('Error in updateLobby:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update lobby'
      };
    }
  }

  async getLobby(lobbyId: string): Promise<ServiceResponse<Lobby>> {
    try {
      console.log('Getting lobby with ID:', lobbyId);
      // Get lobby data including questions
      const { data: lobbyData, error: lobbyError } = await this.supabase
        .from('lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single();

      if (lobbyError) {
        console.error('Error getting lobby:', lobbyError);
        throw lobbyError;
      }

      if (!lobbyData) {
        console.log('No lobby found with ID:', lobbyId);
        return {
          success: false,
          error: 'Lobby not found'
        };
      }

      console.log('Found lobby:', lobbyData);
      return {
        success: true,
        data: {
          id: lobbyData.id,
          name: lobbyData.name,
          capacity: lobbyData.capacity,
          currentPlayers: lobbyData.current_players,
          hostId: lobbyData.host_id,
          status: lobbyData.status,
          currentQuestionIndex: lobbyData.current_question_index,
          questions: lobbyData.questions || []
        }
      };
    } catch (error) {
      console.error('Error in getLobby:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get lobby'
      };
    }
  }

  async joinLobby(lobbyId: string, playerId: string): Promise<JoinLobbyResult> {
    try {
      console.log('Attempting to join lobby:', { lobbyId, playerId });
      const lobbyResult = await this.getLobby(lobbyId);
      
      if (!lobbyResult.success || !lobbyResult.data) {
        console.log('Failed to get lobby for joining:', lobbyResult.error);
        return {
          success: false,
          error: 'Lobby not found'
        };
      }

      const lobby = lobbyResult.data;

      // Check if player is already in the lobby
      const { data: existingPlayer } = await this.supabase
        .from('players')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('player_id', playerId)
        .single();

      if (existingPlayer) {
        console.log('Player already in lobby:', { lobbyId, playerId });
        return {
          success: true,
          lobby: lobby
        };
      }
      
      if (lobby.currentPlayers >= lobby.capacity) {
        console.log('Lobby is full:', { current: lobby.currentPlayers, capacity: lobby.capacity });
        return {
          success: false,
          error: 'Lobby is full'
        };
      }

      // Add player to the players table
      const { error: playerError } = await this.supabase
        .from('players')
        .insert({
          lobby_id: lobbyId,
          player_id: playerId,
          joined_at: new Date().toISOString()
        });

      if (playerError) {
        console.error('Error adding player to lobby:', playerError);
        throw playerError;
      }

      // Only update player count for new players
      const { error: updateError } = await this.supabase
        .from('lobbies')
        .update({ 
          current_players: lobby.currentPlayers + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', lobbyId);

      if (updateError) {
        console.error('Error updating lobby player count:', updateError);
        throw updateError;
      }

      // Get updated lobby data
      const updatedLobbyResult = await this.getLobby(lobbyId);
      
      if (!updatedLobbyResult.success || !updatedLobbyResult.data) {
        throw new Error('Failed to get updated lobby data');
      }

      console.log('Successfully joined lobby:', updatedLobbyResult.data);
      return {
        success: true,
        lobby: updatedLobbyResult.data
      };
    } catch (error) {
      console.error('Error in joinLobby:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join lobby'
      };
    }
  }

  async leaveLobby(lobbyId: string, playerId: string): Promise<LeaveLobbyResult> {
    try {
      console.log('Leaving lobby:', { lobbyId, playerId });
      
      // First check if the player is actually in the lobby
      const { data: playerExists, error: checkError } = await this.supabase
        .from('players')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('player_id', playerId)
        .single();

      if (checkError || !playerExists) {
        console.log('Player not found in lobby:', { lobbyId, playerId });
        // Get current lobby state to return
        const currentLobby = await this.getLobby(lobbyId);
        return {
          success: true,
          lobby: currentLobby.data
        };
      }

      // Get current lobby state before making any changes
      const { data: lobby, error: lobbyError } = await this.supabase
        .from('lobbies')
        .select()
        .eq('id', lobbyId)
        .single();

      if (lobbyError) {
        console.error('Error getting lobby state:', lobbyError);
        throw lobbyError;
      }

      // Remove player from lobby
      const { error: removeError } = await this.supabase
        .from('players')
        .delete()
        .eq('lobby_id', lobbyId)
        .eq('player_id', playerId);

      if (removeError) {
        console.error('Error removing player from lobby:', removeError);
        throw removeError;
      }

      // Get current player count from players table
      const { data: remainingPlayers, error: countError } = await this.supabase
        .from('players')
        .select('player_id')
        .eq('lobby_id', lobbyId);

      if (countError) {
        console.error('Error counting remaining players:', countError);
        throw countError;
      }

      const newPlayerCount = remainingPlayers?.length || 0;
      
      // Update lobby with new player count
      const { data: updatedLobby, error: updateError } = await this.supabase
        .from('lobbies')
        .update({ 
          current_players: newPlayerCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', lobbyId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating lobby player count:', updateError);
        throw updateError;
      }

      // If host left and there are remaining players, assign new host
      if (lobby.host_id === playerId && newPlayerCount > 0) {
        const newHostId = remainingPlayers[0].player_id;
        await this.supabase
          .from('lobbies')
          .update({ host_id: newHostId })
          .eq('id', lobbyId);
          
        // Update the lobby data with new host
        updatedLobby.host_id = newHostId;
      }

      console.log('Successfully left lobby:', { 
        lobbyId, 
        playerId, 
        newPlayerCount, 
        newHost: lobby.host_id === playerId ? remainingPlayers[0]?.player_id : undefined 
      });

      return {
        success: true,
        lobby: updatedLobby ? {
          id: updatedLobby.id,
          name: updatedLobby.name,
          capacity: updatedLobby.capacity,
          currentPlayers: updatedLobby.current_players,
          hostId: updatedLobby.host_id,
          status: updatedLobby.status,
          currentQuestionIndex: updatedLobby.current_question_index,
          questions: updatedLobby.questions || []
        } : undefined
      };
    } catch (error) {
      console.error('Error in leaveLobby:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave lobby'
      };
    }
  }

  async getLobbies(): Promise<Lobby[]> {
    const { data: lobbies, error } = await this.supabase
      .from('lobbies')
      .select()
      .order('created_at', { ascending: false });

    if (error) throw error;

    return lobbies.map(lobby => ({
      id: lobby.id,
      name: lobby.name,
      capacity: lobby.capacity,
      currentPlayers: lobby.current_players,
      hostId: lobby.host_id,
      status: lobby.status,
      currentQuestionIndex: lobby.current_question_index,
      questions: lobby.questions || [],
      createdAt: lobby.created_at,
      updatedAt: lobby.updated_at
    }));
  }

  async joinRandomLobby(playerId: string): Promise<JoinLobbyResult> {
    console.log('Joining random lobby for player:', playerId);
    
    // Find a waiting lobby with available space
    const { data: availableLobbies, error: findError } = await this.supabase
      .from('lobbies')
      .select()
      .eq('status', 'waiting')
      .lt('current_players', 'capacity')
      .order('created_at', { ascending: true })
      .limit(1);

    if (findError) {
      console.error('Error finding available lobbies:', findError);
      return { success: false, error: 'Failed to find available lobby' };
    }

    if (!availableLobbies || availableLobbies.length === 0) {
      // Create a new lobby if none available
      return this.createLobby('Random Lobby', 10, playerId)
        .then(result => ({
          success: result.success,
          lobby: result.data,
          error: result.error
        }))
        .catch(error => ({ success: false, error: 'Failed to create new lobby' }));
    }

    // Join the first available lobby
    return this.joinLobby(availableLobbies[0].id, playerId);
  }

  async cleanupEmptyLobbies(): Promise<void> {
    console.log('Cleaning up empty lobbies');
    
    // Find lobbies that are empty or have only one player for more than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: emptyLobbies, error: findError } = await this.supabase
      .from('lobbies')
      .select('id, current_players, updated_at')
      .or(`current_players.eq.0,and(current_players.eq.1,updated_at.lt.${twoMinutesAgo})`);

    if (findError) {
      console.error('Error finding empty lobbies:', findError);
      return;
    }

    if (!emptyLobbies || emptyLobbies.length === 0) {
      return;
    }

    // Delete empty lobbies and their players
    for (const lobby of emptyLobbies) {
      console.log('Deleting empty lobby:', lobby.id);
      
      // Delete players first
      const { error: deletePlayersError } = await this.supabase
        .from('players')
        .delete()
        .eq('lobby_id', lobby.id);

      if (deletePlayersError) {
        console.error('Error deleting players:', deletePlayersError);
        continue;
      }

      // Then delete the lobby
      const { error: deleteLobbyError } = await this.supabase
        .from('lobbies')
        .delete()
        .eq('id', lobby.id);

      if (deleteLobbyError) {
        console.error('Error deleting lobby:', deleteLobbyError);
      }
    }
  }

  async cleanupOldLobbies(): Promise<void> {
    try {
      // Delete lobbies that haven't been updated in the last 5 minutes
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      // First, get the IDs of lobbies to be deleted
      const { data: oldLobbies, error: fetchError } = await this.supabase
        .from('lobbies')
        .select('id')
        .lt('updated_at', fiveMinutesAgo.toISOString());

      if (fetchError) {
        console.error('Error fetching old lobbies:', fetchError);
        return;
      }

      if (oldLobbies && oldLobbies.length > 0) {
        const lobbyIds = oldLobbies.map(lobby => lobby.id);

        // Delete associated answers first
        const { error: answersError } = await this.supabase
          .from('answers')
          .delete()
          .in('lobby_id', lobbyIds);

        if (answersError) {
          console.error('Error deleting old answers:', answersError);
          return;
        }

        // Then delete the lobbies
        const { error: deleteError } = await this.supabase
          .from('lobbies')
          .delete()
          .in('id', lobbyIds);

        if (deleteError) {
          console.error('Error deleting old lobbies:', deleteError);
          return;
        }

        console.log(`Cleaned up ${lobbyIds.length} old lobbies and their answers`);
      }
    } catch (error) {
      console.error('Error in cleanupOldLobbies:', error);
    }
  }

  async cleanupOrphanedAnswers(): Promise<void> {
    try {
      // First get all lobby IDs
      const { data: lobbies, error: lobbyError } = await this.supabase
        .from('lobbies')
        .select('id');

      if (lobbyError) {
        console.error('Error fetching lobby IDs:', lobbyError);
        return;
      }

      // Extract lobby IDs
      const lobbyIds = lobbies?.map(lobby => lobby.id) || [];

      if (lobbyIds.length === 0) {
        // If there are no lobbies, delete all answers
        const { error } = await this.supabase
          .from('answers')
          .delete()
          .neq('id', 'none'); // This will delete all answers

        if (error) {
          console.error('Error deleting all answers:', error);
        }
      } else {
        // Delete answers that don't belong to any existing lobby
        const { error } = await this.supabase
          .from('answers')
          .delete()
          .not('lobby_id', 'in', `(${lobbyIds.join(',')})`);

        if (error) {
          console.error('Error cleaning up orphaned answers:', error);
        }
      }
    } catch (error) {
      console.error('Error in cleanupOrphanedAnswers:', error);
    }
  }
}

export default new LobbyService();
export type { Lobby, ServiceResponse, JoinLobbyResult }; 