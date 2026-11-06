-- Previously paused worlds continue from deployment time. New live worlds have
-- no pause operation; closing a world ends it permanently.
UPDATE worlds SET status='running', state=json_set(state,'$.lastTick',CAST(strftime('%s','now') AS INTEGER)*1000), revision=revision+1 WHERE status='paused';
