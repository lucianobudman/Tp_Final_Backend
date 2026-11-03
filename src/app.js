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

    if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
      const status = error.type === "entity.too.large" ? 413 : 400;
      const message = status === 413 ? "El cuerpo de la solicitud es demasiado grande." : "El JSON de la solicitud no es válido.";
      console.warn(chalk.yellow(`Validación fallida [body]: ${message}`));
      return res.status(status).json({ error: message, field: "body" });
    }

    const status = error.statusCode || error.status;
    if (error.expose && status >= 400 && status < 500) {
      const response = { error: error.message };
      if (error.field) {
        response.field = error.field;
      }
      return res.status(status).json(response);
    }

    console.error(chalk.red(`Error crítico (500):\n${error.stack || error}`));
    return res.status(500).json({ error: "Error interno del servidor." });
  });

  return app;
}

module.exports = { createApp };
