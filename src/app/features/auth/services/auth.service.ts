import { Injectable } from '@angular/core';
import { AuthResponse, Session, User } from '@supabase/supabase-js';

import { supabase } from '../../../core/supabase/supabase.client';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  async signIn(email: string, password: string): Promise<AuthResponse> {
    return supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  }

  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token ?? null;
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession();
    return session?.user ?? null;
  }

  onAuthStateChange(
    callback: (session: Session | null) => void
  ): { unsubscribe: () => void } {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });

    return {
      unsubscribe: () => data.subscription.unsubscribe()
    };
  }
}
