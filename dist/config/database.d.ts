import { Sequelize } from "sequelize";
declare const sequelize: Sequelize;
export declare const testConnection: () => Promise<boolean>;
export declare const syncDatabase: (force?: boolean) => Promise<void>;
export declare const closeConnection: () => Promise<void>;
export default sequelize;
//# sourceMappingURL=database.d.ts.map