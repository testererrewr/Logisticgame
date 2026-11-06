-- User-requested one-time balance for the identified test company in Atlas 01.
-- Other users/worlds, earned fares, loans and assets remain unchanged.
INSERT OR IGNORE INTO admin_audit(id,actor,action,target,created)
SELECT 'test-funds-20261022-hdf-atlas','site-owner','company.balance.set',
 json_object('world','atlas','company','047a37d1-2da0-4b72-82f4-e643943798ab','before',json_extract(c.value,'$.cash'),'after',999000000,'applied',0),
 CAST(strftime('%s','now') AS INTEGER)*1000
FROM worlds w,json_each(w.state,'$.companies') c
WHERE w.id='atlas' AND json_extract(c.value,'$.id')='047a37d1-2da0-4b72-82f4-e643943798ab';
--> statement-breakpoint
UPDATE worlds SET state=json_set(state,
 (SELECT c.fullkey||'.cash' FROM json_each(worlds.state,'$.companies') c WHERE json_extract(c.value,'$.id')='047a37d1-2da0-4b72-82f4-e643943798ab'),999000000),revision=revision+1
WHERE id='atlas' AND (SELECT json_extract(target,'$.applied') FROM admin_audit WHERE id='test-funds-20261022-hdf-atlas')=0 AND EXISTS(SELECT 1 FROM json_each(worlds.state,'$.companies') c WHERE json_extract(c.value,'$.id')='047a37d1-2da0-4b72-82f4-e643943798ab');

--> statement-breakpoint
UPDATE admin_audit SET target=json_set(target,'$.applied',1) WHERE id='test-funds-20261022-hdf-atlas' AND json_extract(target,'$.applied')=0;
