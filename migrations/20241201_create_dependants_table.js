"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("dependants", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      other_names: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      relationship: {
        type: Sequelize.ENUM("spouse", "child", "parent", "sibling", "other"),
        allowNull: false,
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      gender: {
        type: Sequelize.ENUM("Male", "Female"),
        allowNull: false,
      },
      id_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      emergency_contact_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      emergency_contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "suspended"),
        defaultValue: "active",
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      verified_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      coverage_start_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      coverage_end_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex("dependants", ["user_id"]);
    await queryInterface.addIndex("dependants", ["status"]);
    await queryInterface.addIndex("dependants", ["is_verified"]);
    await queryInterface.addIndex("dependants", ["relationship"]);
    await queryInterface.addIndex("dependants", ["date_of_birth"]);
    await queryInterface.addIndex("dependants", ["id_number"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("dependants");
  },
};
