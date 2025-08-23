const { Sequelize } = require("sequelize");
const config = require("./dist/config/index").default;

async function fixDocumentsConstraint() {
  console.log("🔧 Fixing documents table foreign key constraint...");

  const sequelize = new Sequelize(config.database);

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Drop the problematic foreign key constraint
    console.log("🗑️ Dropping problematic foreign key constraint...");
    await sequelize.query(`
      ALTER TABLE documents 
      DROP CONSTRAINT IF EXISTS documents_entity_id_fkey;
    `);

    console.log("✅ Foreign key constraint dropped");

    // Add a new constraint that allows both users and dependants
    console.log("🔗 Adding new foreign key constraint...");
    await sequelize.query(`
      ALTER TABLE documents 
      ADD CONSTRAINT documents_entity_id_fkey 
      FOREIGN KEY (entity_id) 
      REFERENCES users(id) 
      ON DELETE CASCADE;
    `);

    console.log("✅ New foreign key constraint added");
    console.log("🎉 Documents table constraint fixed successfully!");
  } catch (error) {
    console.error("❌ Error fixing constraint:", error.message);

    if (error.message.includes("dependants")) {
      console.log(
        "\n🔧 Alternative solution: Creating a composite constraint..."
      );
      try {
        // Try to create a more flexible constraint
        await sequelize.query(`
          ALTER TABLE documents 
          ADD CONSTRAINT documents_entity_reference 
          CHECK (
            (entity_type = 'user' AND entity_id IN (SELECT id FROM users)) OR
            (entity_type = 'dependant' AND entity_id IN (SELECT id FROM dependants))
          );
        `);
        console.log("✅ Composite constraint created successfully!");
      } catch (altError) {
        console.error("❌ Alternative solution also failed:", altError.message);
        console.log("\n💡 Manual fix required:");
        console.log("1. Connect to your database");
        console.log("2. Drop the documents_entity_id_fkey constraint");
        console.log("3. Recreate it with proper references");
      }
    }
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixDocumentsConstraint();
