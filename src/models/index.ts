import sequelize from "../config/database";
import User from "./User";
import MedicalScheme from "./MedicalScheme";

// Import other models as they are created
// import MemberSubscription from './MemberSubscription';
// import Payment from './Payment';
// import PaymentCoverage from './PaymentCoverage';

// Define associations
const setupAssociations = (): void => {
  // User self-referencing associations
  User.belongsTo(User, {
    as: "delegate",
    foreignKey: "delegateId",
    constraints: false,
  });

  User.belongsTo(User, {
    as: "coordinator",
    foreignKey: "coordinatorId",
    constraints: false,
  });

  User.hasMany(User, {
    as: "delegateMembers",
    foreignKey: "delegateId",
    constraints: false,
  });

  User.hasMany(User, {
    as: "coordinatorDelegates",
    foreignKey: "coordinatorId",
    constraints: false,
  });

  // Additional associations will be added as models are created
  // Example:
  // User.hasMany(MemberSubscription, {
  //   as: 'subscriptions',
  //   foreignKey: 'userId',
  // });

  // MedicalScheme.hasMany(MemberSubscription, {
  //   as: 'subscriptions',
  //   foreignKey: 'schemeId',
  // });
};

// Setup associations
setupAssociations();

// Export models and sequelize instance
export {
  sequelize,
  User,
  MedicalScheme,
  // Export other models as they are created
};

// Export initialization function
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Sync models (use with caution in production)
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("Database models synchronized.");
    }
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }
};

export default {
  sequelize,
  User,
  MedicalScheme,
  initializeDatabase,
};
