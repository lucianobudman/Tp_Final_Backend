const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { Sequelize } = require("sequelize");
const { defineModels } = require("../src/models");
const { createApp } = require("../src/app");
const { createSequelize } = require("../src/config/database");

const API_KEY = "test-api-key";
const sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
const models = defineModels(sequelize);
const app = createApp(models, { API_KEY });

before(async () => {
  await sequelize.sync({ force: true });
  await models.Role.bulkCreate([
    { nombre_rol: "ADMIN" },
    { nombre_rol: "FORENSIC_INSPECTOR" },
    { nombre_rol: "AUDITOR" }
  ]);
});

after(async () => {
  await sequelize.close();
});

test("selects SQLite in development and PostgreSQL in production", async () => {
  const sqlite = createSequelize({ NODE_ENV: "development", DB_STORAGE: ":memory:" });
  const postgres = createSequelize({
    NODE_ENV: "production",
    DATABASE_URL: "postgres://user:password@localhost:5432/peritos"
  });

  assert.equal(sqlite.getDialect(), "sqlite");
  assert.equal(postgres.getDialect(), "postgres");
  await sqlite.close();
  await postgres.close();
});

function authorized(method, path) {
  return request(app)[method](path).set("x-api-key", API_KEY);
}

test("rejects and persists requests without a valid API key", async () => {
  const response = await request(app).get("/api/v1/peritos");

  assert.equal(response.status, 401);
  assert.equal(await models.AuditLog.count(), 1);
  const audit = await models.AuditLog.findOne();
  assert.equal(audit.request_path, "/api/v1/peritos");
  assert.equal(audit.reason, "missing_api_key");

  const invalidKey = await request(app)
    .get("/api/v1/peritos")
    .set("x-api-key", "incorrect");
  assert.equal(invalidKey.status, 401);
  assert.equal(await models.AuditLog.count(), 2);
});

test("creates peritos, rejects duplicate usernames, filters and returns role names", async () => {
  const adminRole = await models.Role.findOne({ where: { nombre_rol: "ADMIN" } });
  const created = await authorized("post", "/api/v1/peritos")
    .send({ username: "ana", role_id: adminRole.id });

  assert.equal(created.status, 201);
  assert.equal(created.body.username, "ana");
  assert.equal(created.body.role.nombre_rol, "ADMIN");
  assert.equal(created.body.active, true);

  const duplicate = await authorized("post", "/api/v1/peritos")
    .send({ username: "ana", role_id: adminRole.id });
  assert.equal(duplicate.status, 409);

  const list = await authorized("get", "/api/v1/peritos?role=ADMIN");
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].role.nombre_rol, "ADMIN");
});

test("validates username and role and returns 404 for missing or inactive users", async () => {
  const malformedJson = await authorized("post", "/api/v1/peritos")
    .set("content-type", "application/json")
    .send("{");
  assert.equal(malformedJson.status, 400);

  const missingUsername = await authorized("post", "/api/v1/peritos")
    .send({ username: " ", role_id: 1 });
  assert.equal(missingUsername.status, 400);

  const invalidRole = await authorized("post", "/api/v1/peritos")
    .send({ username: "bea", role_id: 999 });
  assert.equal(invalidRole.status, 400);

  assert.equal((await authorized("get", "/api/v1/peritos/999")).status, 404);
  assert.equal((await authorized("delete", "/api/v1/peritos/999")).status, 404);

  const user = await models.User.findOne({ where: { username: "ana" } });
  assert.equal((await authorized("delete", `/api/v1/peritos/${user.id}`)).status, 200);
  assert.equal((await authorized("get", `/api/v1/peritos/${user.id}`)).status, 404);
  assert.equal((await authorized("get", "/api/v1/peritos")).body.length, 0);
});
