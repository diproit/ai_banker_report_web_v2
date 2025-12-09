-- Add user_role column to it_user_master table
ALTER TABLE it_user_master
ADD COLUMN user_role ENUM('ADMIN', 'FIELD_OFFICER', 'CLERK', 'BRANCH_MANAGER', 'CASHIER') DEFAULT 'CLERK';

-- Set user_role to ADMIN for a specific user (replace <user_id> with the actual id)
UPDATE it_user_master
SET user_role = 'ADMIN'
WHERE id = <user_id>;

-- Assign all nav rights to the admin user (replace <user_id> with the actual admin id)
INSERT INTO it_user_nav_rights (id, user_id, nav_menu_id, can_view, created_at, updated_at, is_active) VALUES
	(1, <user_id>, 1, TRUE, NOW(), NOW(), TRUE),
	(2, <user_id>, 2, TRUE, NOW(), NOW(), TRUE),
	(3, <user_id>, 3, TRUE, NOW(), NOW(), TRUE);
