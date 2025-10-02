/**
 * Migration: Add processing tracking fields to daily_settlements table
 *
 * This migration adds three fields to track the completion status of:
 * 1. SHA Bank Transfer
 * 2. MWU Bank Transfer
 * 3. Commission Payouts
 *
 * The settlement is only marked as "completed" when all three are done.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add sha_processed_at column
    await queryInterface.addColumn("daily_settlements", "sha_processed_at", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Timestamp when SHA bank transfer was processed",
    });

    // Add mwu_processed_at column
    await queryInterface.addColumn("daily_settlements", "mwu_processed_at", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Timestamp when MWU bank transfer was processed",
    });

    // Add commissions_processed_at column
    await queryInterface.addColumn(
      "daily_settlements",
      "commissions_processed_at",
      {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Timestamp when all commission payouts were processed",
      }
    );

    // Add sha_transaction_reference column
    await queryInterface.addColumn(
      "daily_settlements",
      "sha_transaction_reference",
      {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Transaction reference for SHA bank transfer",
      }
    );

    // Add mwu_transaction_reference column
    await queryInterface.addColumn(
      "daily_settlements",
      "mwu_transaction_reference",
      {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Transaction reference for MWU bank transfer",
      }
    );

    console.log(
      "✅ Added processing tracking fields to daily_settlements table"
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns in reverse order
    await queryInterface.removeColumn(
      "daily_settlements",
      "mwu_transaction_reference"
    );
    await queryInterface.removeColumn(
      "daily_settlements",
      "sha_transaction_reference"
    );
    await queryInterface.removeColumn(
      "daily_settlements",
      "commissions_processed_at"
    );
    await queryInterface.removeColumn("daily_settlements", "mwu_processed_at");
    await queryInterface.removeColumn("daily_settlements", "sha_processed_at");

    console.log(
      "✅ Removed processing tracking fields from daily_settlements table"
    );
  },
};

