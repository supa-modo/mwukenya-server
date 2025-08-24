"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log("🔧 Fixing documents table foreign key constraint...");

    try {
      // Drop the problematic foreign key constraint
      console.log("🗑️ Dropping problematic foreign key constraint...");
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        DROP CONSTRAINT IF EXISTS documents_entity_id_fkey;
      `);

      console.log("✅ Foreign key constraint dropped");

      // Add a new constraint that allows both users and dependants
      console.log("🔗 Adding new foreign key constraint...");
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        ADD CONSTRAINT documents_entity_id_fkey 
        FOREIGN KEY (entity_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE;
      `);

      console.log("✅ New foreign key constraint added for users");

      // Add a separate constraint for dependants
      console.log("🔗 Adding dependants foreign key constraint...");
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        ADD CONSTRAINT documents_entity_id_dependants_fkey 
        FOREIGN KEY (entity_id) 
        REFERENCES dependants(id) 
        ON DELETE CASCADE;
      `);

      console.log("✅ Dependants foreign key constraint added");

      // Add a check constraint to ensure entity_type matches the referenced table
      console.log("🔗 Adding check constraint for entity_type...");
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        ADD CONSTRAINT documents_entity_type_check 
        CHECK (
          (entity_type = 'user' AND entity_id IN (SELECT id FROM users)) OR
          (entity_type = 'dependant' AND entity_id IN (SELECT id FROM dependants))
        );
      `);

      console.log("✅ Check constraint added");
      console.log("🎉 Documents table constraint fixed successfully!");
    } catch (error) {
      console.error("❌ Error fixing constraint:", error.message);

      if (error.message.includes("dependants")) {
        console.log(
          "\n🔧 Alternative solution: Creating a more flexible constraint..."
        );
        try {
          // Try to create a more flexible constraint
          await queryInterface.sequelize.query(`
            ALTER TABLE documents 
            ADD CONSTRAINT documents_entity_reference 
            CHECK (
              (entity_type = 'user' AND entity_id IN (SELECT id FROM users)) OR
              (entity_type = 'dependant' AND entity_id IN (SELECT id FROM dependants))
            );
          `);
          console.log("✅ Composite constraint created successfully!");
        } catch (altError) {
          console.error(
            "❌ Alternative solution also failed:",
            altError.message
          );
          console.log("\n💡 Manual fix required:");
          console.log("1. Connect to your database");
          console.log("2. Drop the documents_entity_id_fkey constraint");
          console.log("3. Recreate it with proper references");
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log("🔄 Rolling back documents table constraint fix...");

    try {
      // Remove the check constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        DROP CONSTRAINT IF EXISTS documents_entity_type_check;
      `);

      // Remove the dependants constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        DROP CONSTRAINT IF EXISTS documents_entity_id_dependants_fkey;
      `);

      // Remove the users constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        DROP CONSTRAINT IF EXISTS documents_entity_id_fkey;
      `);

      // Recreate the original constraint (this might fail if the original was incorrect)
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        ADD CONSTRAINT documents_entity_id_fkey 
        FOREIGN KEY (entity_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE;
      `);

      console.log("✅ Rollback completed");
    } catch (error) {
      console.error("❌ Error during rollback:", error.message);
      console.log("⚠️ Manual rollback may be required");
    }
  },
};
