const fs = require("node:fs");
const path = require("node:path");
const { Sequelize } = require("sequelize");

function createSequelize(env = process.env) {
  const defaultDialect = env.NODE_ENV === "production" ? "postgres" : "sqlite";
  const dialect = env.DB_DIALECT || defaultDialect;

  if (dialect === "sqlite") {
    const storage = env.DB_STORAGE || path.join(process.cwd(), "data", "peritos.sqlite");
    if (storage !== ":memory:") {
      fs.mkdirSync(path.dirname(path.resolve(storage)), { recursive: true });
    }

    return new Sequelize({
      dialect: "sqlite",
      storage,
      logging: false
    });
  }

  if (dialect === "postgres") {
    if (env.DATABASE_URL) {
      const options = { dialect: "postgres", logging: false };
      if (env.DB_SSL === "true") {
        options.dialectOptions = { ssl: { require: true, rejectUnauthorized: false } };
      }
      return new Sequelize(env.DATABASE_URL, options);
    }

    const options = {
      dialect: "postgres",
      logging: false,
      host: env.DB_HOST || "localhost",
      port: Number(env.DB_PORT || 5432),
      username: env.DB_USER || "postgres",
      password: env.DB_PASSWORD || "postgres",
      database: env.DB_NAME || "peritos"
    };

    if (env.DB_SSL === "true") {
      options.dialectOptions = { ssl: { require: true, rejectUnauthorized: false } };
    }

    return new Sequelize(options);
  }

  throw new Error(`Unsupported DB_DIALECT "${dialect}". Use "sqlite" or "postgres".`);
}

module.exports = { createSequelize };
