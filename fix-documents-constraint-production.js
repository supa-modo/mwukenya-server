const { Sequelize } = require("sequelize");

// Database configuration - update these values for your production environment
const config = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "mwukenya",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  dialect: "postgres",
  logging: console.log,
};

async function fixDocumentsConstraint() {
  console.log(
    "🔧 Fixing documents table foreign key constraint in production..."
  );
  console.log("📊 Database:", config.database);
  console.log("🌐 Host:", config.host);

  const sequelize = new Sequelize(config);

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // First, let's check the current constraints
    console.log("🔍 Checking current constraints...");
    const constraints = await sequelize.query(
      `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'documents';
    `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log("📋 Current foreign key constraints:");
    constraints.forEach((constraint) => {
      console.log(
        `  - ${constraint.constraint_name}: ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`
      );
    });

    // Drop the problematic foreign key constraint
    console.log("\n🗑️ Dropping problematic foreign key constraint...");
    await sequelize.query(`
      ALTER TABLE documents 
      DROP CONSTRAINT IF EXISTS documents_entity_id_fkey;
    `);

    console.log("✅ Foreign key constraint dropped");

    // Check if we can create a simple constraint to users table
    console.log("\n🔗 Adding foreign key constraint to users table...");
    try {
      await sequelize.query(`
        ALTER TABLE documents 
        ADD CONSTRAINT documents_entity_id_fkey 
        FOREIGN KEY (entity_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE;
      `);
      console.log("✅ Users foreign key constraint added successfully");
    } catch (error) {
      console.log("⚠️ Could not add users constraint:", error.message);
    }

    // Try to add constraint to dependants table
    console.log("\n🔗 Adding foreign key constraint to dependants table...");
    try {
      await sequelize.query(`
        ALTER TABLE documents 
        ADD CONSTRAINT documents_entity_id_dependants_fkey 
        FOREIGN KEY (entity_id) 
        REFERENCES dependants(id) 
        ON DELETE CASCADE;
      `);
      console.log("✅ Dependants foreign key constraint added successfully");
    } catch (error) {
      console.log("⚠️ Could not add dependants constraint:", error.message);
    }

    // Add a check constraint to ensure entity_type matches the referenced table
    console.log("\n🔗 Adding check constraint for entity_type...");
    try {
      await sequelize.query(`
        ALTER TABLE documents 
        ADD CONSTRAINT documents_entity_type_check 
        CHECK (
          (entity_type = 'user' AND entity_id IN (SELECT id FROM users)) OR
          (entity_type = 'dependant' AND entity_id IN (SELECT id FROM dependants))
        );
      `);
      console.log("✅ Check constraint added successfully");
    } catch (error) {
      console.log("⚠️ Could not add check constraint:", error.message);

      // Try alternative approach
      console.log("\n🔧 Trying alternative approach...");
      try {
        await sequelize.query(`
          ALTER TABLE documents 
          ADD CONSTRAINT documents_entity_reference 
          CHECK (
            (entity_type = 'user' AND entity_id IN (SELECT id FROM users)) OR
            (entity_type = 'dependant' AND entity_id IN (SELECT id FROM dependants))
          );
        `);
        console.log("✅ Alternative check constraint created successfully!");
      } catch (altError) {
        console.error("❌ Alternative approach also failed:", altError.message);
      }
    }

    // Verify the fix by checking constraints again
    console.log("\n🔍 Verifying final constraints...");
    const finalConstraints = await sequelize.query(
      `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'documents';
    `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log("📋 Final foreign key constraints:");
    finalConstraints.forEach((constraint) => {
      console.log(
        `  - ${constraint.constraint_name}: ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`
      );
    });

    console.log("\n🎉 Documents table constraint fix completed!");
    console.log("💡 You can now try uploading documents again");
  } catch (error) {
    console.error("❌ Error fixing constraint:", error.message);

    if (error.message.includes("dependants")) {
      console.log("\n🔧 Manual fix required:");
      console.log("1. Connect to your production database");
      console.log(
        "2. Run: ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_entity_id_fkey;"
      );
      console.log(
        "3. Run: ALTER TABLE documents ADD CONSTRAINT documents_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES users(id) ON DELETE CASCADE;"
      );
    }
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the fix
if (require.main === module) {
  fixDocumentsConstraint().catch(console.error);
}

module.exports = fixDocumentsConstraint;
