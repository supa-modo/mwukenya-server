import sequelize from "../config/database";
import User from "./User";
import MedicalScheme from "./MedicalScheme";
import Document from "./Document";
import MemberSubscription from "./MemberSubscription";
import Dependant from "./Dependant";
import Payment from "./Payment";
import PaymentCoverage from "./PaymentCoverage";

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

  // Document associations
  User.hasMany(Document, {
    as: "documents",
    foreignKey: "userId",
    onDelete: "CASCADE",
  });

  Document.belongsTo(User, {
    as: "user",
    foreignKey: "userId",
  });

  Document.belongsTo(User, {
    as: "verifier",
    foreignKey: "verifiedBy",
    constraints: false,
  });

  // Dependant associations
  User.hasMany(Dependant, {
    as: "dependants",
    foreignKey: "userId",
    onDelete: "CASCADE",
  });

  Dependant.belongsTo(User, {
    as: "user",
    foreignKey: "userId",
  });

  Dependant.belongsTo(User, {
    as: "verifier",
    foreignKey: "verifiedBy",
    constraints: false,
  });

  // Document associations for dependants (polymorphic)
  Dependant.hasMany(Document, {
    as: "documents",
    foreignKey: "entityId",
    scope: {
      entityType: "dependant",
    },
    onDelete: "CASCADE",
  });

  // MemberSubscription associations
  User.hasMany(MemberSubscription, {
    as: "subscriptions",
    foreignKey: "userId",
    onDelete: "CASCADE",
  });

  MemberSubscription.belongsTo(User, {
    as: "user",
    foreignKey: "userId",
  });

  MedicalScheme.hasMany(MemberSubscription, {
    as: "memberSubscriptions",
    foreignKey: "schemeId",
  });

  MemberSubscription.belongsTo(MedicalScheme, {
    as: "scheme",
    foreignKey: "schemeId",
  });

  // Registration delegate and coordinator associations
  MemberSubscription.belongsTo(User, {
    as: "registrationDelegate",
    foreignKey: "registrationDelegateId",
    constraints: false,
  });

  MemberSubscription.belongsTo(User, {
    as: "registrationCoordinator",
    foreignKey: "registrationCoordinatorId",
    constraints: false,
  });

  // Payment associations
  Payment.belongsTo(User, {
    as: "user",
    foreignKey: "userId",
  });

  Payment.belongsTo(MemberSubscription, {
    as: "subscription",
    foreignKey: "subscriptionId",
  });

  Payment.belongsTo(User, {
    as: "delegate",
    foreignKey: "commissionDelegateId",
    constraints: false,
  });

  Payment.belongsTo(User, {
    as: "coordinator",
    foreignKey: "commissionCoordinatorId",
    constraints: false,
  });

  Payment.belongsTo(User, {
    as: "processor",
    foreignKey: "processorId",
    constraints: false,
  });

  User.hasMany(Payment, {
    as: "payments",
    foreignKey: "userId",
  });

  MemberSubscription.hasMany(Payment, {
    as: "payments",
    foreignKey: "subscriptionId",
  });

  // PaymentCoverage associations
  PaymentCoverage.belongsTo(User, {
    as: "user",
    foreignKey: "userId",
  });

  PaymentCoverage.belongsTo(MemberSubscription, {
    as: "subscription",
    foreignKey: "subscriptionId",
  });

  PaymentCoverage.belongsTo(Payment, {
    as: "payment",
    foreignKey: "paymentId",
    constraints: false,
  });

  User.hasMany(PaymentCoverage, {
    as: "paymentCoverage",
    foreignKey: "userId",
  });

  MemberSubscription.hasMany(PaymentCoverage, {
    as: "paymentCoverage",
    foreignKey: "subscriptionId",
  });

  Payment.hasMany(PaymentCoverage, {
    as: "paymentCoverage",
    foreignKey: "paymentId",
  });
};

// Setup associations
setupAssociations();

// Export models and sequelize instance
export {
  sequelize,
  User,
  MedicalScheme,
  Document,
  MemberSubscription,
  Dependant,
  Payment,
  PaymentCoverage,
};

// Export initialization function
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Check if tables exist by trying to query the users table
    try {
      await sequelize.query("SELECT 1 FROM users LIMIT 1");
      console.log("Database tables already exist, skipping sync.");
    } catch (error) {
      // If the query fails, it means tables don't exist, so create them
      console.log("Database tables don't exist, creating them...");
      if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
        await sequelize.sync({ alter: false });
        console.log("Database models synchronized.");
      } else {
        // In production, only sync if explicitly requested
        if (process.env.FORCE_SYNC === "true") {
          await sequelize.sync({ alter: true });
          console.log("Database models synchronized (production).");
        } else {
          throw new Error(
            "Database tables don't exist and FORCE_SYNC is not enabled"
          );
        }
      }
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
  Document,
  MemberSubscription,
  Dependant,
  Payment,
  PaymentCoverage,
  initializeDatabase,
};
