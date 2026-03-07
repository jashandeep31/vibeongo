"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ec2 = exports.ec2StatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
// this is the temp table for testing the local things nothing has to be taken to the production
exports.ec2StatusEnum = (0, pg_core_1.pgEnum)("ec2_status", ["running", "terminated"]);
exports.ec2 = (0, pg_core_1.pgTable)("ec2", {
    id: (0, pg_core_1.uuid)().unique().defaultRandom(),
    ec2_id: (0, pg_core_1.varchar)().notNull(),
    region: (0, pg_core_1.varchar)().notNull(),
    ip: (0, pg_core_1.varchar)(),
    status: (0, exports.ec2StatusEnum)().notNull().default("running"),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
