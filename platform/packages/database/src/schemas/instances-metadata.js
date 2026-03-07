"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instanceTypes = exports.instanceRegions = exports.instanceProvidersEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
// currently we are only using the aws instances
// TODO: please further add more regions to this
exports.instanceProvidersEnum = (0, pg_core_1.pgEnum)("instance_providers", ["aws"]);
exports.instanceRegions = (0, pg_core_1.pgTable)("instance_regions", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)().notNull(),
    slug: (0, pg_core_1.varchar)().notNull(),
    provider: (0, exports.instanceProvidersEnum)().notNull(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.instanceTypes = (0, pg_core_1.pgTable)("instance_types", {
    id: (0, pg_core_1.uuid)().primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)().notNull(),
    // WARN: slug should contain the region at the end of the slug
    slug: (0, pg_core_1.varchar)().notNull().unique(),
    description: (0, pg_core_1.text)(),
    cpu: (0, pg_core_1.text)(),
    ram: (0, pg_core_1.text)(),
    provider: (0, exports.instanceProvidersEnum)().notNull(),
    region_id: (0, pg_core_1.uuid)().references(function () { return exports.instanceRegions.id; }),
    price_per_hour: (0, pg_core_1.integer)().notNull(),
    price_per_sec: (0, pg_core_1.integer)().notNull(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
