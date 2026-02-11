-- Create rate limiting table for consistent rate limiting across functions
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(key)
);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON rate_limits
  FOR ALL USING (false) WITH CHECK (false);

-- Create function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMP WITH TIME ZONE;
BEGIN
  v_now := timezone('utc'::text, now());
  
  -- Try to get existing record
  SELECT * INTO v_record FROM rate_limits WHERE key = p_key;
  
  IF NOT FOUND THEN
    -- First request, create record
    INSERT INTO rate_limits (key, count, reset_time)
    VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL);
    RETURN TRUE;
  END IF;
  
  -- Check if window has expired
  IF v_now > v_record.reset_time THEN
    -- Reset window
    UPDATE rate_limits 
    SET count = 1, reset_time = v_now + (p_window_seconds || ' seconds')::INTERVAL
    WHERE key = p_key;
    RETURN TRUE;
  END IF;
  
  -- Check if limit exceeded
  IF v_record.count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment count
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO anon;
