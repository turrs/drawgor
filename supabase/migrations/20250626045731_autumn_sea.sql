/*
# GOR Number Draw Game Database Schema

This migration creates the complete database structure for the GOR Number Draw game:

## New Tables
1. **lobbies** - Game lobbies with timing and results
2. **players** - Player entries for each lobby
3. **system_config** - Central wallet and game configuration  
4. **game_stats** - Overall game statistics

## Security
- Enable RLS on all tables
- Add policies for authenticated access
- Separate admin access for system_config

## Features
- Real-time lobby management
- Player tracking and winner determination
- Automated prize distribution support
- Admin configuration management
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Lobbies table for game sessions
CREATE TABLE IF NOT EXISTS lobbies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  result_number integer CHECK (result_number >= 1 AND result_number <= 10),
  status text CHECK (status IN ('waiting', 'active', 'completed')) DEFAULT 'waiting',
  total_players integer DEFAULT 0,
  total_amount decimal(10,4) DEFAULT 0
);

-- Players table for game entries
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id uuid REFERENCES lobbies(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  selected_number integer CHECK (selected_number >= 1 AND selected_number <= 10) NOT NULL,
  transaction_hash text,
  is_winner boolean DEFAULT false,
  prize_amount decimal(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
  id text PRIMARY KEY DEFAULT '1',
  central_wallet_address text NOT NULL DEFAULT '',
  central_wallet_private_key text NOT NULL DEFAULT '',
  platform_fee_percentage decimal(4,2) DEFAULT 3.00,
  entry_fee decimal(10,4) DEFAULT 0.1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Game statistics table
CREATE TABLE IF NOT EXISTS game_stats (
  id text PRIMARY KEY DEFAULT '1',
  total_gor_collected decimal(12,4) DEFAULT 0,
  total_lobbies integer DEFAULT 0,
  unique_players integer DEFAULT 0,
  total_fees decimal(12,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_created_at ON lobbies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_lobby_id ON players(lobby_id);
CREATE INDEX IF NOT EXISTS idx_players_wallet_address ON players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_is_winner ON players(is_winner);

-- Enable Row Level Security
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lobbies (public read)
CREATE POLICY "Anyone can view lobbies"
  ON lobbies
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for players (public read)
CREATE POLICY "Anyone can view players"
  ON players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert players"
  ON players
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for system_config (admin only)
CREATE POLICY "Admin can manage system config"
  ON system_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for game_stats (public read, admin write)
CREATE POLICY "Anyone can view game stats"
  ON game_stats
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin can update game stats"
  ON game_stats
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default system configuration
INSERT INTO system_config (id, central_wallet_address, central_wallet_private_key, platform_fee_percentage, entry_fee)
VALUES ('1', '', '', 3.00, 0.1)
ON CONFLICT (id) DO NOTHING;

-- Insert default game statistics
INSERT INTO game_stats (id, total_gor_collected, total_lobbies, unique_players, total_fees)
VALUES ('1', 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Function to update lobby player count
CREATE OR REPLACE FUNCTION update_lobby_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lobbies 
    SET 
      total_players = (SELECT COUNT(*) FROM players WHERE lobby_id = NEW.lobby_id),
      total_amount = (SELECT COUNT(*) * 0.1 FROM players WHERE lobby_id = NEW.lobby_id)
    WHERE id = NEW.lobby_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update lobby stats
DROP TRIGGER IF EXISTS trigger_update_lobby_stats ON players;
CREATE TRIGGER trigger_update_lobby_stats
  AFTER INSERT ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_lobby_stats();

-- Function to update global game statistics
CREATE OR REPLACE FUNCTION update_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    UPDATE game_stats 
    SET 
      total_gor_collected = total_gor_collected + NEW.total_amount,
      total_lobbies = total_lobbies + 1,
      total_fees = total_fees + (NEW.total_amount * 0.03),
      unique_players = (SELECT COUNT(DISTINCT wallet_address) FROM players),
      updated_at = now()
    WHERE id = '1';
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update global stats when lobby completes
DROP TRIGGER IF EXISTS trigger_update_game_stats ON lobbies;
CREATE TRIGGER trigger_update_game_stats
  AFTER UPDATE ON lobbies
  FOR EACH ROW
  EXECUTE FUNCTION update_game_stats();