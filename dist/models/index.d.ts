import sequelize from "../config/database";
import User from "./User";
import MedicalScheme from "./MedicalScheme";
import Document from "./Document";
import MemberSubscription from "./MemberSubscription";
export { sequelize, User, MedicalScheme, Document, MemberSubscription, };
export declare const initializeDatabase: () => Promise<void>;
declare const _default: {
    sequelize: import("sequelize").Sequelize;
    User: typeof User;
    MedicalScheme: typeof MedicalScheme;
    Document: typeof Document;
    MemberSubscription: typeof MemberSubscription;
    initializeDatabase: () => Promise<void>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map