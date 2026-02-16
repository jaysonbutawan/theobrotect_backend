ALTER TABLE users
ADD CONSTRAINT admin_must_have_password
CHECK (role <> 'admin' OR password_hash IS NOT NULL);
