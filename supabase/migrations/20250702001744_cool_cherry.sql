/*
  # Fight Dragon Game Tables

  1. New Tables
    - `fight_dragon_battles` - Battle sessions for Fight Dragon game mode
    - `fight_dragon_players` - Player entries for Fight Dragon battles

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (similar to main game tables)

  3. Features
    - Dragon vs Knight battles (sides 1 and 10)
    - Same prize distribution system as main game
    - Separate battle tracking and statistics
*/

-- Fight Dragon Battles table
CREATE TABLE IF NOT EXISTS fight_dragon_battles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  result_number integer CHECK (result_number IN (1, 10)),
  status text CHECK (status IN ('waiting', 'active', 'completed')) DEFAULT 'waiting',
  total_players integer DEFAULT 0,
  total_amount decimal(10,4) DEFAULT 0
);

-- Fight Dragon Players table
CREATE TABLE IF NOT EXISTS fight_dragon_players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id uuid REFERENCES fight_dragon_battles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  selected_number integer CHECK (selected_number IN (1, 10)) NOT NULL,
  transaction_hash text,
  is_winner boolean DEFAULT false,
  prize_amount decimal(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  reward_claimed boolean DEFAULT false,
  reward_transaction_hash text
);

-- Add table comments
COMMENT ON TABLE fight_dragon_battles IS 'Battle sessions for Fight Dragon game mode';
COMMENT ON TABLE fight_dragon_players IS 'Player entries for Fight Dragon battles';

-- Add column comments
COMMENT ON COLUMN fight_dragon_players.transaction_hash IS 'Transaction hash for battle entry payment';
COMMENT ON COLUMN fight_dragon_players.reward_transaction_hash IS 'Transaction hash for reward claim payout';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fight_dragon_battles_status ON fight_dragon_battles(status);
CREATE INDEX IF NOT EXISTS idx_fight_dragon_battles_created_at ON fight_dragon_battles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fight_dragon_players_lobby_id ON fight_dragon_players(lobby_id);
CREATE INDEX IF NOT EXISTS idx_fight_dragon_players_wallet_address ON fight_dragon_players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_fight_dragon_players_is_winner ON fight_dragon_players(is_winner);
CREATE INDEX IF NOT EXISTS idx_fight_dragon_players_reward_claimed ON fight_dragon_players(reward_claimed);

-- Enable Row Level Security
ALTER TABLE fight_dragon_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fight_dragon_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fight_dragon_battles (public read, public insert for scheduler)
CREATE POLICY "Anyone can view fight dragon battles"
  ON fight_dragon_battles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert fight dragon battles"
  ON fight_dragon_battles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for fight_dragon_players (public read and insert)
CREATE POLICY "Anyone can view fight dragon players"
  ON fight_dragon_players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert fight dragon players"
  ON fight_dragon_players
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Function to update fight dragon battle stats
CREATE OR REPLACE FUNCTION update_fight_dragon_battle_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE fight_dragon_battles 
    SET 
      total_players = (SELECT COUNT(*) FROM fight_dragon_players WHERE lobby_id = NEW.lobby_id),
      total_amount = (SELECT COUNT(*) * 0.1 FROM fight_dragon_players WHERE lobby_id = NEW.lobby_id)
    WHERE id = NEW.lobby_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update fight dragon battle stats
DROP TRIGGER IF EXISTS trigger_update_fight_dragon_battle_stats ON fight_dragon_players;
CREATE TRIGGER trigger_update_fight_dragon_battle_stats
  AFTER INSERT ON fight_dragon_players
  FOR EACH ROW
  EXECUTE FUNCTION update_fight_dragon_battle_stats();