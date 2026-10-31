const { timingSafeEqual } = require("node:crypto");
const chalk = require("chalk");

function apiKeyAuth(AuditLog, env = process.env) {
  return async function authenticateApiKey(req, res, next) {
    const expectedKey = env.API_KEY;

    if (!expectedKey) {
      return next(new Error("API_KEY must be configured before serving requests."));
    }

    const providedKey = req.get("x-api-key") || "";
    const providedBuffer = Buffer.from(providedKey);
    const expectedBuffer = Buffer.from(expectedKey);
    const authorized = providedBuffer.length === expectedBuffer.length
      && timingSafeEqual(providedBuffer, expectedBuffer);

    if (authorized) {
      return next();
    }

    try {
      const requestPath = req.originalUrl.split("?")[0];
      await AuditLog.create({
        request_method: req.method,
        request_path: requestPath,
        ip_address: req.ip,
        reason: providedKey ? "invalid_api_key" : "missing_api_key"
      });
    } catch (error) {
      return next(error);
    }

    console.warn(chalk.yellow(`Acceso no autorizado: ${req.method} ${req.originalUrl.split("?")[0]}`));
    return res.status(401).json({ error: "API key inválida o ausente." });
  };
}

module.exports = { apiKeyAuth };
