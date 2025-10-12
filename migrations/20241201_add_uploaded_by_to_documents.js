"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "uploaded_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Add index for better query performance
    await queryInterface.addIndex("documents", ["uploaded_by"], {
      name: "documents_uploaded_by_idx",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex("documents", "documents_uploaded_by_idx");

    // Remove column
    await queryInterface.removeColumn("documents", "uploaded_by");
  },
};
