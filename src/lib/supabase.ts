import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export type Database = {
  public: {
    Tables: {
      lobbies: {
        Row: {
          id: string
          created_at: string
          start_time: string
          end_time: string
          result_number: number | null
          status: 'waiting' | 'active' | 'completed'
          total_players: number
          total_amount: number
        }
        Insert: {
          id?: string
          created_at?: string
          start_time: string
          end_time: string
          result_number?: number | null
          status?: 'waiting' | 'active' | 'completed'
          total_players?: number
          total_amount?: number
        }
        Update: {
          id?: string
          created_at?: string
          start_time?: string
          end_time?: string
          result_number?: number | null
          status?: 'waiting' | 'active' | 'completed'
          total_players?: number
          total_amount?: number
        }
      }
      players: {
        Row: {
          id: string
          lobby_id: string
          wallet_address: string
          selected_number: number
          transaction_hash: string | null
          is_winner: boolean
          prize_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          lobby_id: string
          wallet_address: string
          selected_number: number
          transaction_hash?: string | null
          is_winner?: boolean
          prize_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          lobby_id?: string
          wallet_address?: string
          selected_number?: number
          transaction_hash?: string | null
          is_winner?: boolean
          prize_amount?: number
          created_at?: string
        }
      }
      system_config: {
        Row: {
          id: string
          central_wallet_address: string
          central_wallet_private_key: string
          platform_fee_percentage: number
          entry_fee: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          central_wallet_address: string
          central_wallet_private_key: string
          platform_fee_percentage?: number
          entry_fee?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          central_wallet_address?: string
          central_wallet_private_key?: string
          platform_fee_percentage?: number
          entry_fee?: number
          created_at?: string
          updated_at?: string
        }
      }
      game_stats: {
        Row: {
          id: string
          total_gor_collected: number
          total_lobbies: number
          unique_players: number
          total_fees: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          total_gor_collected?: number
          total_lobbies?: number
          unique_players?: number
          total_fees?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          total_gor_collected?: number
          total_lobbies?: number
          unique_players?: number
          total_fees?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}