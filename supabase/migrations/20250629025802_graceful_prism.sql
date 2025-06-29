/*
  # Fix System Config RLS Policies

  1. Security Updates
    - Update RLS policies for system_config table to allow public access for INSERT/UPDATE operations
    - This is necessary because the admin dashboard runs in the browser using the anon key
    - In a production environment, you might want to implement proper admin authentication

  2. Changes
    - Drop existing restrictive policy
    - Add new policies allowing public access for all operations on system_config
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admin can manage system config" ON system_config;

-- Create new policies that allow public access
-- Note: In production, you should implement proper admin authentication
CREATE POLICY "Allow public read access to system config"
  ON system_config
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to system config"
  ON system_config
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to system config"
  ON system_config
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to system config"
  ON system_config
  FOR DELETE
  TO public
  USING (true);