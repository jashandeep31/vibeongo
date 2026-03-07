"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectFileData = exports.projectFiles = exports.projects = exports.projectStatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.projectStatusEnum = (0, pg_core_1.pgEnum)("project_status", [
    "running",
    "terminated",
]);
exports.projects = (0, pg_core_1.pgTable)("projects", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)().notNull(),
    description: (0, pg_core_1.text)(),
    status: (0, exports.projectStatusEnum)().notNull(),
    total_charges: (0, pg_core_1.integer)().notNull().default(0),
    ports_config: (0, pg_core_1.json)().notNull(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.projectFiles = (0, pg_core_1.pgTable)("project_files", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)().notNull(),
    path: (0, pg_core_1.varchar)().notNull(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.projectFileData = (0, pg_core_1.pgTable)("project_file_data", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    version: (0, pg_core_1.integer)(),
    project_file_id: (0, pg_core_1.uuid)().references(function () { return exports.projectFiles.id; }, {
        onDelete: "cascade",
    }),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
