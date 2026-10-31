const express = require("express");
const morgan = require("morgan");
const chalk = require("chalk");
const { createPeritosRouter } = require("./routes/peritos");

function createApp(models, env = process.env) {
  const app = express();

  app.use(morgan("combined"));
  app.use("/api/v1/peritos", createPeritosRouter(models, env));

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error.status === 400 || error.status === 413) {
      const message = error.status === 413 ? "El cuerpo de la solicitud es demasiado grande." : "El JSON de la solicitud no es válido.";
      console.warn(chalk.yellow(`Validación fallida [body]: ${message}`));
      return res.status(error.status).json({ error: message, field: "body" });
    }

    console.error(chalk.red(`Error crítico (500):\n${error.stack || error}`));
    return res.status(500).json({ error: "Error interno del servidor." });
  });

  return app;
}

module.exports = { createApp };
