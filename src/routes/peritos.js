const express = require("express");
const { createPeritosController } = require("../controllers/peritosController");
const { apiKeyAuth } = require("../middleware/apiKeyAuth");

function createPeritosRouter(models, env = process.env) {
  const router = express.Router();
  const controller = createPeritosController(models);

  router.use(apiKeyAuth(models.AuditLog, env));
  router.use(express.json());
  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.delete("/:id", controller.remove);

  return router;
}

module.exports = { createPeritosRouter };
