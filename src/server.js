require("dotenv").config();

const { createSequelize } = require("./config/database");
const { defineModels } = require("./models");
const { createApp } = require("./app");

const roles = ["ADMIN", "FORENSIC_INSPECTOR", "AUDITOR"];

async function start() {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY must be configured before starting the server.");
  }

  const sequelize = createSequelize();
  const models = defineModels(sequelize);

  await sequelize.authenticate();
  await sequelize.sync();
  for (const nombre_rol of roles) {
    await models.Role.findOrCreate({ where: { nombre_rol } });
  }

  const port = Number(process.env.PORT || 3000);
  const server = createApp(models).listen(port, () => {
    console.log(`API de peritos escuchando en el puerto ${port}.`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("\u001b[31mNo se pudo iniciar el servidor:\u001b[0m", error.stack || error);
  process.exitCode = 1;
});
