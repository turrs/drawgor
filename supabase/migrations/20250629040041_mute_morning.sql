/*
  # Add reward claimed tracking

  1. New Column
    - Add `reward_claimed` boolean column to players table
    - Default to false for new entries
    - Track whether winner has claimed their prize

  2. Index
    - Add index for efficient querying of unclaimed rewards

  3. Update existing records
    - Set existing winner records to unclaimed (false)
*/

-- Add reward_claimed column to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'reward_claimed'
  ) THEN
    ALTER TABLE players ADD COLUMN reward_claimed boolean DEFAULT false;
  END IF;
END $$;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_players_reward_claimed ON players(reward_claimed);

-- Update existing winner records to unclaimed
UPDATE players 
SET reward_claimed = false 
WHERE is_winner = true AND reward_claimed IS NULL;