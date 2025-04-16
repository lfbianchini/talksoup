import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export interface Question {
  id: string;
  content: string;
  type: 'text' | 'multiple_choice';
  theme: string;
  created_at?: string;
  updated_at?: string;
}

class QuestionService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  async createQuestion(content: string, type: Question['type'] = 'text', themeId?: string): Promise<Question> {
    const { data, error } = await this.supabase
      .from('questions')
      .insert({
        content,
        type,
        theme_id: themeId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRandomQuestions(count: number = 10, themeId?: string): Promise<Question[]> {
    try {
      let query = this.supabase
        .from('questions')
        .select('*');
      
      // If theme is specified, filter by theme
      if (themeId) {
        query = query.eq('theme_id', themeId);
      }

      const { data, error } = await query
        .limit(count)
        .order('id', { ascending: false }); // Get the most recent questions first

      if (error) {
        console.error('Error fetching questions:', error);
        throw error;
      }

      // Shuffle the results in memory since Supabase doesn't support RANDOM() in order
      return data ? this.shuffleArray(data) : [];
    } catch (error) {
      console.error('Error in getRandomQuestions:', error);
      throw error;
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async getQuestionsByTheme(themeId: string): Promise<Question[]> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('theme_id', themeId);

    if (error) throw error;
    return data || [];
  }

  async getAllQuestions(): Promise<Question[]> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*');

    if (error) throw error;
    return data || [];
  }
}

export default new QuestionService(); 