const { Sequelize } = require("sequelize");
require("dotenv").config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING,
  {
    dialect: "postgres",
    logging: false,
  }
);

async function updateConstraints() {
  try {
    console.log("🔄 Updating database constraints...");

    // Drop existing unique constraints
    await sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_delegate_code_key;
    `);

    await sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_coordinator_code_key;
    `);

    // Create new partial unique constraints that allow NULL values
    await sequelize.query(`
      CREATE UNIQUE INDEX users_delegate_code_unique 
      ON users (delegate_code) 
      WHERE delegate_code IS NOT NULL;
    `);

    await sequelize.query(`
      CREATE UNIQUE INDEX users_coordinator_code_unique 
      ON users (coordinator_code) 
      WHERE coordinator_code IS NOT NULL;
    `);

    console.log("✅ Database constraints updated successfully!");
    console.log("📝 New constraints:");
    console.log(
      "   - delegate_code: unique when not null, allows multiple nulls"
    );
    console.log(
      "   - coordinator_code: unique when not null, allows multiple nulls"
    );
  } catch (error) {
    console.error("❌ Error updating constraints:", error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
updateConstraints();
