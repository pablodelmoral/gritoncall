-- Create function to increment user streak safely
CREATE OR REPLACE FUNCTION increment_user_streak(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users_public
  SET 
    streak = streak + 1,
    best_streak = GREATEST(best_streak, streak + 1),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_user_streak(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION increment_user_streak(UUID) TO authenticated;

COMMENT ON FUNCTION increment_user_streak IS 'Safely increments user streak and updates best streak if needed';
