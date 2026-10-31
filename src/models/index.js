const { DataTypes } = require("sequelize");

function defineModels(sequelize) {
  const Role = sequelize.define("Role", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre_rol: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: "roles",
    timestamps: false
  });

  const User = sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "username no debe estar vacío" }
      }
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "roles", key: "id" }
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: "users",
    timestamps: false
  });

  const AuditLog = sequelize.define("AuditLog", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    request_method: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    request_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    reason: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: "unauthorized_access_attempts",
    timestamps: false
  });

  User.belongsTo(Role, { foreignKey: "role_id", as: "role" });
  Role.hasMany(User, { foreignKey: "role_id", as: "users" });

  return { Role, User, AuditLog };
}

module.exports = { defineModels };
