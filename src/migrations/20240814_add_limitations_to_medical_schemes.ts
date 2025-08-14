import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add limitations column to medical_schemes table
  await queryInterface.addColumn("medical_schemes", "limitations", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  });

  // Update existing benefits to be arrays instead of objects
  await queryInterface.sequelize.query(`
    UPDATE medical_schemes 
    SET benefits = '[]'::jsonb 
    WHERE benefits IS NULL OR benefits = '{}'::jsonb
  `);

  // Update existing benefits to convert from object format to array format
  await queryInterface.sequelize.query(`
    UPDATE medical_schemes 
    SET benefits = '["Basic medical coverage"]'::jsonb 
    WHERE benefits IS NULL OR benefits = '{}'::jsonb
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove the limitations column
  await queryInterface.removeColumn("medical_schemes", "limitations");
}
