import sequelize from "../config/database";
import { seedUsers } from "./userSeeder";
import { seedMedicalSchemes } from "./medicalSchemeSeeder";
import logger from "../utils/logger";

export async function runSeeders() {
  const transaction = await sequelize.transaction();

  try {
    logger.info("Starting database seeding...");

    // Run seeders in order (dependencies first)
    await seedUsers(transaction);
    await seedMedicalSchemes(transaction);

    await transaction.commit();
    logger.info("Database seeding completed successfully");
  } catch (error) {
    await transaction.rollback();
    logger.error(`Database seeding failed: ${error}`);
    throw error;
  }
}

// Run seeders if this file is executed directly
if (require.main === module) {
  runSeeders()
    .then(() => {
      console.log("✅ Database seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Database seeding failed:", error);
      process.exit(1);
    });
}
