"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environments = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_js_1 = require("./user.js");
exports.environments = (0, pg_core_1.pgTable)("environments", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey(),
    user_id: (0, pg_core_1.uuid)()
        .references(function () { return user_js_1.users.id; })
        .notNull(),
    config: (0, pg_core_1.text)().notNull(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
