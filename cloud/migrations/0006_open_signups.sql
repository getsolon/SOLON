-- Promote all waitlisted users to regular users (open signups)
UPDATE users SET role = 'user' WHERE role = 'waitlisted';
