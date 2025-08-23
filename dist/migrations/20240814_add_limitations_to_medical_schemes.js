"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
async function up(queryInterface) {
    await queryInterface.addColumn("medical_schemes", "limitations", {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
    });
    await queryInterface.sequelize.query(`
    UPDATE medical_schemes 
    SET benefits = '[]'::jsonb 
    WHERE benefits IS NULL OR benefits = '{}'::jsonb
  `);
    await queryInterface.sequelize.query(`
    UPDATE medical_schemes 
    SET benefits = '["Basic medical coverage"]'::jsonb 
    WHERE benefits IS NULL OR benefits = '{}'::jsonb
  `);
}
async function down(queryInterface) {
    await queryInterface.removeColumn("medical_schemes", "limitations");
}
//# sourceMappingURL=20240814_add_limitations_to_medical_schemes.js.map