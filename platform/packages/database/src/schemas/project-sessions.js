"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectSession = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var projects_js_1 = require("./projects.js");
var user_js_1 = require("./user.js");
exports.projectSession = (0, pg_core_1.pgTable)("project_session", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey(),
    started_at: (0, pg_core_1.timestamp)().defaultNow(),
    ended_at: (0, pg_core_1.timestamp)().defaultNow(),
    user_id: (0, pg_core_1.uuid)().references(function () { return user_js_1.users.id; }, { onDelete: "cascade" }),
    project_id: (0, pg_core_1.uuid)()
        .notNull()
        .references(function () { return projects_js_1.projects.id; }, { onDelete: "cascade" }),
    charges: (0, pg_core_1.integer)().notNull(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
