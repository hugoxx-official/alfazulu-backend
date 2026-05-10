-- Tabla para almacenar device tokens de Firebase Cloud Messaging
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- Index para busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_token ON user_devices(device_token);

-- Enable RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own devices
CREATE POLICY "Users can view own devices" ON user_devices
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own devices
CREATE POLICY "Users can insert own devices" ON user_devices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own devices
CREATE POLICY "Users can update own devices" ON user_devices
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Delete own devices
CREATE POLICY "Users can delete own devices" ON user_devices
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for backend)
CREATE POLICY "Service role full access" ON user_devices
  FOR ALL
  USING (true);
