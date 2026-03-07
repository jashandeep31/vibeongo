"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersApiKeys = exports.accounts = exports.acountStatus = exports.accountProviders = exports.users = exports.userRoles = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.userRoles = (0, pg_core_1.pgEnum)("users_roles", ["user", "admin"]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)().unique().defaultRandom(),
    email: (0, pg_core_1.varchar)({ length: 255 }).notNull().unique(),
    first_name: (0, pg_core_1.varchar)().notNull(),
    last_name: (0, pg_core_1.varchar)(),
    role: (0, exports.userRoles)().default("user").notNull(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.accountProviders = (0, pg_core_1.pgEnum)("account_providers", ["google"]);
exports.acountStatus = (0, pg_core_1.pgEnum)("account_status", [
    "active",
    "banned",
    "deleted",
]);
exports.accounts = (0, pg_core_1.pgTable)("accounts", {
    id: (0, pg_core_1.uuid)().unique().defaultRandom(),
    user_id: (0, pg_core_1.uuid)().references(function () { return exports.users.id; }),
    provider: (0, exports.accountProviders)().notNull(),
    status: (0, exports.acountStatus)().notNull().default("active"),
    deleted_at: (0, pg_core_1.timestamp)(),
    last_login_at: (0, pg_core_1.timestamp)(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.usersApiKeys = (0, pg_core_1.pgTable)("users_api_keys", {
    id: (0, pg_core_1.uuid)().unique().defaultRandom(),
    user_id: (0, pg_core_1.uuid)().references(function () { return exports.users.id; }),
    expires_at: (0, pg_core_1.timestamp)().defaultNow(),
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
