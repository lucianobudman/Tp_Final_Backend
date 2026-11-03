const chalk = require("chalk");
const createError = require("http-errors");
const { UniqueConstraintError, ValidationError } = require("sequelize");

function logValidation(field, message) {
  console.warn(chalk.yellow(`Validación fallida [${field}]: ${message}`));
}

function createPeritosController({ User, Role }) {
  const roleInclude = {
    model: Role,
    as: "role",
    attributes: ["id", "nombre_rol"],
    required: false
  };

  return {
    async create(req, res, next) {
      const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
      const roleId = Number(req.body.role_id);

      if (!username) {
        logValidation("username", "el nombre de usuario no debe estar vacío.");
        return next(createError(400, "username no debe estar vacío.", { field: "username" }));
      }

      if (!Number.isInteger(roleId) || roleId <= 0) {
        logValidation("role_id", "debe ser un ID de rol válido.");
        return next(createError(400, "role_id debe ser un ID de rol válido.", { field: "role_id" }));
      }

      try {
        const role = await Role.findByPk(roleId);
        if (!role) {
          logValidation("role_id", `no existe el rol con ID ${roleId}.`);
          return next(createError(400, "El rol indicado no existe.", { field: "role_id" }));
        }

        const user = await User.create({ username, role_id: roleId });
        const createdUser = await User.findByPk(user.id, { include: [roleInclude] });
        console.log(chalk.cyan(`Perito creado: ${JSON.stringify(createdUser.toJSON())}`));
        return res.status(201).json(createdUser);
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          logValidation("username", "ya existe.");
          return next(createError(409, "El username ya existe.", { field: "username" }));
        }
        if (error instanceof ValidationError) {
          logValidation("username", error.message);
          return next(createError(400, error.message, { field: "username" }));
        }
        return next(error);
      }
    },

    async remove(req, res, next) {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return next(createError(404, "Perito no encontrado."));
      }

      try {
        const user = await User.findByPk(id);
        if (!user) {
          return next(createError(404, "Perito no encontrado."));
        }

        await user.update({ active: false });
        return res.status(200).json({ message: "Perito dado de baja.", id: user.id });
      } catch (error) {
        return next(error);
      }
    },

    async list(req, res, next) {
      try {
        const include = { ...roleInclude };
        if (req.query.role) {
          const role = await Role.findOne({ where: { nombre_rol: req.query.role } });
          if (!role) {
            logValidation("role", `no existe el rol "${req.query.role}".`);
            return next(createError(400, "El rol indicado no existe.", { field: "role" }));
          }
          include.where = { id: role.id };
          include.required = true;
        }

        const users = await User.findAll({
          where: { active: true },
          include: [include],
          order: [["id", "ASC"]]
        });
        return res.status(200).json(users);
      } catch (error) {
        return next(error);
      }
    },

    async getById(req, res, next) {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return next(createError(404, "Perito no encontrado."));
      }

      try {
        const user = await User.findOne({
          where: { id, active: true },
          include: [roleInclude]
        });
        if (!user) {
          return next(createError(404, "Perito no encontrado."));
        }
        return res.status(200).json(user);
      } catch (error) {
        return next(error);
      }
    }
  };
}

module.exports = { createPeritosController };
