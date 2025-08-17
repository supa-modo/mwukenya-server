"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove unwanted columns from dependants table
    await queryInterface.removeColumn("dependants", "phone_number");
    await queryInterface.removeColumn("dependants", "emergency_contact_name");
    await queryInterface.removeColumn("dependants", "emergency_contact_phone");
    await queryInterface.removeColumn("dependants", "coverage_start_date");
    await queryInterface.removeColumn("dependants", "coverage_end_date");
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the removed columns if rollback is needed
    await queryInterface.addColumn("dependants", "phone_number", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn("dependants", "emergency_contact_name", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn("dependants", "emergency_contact_phone", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn("dependants", "coverage_start_date", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("dependants", "coverage_end_date", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
};
