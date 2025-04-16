import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface Reply {
  id: string;
  player_id: string;
  content: string;
  created_at: string;
}

interface Answer {
  id: string;
  lobby_id: string;
  player_id: string;
  content: string;
  created_at: string;
  reactions: {
    type: 'upvote' | 'downvote' | 'laugh' | 'love' | 'wow';
    count: number;
  }[];
  replies: Reply[];
}

class AnswerService {
  private supabase;
  private answers: Map<string, Answer[]> = new Map();

  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async getAnswers(lobbyId: string, questionIndex: number): Promise<Answer[]> {
    const { data: answers, error } = await this.supabase
      .from('answers')
      .select('*')
      .eq('lobby_id', lobbyId)
      .eq('question_index', questionIndex)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching answers:', error);
      throw error;
    }

    // Transform and sort answers by net reaction score
    return answers
      .map(answer => ({
        id: answer.id,
        lobby_id: answer.lobby_id,
        player_id: answer.player_id,
        content: answer.content,
        created_at: answer.created_at,
        reactions: answer.reactions || [],
        replies: answer.replies || []
      }))
      .sort((a, b) => {
        // Calculate net score (upvotes - downvotes) for each answer
        const getNetScore = (reactions: { type: string; count: number }[]) => {
          const upvotes = reactions.find(r => r.type === 'upvote')?.count || 0;
          const downvotes = reactions.find(r => r.type === 'downvote')?.count || 0;
          return upvotes - downvotes;
        };

        const netScoreA = getNetScore(a.reactions);
        const netScoreB = getNetScore(b.reactions);
        
        // Sort by net score (descending), then by timestamp (newest first)
        if (netScoreA !== netScoreB) {
          return netScoreB - netScoreA;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }

  async createAnswer(lobbyId: string, playerId: string, content: string, questionIndex: number): Promise<Answer> {
    const { data: answer, error } = await this.supabase
      .from('answers')
      .insert({
        lobby_id: lobbyId,
        player_id: playerId,
        content,
        question_index: questionIndex,
        reactions: [],
        replies: []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating answer:', error);
      throw error;
    }

    return {
      id: answer.id,
      lobby_id: answer.lobby_id,
      player_id: answer.player_id,
      content: answer.content,
      created_at: answer.created_at,
      reactions: answer.reactions || [],
      replies: answer.replies || []
    };
  }

  async addReaction(answerId: string, type: 'upvote' | 'downvote' | 'laugh' | 'love' | 'wow', isRemove: boolean = false): Promise<Answer> {
    const { data: answer, error } = await this.supabase
      .from('answers')
      .select()
      .eq('id', answerId)
      .single();

    if (error || !answer) throw error || new Error('Answer not found');

    const reactions = answer.reactions || [];
    const existingReaction = reactions.find((r: { type: string; count: number }) => r.type === type);
    
    if (existingReaction) {
      if (isRemove) {
        // Remove the reaction if count would become 0
        if (existingReaction.count <= 1) {
          const index = reactions.indexOf(existingReaction);
          reactions.splice(index, 1);
        } else {
          existingReaction.count -= 1;
        }
      } else {
        existingReaction.count += 1;
      }
    } else if (!isRemove) {
      reactions.push({ type, count: 1 });
    }

    const { data: updatedAnswer, error: updateError } = await this.supabase
      .from('answers')
      .update({ reactions })
      .eq('id', answerId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      id: updatedAnswer.id,
      lobby_id: updatedAnswer.lobby_id,
      player_id: updatedAnswer.player_id,
      content: updatedAnswer.content,
      created_at: updatedAnswer.created_at,
      reactions: updatedAnswer.reactions || [],
      replies: updatedAnswer.replies || []
    };
  }

  async addReply(lobbyId: string, answerId: string, playerId: string, content: string): Promise<Answer> {
    // Get the answer from the database
    const { data: answer, error: getError } = await this.supabase
      .from('answers')
      .select()
      .eq('id', answerId)
      .single();

    if (getError || !answer) {
      console.error('Error getting answer:', getError);
      throw new Error('Answer not found');
    }

    // Initialize replies array if it doesn't exist
    const replies = answer.replies || [];

    // Add new reply
    const newReply = {
      id: Date.now().toString(),
      player_id: playerId,
      content,
      created_at: new Date().toISOString()
    };
    replies.push(newReply);

    // Update the answer in the database
    const { data: updatedAnswer, error: updateError } = await this.supabase
      .from('answers')
      .update({ replies })
      .eq('id', answerId)
      .select()
      .single();

    if (updateError || !updatedAnswer) {
      console.error('Error updating answer with reply:', updateError);
      throw new Error('Failed to add reply');
    }

    return {
      id: updatedAnswer.id,
      lobby_id: updatedAnswer.lobby_id,
      player_id: updatedAnswer.player_id,
      content: updatedAnswer.content,
      created_at: updatedAnswer.created_at,
      reactions: updatedAnswer.reactions || [],
      replies: updatedAnswer.replies || []
    };
  }

  async getAnswersForLobby(lobbyId: string, questionIndex: number): Promise<Answer[]> {
    const { data, error } = await this.supabase
      .from('answers')
      .select('*')
      .eq('lobby_id', lobbyId)
      .eq('question_index', questionIndex)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const answerService = new AnswerService(); 