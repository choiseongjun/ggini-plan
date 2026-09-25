-- Private, resized diary photos. Removing/undoing a log removes its photos.
CREATE TABLE IF NOT EXISTS food_intake_photos (
 user_id BIGINT NOT NULL,
 log_id UUID NOT NULL,
 position SMALLINT NOT NULL CHECK(position BETWEEN 0 AND 3),
 image BYTEA NOT NULL CHECK(octet_length(image) <= 1048576),
 PRIMARY KEY(user_id,log_id,position),
 FOREIGN KEY(user_id,log_id) REFERENCES food_intake_logs(user_id,id) ON DELETE CASCADE
);
CREATE OR REPLACE FUNCTION delete_undone_intake_photos() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.undone_at IS NOT NULL THEN
  DELETE FROM food_intake_photos WHERE user_id=NEW.user_id AND log_id=NEW.id;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS food_intake_photo_cleanup ON food_intake_logs;
CREATE TRIGGER food_intake_photo_cleanup AFTER UPDATE OF undone_at ON food_intake_logs
FOR EACH ROW EXECUTE FUNCTION delete_undone_intake_photos();
