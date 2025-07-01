/*
  # Add reward transaction hash column

  1. New Column
    - Add `reward_transaction_hash` to players table to track reward claim transactions
    - This is separate from the existing `transaction_hash` which tracks game entry transactions

  2. Security
    - Add index for efficient querying of reward transactions
    - Update existing data to ensure consistency
*/

-- Add reward_transaction_hash column to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'reward_transaction_hash'
  ) THEN
    ALTER TABLE players ADD COLUMN reward_transaction_hash text;
  END IF;
END $$;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_players_reward_transaction_hash ON players(reward_transaction_hash);

-- Add comment to clarify the difference between transaction hashes
COMMENT ON COLUMN players.transaction_hash IS 'Transaction hash for game entry payment';
COMMENT ON COLUMN players.reward_transaction_hash IS 'Transaction hash for reward claim payout';