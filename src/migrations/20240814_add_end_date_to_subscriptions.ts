import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn("member_subscriptions", "end_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });

  // Add index for better query performance
  await queryInterface.addIndex("member_subscriptions", ["end_date"], {
    name: "idx_subscriptions_end_date",
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove the index first
  await queryInterface.removeIndex(
    "member_subscriptions",
    "idx_subscriptions_end_date"
  );

  // Remove the column
  await queryInterface.removeColumn("member_subscriptions", "end_date");
}
