"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make subscriptionId nullable in payments table
    await queryInterface.changeColumn("payments", "subscriptionId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "member_subscriptions",
        key: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert subscriptionId to not nullable
    await queryInterface.changeColumn("payments", "subscriptionId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "member_subscriptions",
        key: "id",
      },
    });
  },
};
