import {sql} from "drizzle-orm";
import { sqliteTable, text, integer, real, primaryKey, check, index } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", { id:text("id").primaryKey(), email:text("email").notNull().unique(), name:text("name").notNull(), password:text("password").notNull(), created:integer("created").notNull(), role:text("role").notNull().default("user"), status:text("status").notNull().default("active"),moneyDisplay:text("money_display").notNull().default("full") });
export const sessions = sqliteTable("sessions", { token:text("token").primaryKey(), userId:text("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}), expires:integer("expires").notNull() });
export const worlds = sqliteTable("worlds", { id:text("id").primaryKey(), name:text("name").notNull(), description:text("description").notNull(), speed:integer("speed").notNull(), state:text("state").notNull(), revision:integer("revision").notNull().default(0), owner:text("owner"),config:text("config").notNull().default("{}"),status:text("status").notNull().default("running"),created:integer("created").notNull().default(0) });
export const limits = sqliteTable("limits", { id:text("id").primaryKey(), hits:integer("hits").notNull(), expires:integer("expires").notNull() });
export const mapSnapshots = sqliteTable("map_snapshots", { id:text("id").primaryKey(), payload:text("payload").notNull(), created:integer("created").notNull() });

export const appSettings = sqliteTable("app_settings", {id:text("id").primaryKey(), ownerUserId:text("owner_user_id")});
export const audit = sqliteTable("admin_audit", {id:text("id").primaryKey(),actor:text("actor").notNull(),action:text("action").notNull(),target:text("target").notNull(),created:integer("created").notNull()});
export const vehicleCatalogs = sqliteTable("vehicle_catalogs", {revision:integer("revision").primaryKey(),created:integer("created").notNull(),payload:text("payload").notNull(),digest:text("digest").notNull()});

export const logisticsWorlds = sqliteTable('logistics_worlds', {
 settings:text('settings').notNull().default('{}'),market:text('market').notNull().default('{}'),description:text('description').notNull().default(''),status:text('status').notNull().default('running'),timeScale:real('time_scale').notNull().default(1),id:text('id').primaryKey(), name:text('name').notNull(), ownerId:text('owner_id').notNull().references(()=>users.id),
 day:integer('day').notNull().default(1), lastTick:integer('last_tick').notNull(), tickMs:integer('tick_ms').notNull(), revision:integer('revision').notNull().default(0),created:integer('created').notNull(),
});
export const logisticsWorldCompanies = sqliteTable('logistics_world_companies', {
 worldId:text('world_id').notNull().references(()=>logisticsWorlds.id,{onDelete:'cascade'}), userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 name:text('name').notNull().default(''),state:text('state').notNull(), revision:integer('revision').notNull().default(0),lastAction:text('last_action'),updated:integer('updated').notNull(),
},t=>[primaryKey({columns:[t.worldId,t.userId]})]);
export const logisticsWorldOffers = sqliteTable('logistics_world_offers', {
 id:text('id').primaryKey(),worldId:text('world_id').notNull().references(()=>logisticsWorlds.id,{onDelete:'cascade'}),senderId:text('sender_id').notNull().references(()=>users.id,{onDelete:'cascade'}),receiverId:text('receiver_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 quantityUnit:text('quantity_unit').notNull().default('t'),siteId:text('site_id').notNull(),good:text('good').notNull(),quantity:real('quantity').notNull(),price:integer('price').notNull(),status:text('status').notNull().default('open'),created:integer('created').notNull(),expires:integer('expires').notNull(),settled:integer('settled'),
},t=>[check('world_offer_quantity',sql`${t.quantity}>0 AND ${t.quantity}<=10000`),check('world_offer_price',sql`${t.price}>=0 AND ${t.price}<=2000000000`),check('world_offer_parties',sql`${t.senderId}<>${t.receiverId}`),check('world_offer_status',sql`${t.status} IN ('open','accepted','rejected','withdrawn')`),index('world_offers_receiver').on(t.worldId,t.receiverId,t.status)]);
export const logisticsWorldPermissions = sqliteTable('logistics_world_permissions', {
 worldId:text('world_id').notNull().references(()=>logisticsWorlds.id,{onDelete:'cascade'}),ownerId:text('owner_id').notNull().references(()=>users.id,{onDelete:'cascade'}),granteeId:text('grantee_id').notNull().references(()=>users.id,{onDelete:'cascade'}),enabled:integer('enabled').notNull().default(0),updated:integer('updated').notNull(),
},t=>[primaryKey({columns:[t.worldId,t.ownerId,t.granteeId]}),check('world_permission_enabled',sql`${t.enabled} IN (0,1)`),check('world_permission_parties',sql`${t.ownerId}<>${t.granteeId}`)]);
export const logisticsWorldGuards = sqliteTable('logistics_world_guards', {id:text('id').primaryKey(),valid:integer('valid').notNull()},t=>[check('world_guard_valid',sql`${t.valid}=1`)]);

export const logisticsPartnerRegistry=sqliteTable('logistics_partner_registry',{id:text('id').primaryKey(),kind:text('kind').notNull(),name:text('name').notNull(),lat:real('lat').notNull(),lon:real('lon').notNull(),payload:text('payload').notNull(),loaded:integer('loaded').notNull()},t=>[index('logistics_partner_area').on(t.lat,t.lon)]);
export const logisticsLoadedAreas=sqliteTable('logistics_loaded_areas',{id:text('id').primaryKey(),loaded:integer('loaded').notNull(),source:text('source').notNull(),count:integer('count').notNull()});
export const logisticsRuntime=sqliteTable('logistics_runtime',{id:text('id').primaryKey(),updated:integer('updated').notNull(),payload:text('payload').notNull()});

export const logisticsPartnerRules=sqliteTable('logistics_partner_rules',{id:text('id').primaryKey(),payload:text('payload').notNull(),updated:integer('updated').notNull(),actor:text('actor').notNull()});
export const logisticsRuleRevision=sqliteTable('logistics_rule_revision',{id:text('id').primaryKey(),revision:integer('revision').notNull().default(0)});

export const logisticsContainerOffers=sqliteTable('logistics_container_offers',{id:text('id').primaryKey(),worldId:text('world_id').notNull(),day:integer('day').notNull(),sourceId:text('source_id').notNull(),destinationId:text('destination_id').notNull(),slot:integer('slot').notNull(),sourceCountry:text('source_country').notNull().default(''),destinationCountry:text('destination_country').notNull().default(''),sourceCity:text('source_city').notNull().default(''),destinationCity:text('destination_city').notNull().default(''),distanceKm:real('distance_km').notNull().default(0),good:text('good').notNull().default('containers'),quantity:real('quantity').notNull(),fee:real('fee').notNull(),deadline:real('deadline').notNull(),status:text('status').notNull().default('open'),acceptedBy:text('accepted_by')},t=>[index('container_world_day').on(t.worldId,t.day,t.sourceId),index('container_world_distance').on(t.worldId,t.day,t.status,t.distanceKm),index('container_world_places').on(t.worldId,t.day,t.sourceCountry,t.destinationCountry)]);
