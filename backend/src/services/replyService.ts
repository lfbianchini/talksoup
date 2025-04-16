import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface Reply {
  id: string;
  answerId: string;
  playerId: string;
  content: string;
  createdAt: string;
}

class ReplyService {
  private supabase;

  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async createReply(answerId: string, playerId: string, content: string): Promise<Reply> {
    const { data: reply, error } = await this.supabase
      .from('replies')
      .insert({
        answer_id: answerId,
        player_id: playerId,
        content
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: reply.id,
      answerId: reply.answer_id,
      playerId: reply.player_id,
      content: reply.content,
      createdAt: reply.created_at
    };
  }

  async getRepliesForAnswer(answerId: string): Promise<Reply[]> {
    const { data: replies, error } = await this.supabase
      .from('replies')
      .select()
      .eq('answer_id', answerId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return replies.map(reply => ({
      id: reply.id,
      answerId: reply.answer_id,
      playerId: reply.player_id,
      content: reply.content,
      createdAt: reply.created_at
    }));
  }

  async deleteReply(replyId: string, playerId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('replies')
      .delete()
      .eq('id', replyId)
      .eq('player_id', playerId);

    if (error) throw error;
    return true;
  }
}

export const replyService = new ReplyService();
export type { Reply }; 