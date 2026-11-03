const path = require("node:path");
const { createSequelize } = require("../src/config/database");
const { defineModels } = require("../src/models");

const sampleUsers = [
  { username: "perito_admin", role: "ADMIN" },
  { username: "perito_forense", role: "FORENSIC_INSPECTOR" },
  { username: "perito_auditor", role: "AUDITOR" }
];

async function seedDatabase() {
  const sequelize = createSequelize({
    DB_DIALECT: "sqlite",
    DB_STORAGE: path.join(__dirname, "..", "forensics.db")
  });
  const models = defineModels(sequelize);

  try {
    await sequelize.sync();
    for (const nombre_rol of ["ADMIN", "FORENSIC_INSPECTOR", "AUDITOR"]) {
      await models.Role.findOrCreate({ where: { nombre_rol } });
    }

    for (const sampleUser of sampleUsers) {
      const role = await models.Role.findOne({ where: { nombre_rol: sampleUser.role } });
      await models.User.findOrCreate({
        where: { username: sampleUser.username },
        defaults: { role_id: role.id }
      });
    }
    console.log(`Base SQLite preparada con al menos ${sampleUsers.length} usuarios de prueba.`);
  } finally {
    await sequelize.close();
  }
}

seedDatabase().catch((error) => {
  console.error("No se pudo preparar forensics.db:", error.stack || error);
  process.exitCode = 1;
});
