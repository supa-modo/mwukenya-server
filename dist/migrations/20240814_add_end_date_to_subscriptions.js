"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
async function up(queryInterface) {
    await queryInterface.addColumn("member_subscriptions", "end_date", {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
    });
    await queryInterface.addIndex("member_subscriptions", ["end_date"], {
        name: "idx_subscriptions_end_date",
    });
}
async function down(queryInterface) {
    await queryInterface.removeIndex("member_subscriptions", "idx_subscriptions_end_date");
    await queryInterface.removeColumn("member_subscriptions", "end_date");
}
//# sourceMappingURL=20240814_add_end_date_to_subscriptions.js.map