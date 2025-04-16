import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface User {
  id: string;
  username: string;
  avatar: string;
  color: string;
}

class UserService {
  private supabase;
  private connectedUsers: Map<string, User>;

  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.connectedUsers = new Map();
  }

  private generateRandomUsername(): string {
    const adjectives = ['Happy', 'Clever', 'Brave', 'Gentle', 'Wise', 'Swift', 'Calm', 'Bright', 'Wild', 'Kind'];
    const nouns = ['Fox', 'Bear', 'Eagle', 'Wolf', 'Owl', 'Lion', 'Tiger', 'Hawk', 'Dove', 'Hare'];
    const number = Math.floor(Math.random() * 1000);
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}${noun}${number}`;
  }

  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
      '#D4A5A5', '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private generateRandomAvatar(): string {
    const styles = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'micah'];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const seed = Math.random().toString(36).substring(7);
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
  }

  createUser(clientId: string): User {
    console.log('Creating user for client:', clientId);
    
    // Check if user already exists
    const existingUser = this.connectedUsers.get(clientId);
    if (existingUser) {
      console.log('Found existing user:', existingUser);
      return existingUser;
    }

    // Create new user
    const user: User = {
      id: clientId,
      username: this.generateRandomUsername(),
      avatar: this.generateRandomAvatar(),
      color: this.generateRandomColor()
    };

    console.log('Created new user:', user);

    // Store user
    this.connectedUsers.set(clientId, user);
    return user;
  }

  getUser(clientId: string): User | undefined {
    console.log('Getting user for client:', clientId);
    const user = this.connectedUsers.get(clientId);
    console.log('Found user:', user);
    return user;
  }

  removeUser(clientId: string): void {
    console.log('Removing user:', clientId);
    this.connectedUsers.delete(clientId);
  }
}

export const userService = new UserService(); 