-- The existing account explicitly designated by the site owner.
-- Never infer administrator rights from a public registration request.
INSERT OR IGNORE INTO app_settings(id) VALUES('global');
--> statement-breakpoint
UPDATE users SET role='owner' WHERE id='7581c36c-f7d2-4791-8922-ea457ff4d28d' AND lower(email)='philipp.spreitzer@outlook.at' AND status='active';
--> statement-breakpoint
UPDATE app_settings SET owner_user_id='7581c36c-f7d2-4791-8922-ea457ff4d28d' WHERE id='global' AND EXISTS(SELECT 1 FROM users WHERE id='7581c36c-f7d2-4791-8922-ea457ff4d28d' AND role='owner');
--> statement-breakpoint
INSERT OR IGNORE INTO admin_audit(id,actor,action,target,created) SELECT 'designated-owner-v23',id,'owner.designated',id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM users WHERE id='7581c36c-f7d2-4791-8922-ea457ff4d28d' AND role='owner';
