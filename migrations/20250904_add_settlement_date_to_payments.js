const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add settlementDate column to payments table
    await queryInterface.addColumn("payments", "settlementDate", {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_DATE"),
    });

    // Add index for settlementDate column
    await queryInterface.addIndex(
      "payments",
      ["settlementDate", "paymentStatus"],
      {
        name: "idx_payments_settlement_status",
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the index first
    await queryInterface.removeIndex(
      "payments",
      "idx_payments_settlement_status"
    );

    // Remove the column
    await queryInterface.removeColumn("payments", "settlementDate");
  },
};
