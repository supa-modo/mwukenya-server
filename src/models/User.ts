import { DataTypes, Model, Optional, Op } from "sequelize";
import sequelize from "../config/database";
import {
  UserAttributes,
  UserCreationAttributes,
  UserRole,
  MembershipStatus,
  Gender,
} from "../types";
import bcrypt from "bcrypt";
import { config } from "../config";

// User model class
class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public firstName!: string;
  public lastName!: string;
  public otherNames?: string;
  public email?: string;
  public phoneNumber!: string;
  public idNumber!: string;
  public passwordHash!: string;
  public gender?: Gender;
  public county?: string;
  public sacco?: string;
  public route?: string;
  public membershipStatus!: MembershipStatus;
  public membershipNumber?: string;
  public membershipDate?: Date;
  public role!: UserRole;
  public isActive!: boolean;
  public isEmailVerified!: boolean;
  public isPhoneVerified!: boolean;
  public isIdNumberVerified!: boolean;
  public delegateId?: string;
  public coordinatorId?: string;
  public delegateCode?: string;
  public coordinatorCode?: string;
  public lastLogin?: Date;
  public refreshToken?: string;
  public passwordResetToken?: string;
  public passwordResetExpires?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Virtual fields
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public get fullNameWithOthers(): string {
    return `${this.firstName} ${this.otherNames ? this.otherNames + " " : ""}${
      this.lastName
    }`;
  }

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  public async updatePassword(newPassword: string): Promise<void> {
    this.passwordHash = await User.hashPassword(newPassword);
    await this.save();
  }

  public toJSON(): Partial<UserAttributes> {
    const values = { ...this.get() } as any;
    delete values.passwordHash;
    delete values.refreshToken;
    delete values.passwordResetToken;
    return values;
  }

  public isMember(): boolean {
    return this.role === UserRole.MEMBER;
  }

  public isDelegate(): boolean {
    return this.role === UserRole.DELEGATE;
  }

  public isCoordinator(): boolean {
    return this.role === UserRole.COORDINATOR;
  }

  public isAdmin(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.SUPERADMIN;
  }

  public canManageUsers(): boolean {
    return [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.COORDINATOR].includes(
      this.role
    );
  }

  public canRegisterDelegates(): boolean {
    return [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPERADMIN].includes(
      this.role
    );
  }

  public canRegisterMembers(): boolean {
    return [
      UserRole.DELEGATE,
      UserRole.COORDINATOR,
      UserRole.ADMIN,
      UserRole.SUPERADMIN,
    ].includes(this.role);
  }

  // Static methods
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  public static async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.findOne({ where: { phoneNumber } });
  }

  public static async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  public static async findByIdNumber(idNumber: string): Promise<User | null> {
    return this.findOne({ where: { idNumber } });
  }

  public static async findByMembershipNumber(
    membershipNumber: string
  ): Promise<User | null> {
    return this.findOne({ where: { membershipNumber } });
  }

  public static async findByDelegateCode(
    delegateCode: string
  ): Promise<User | null> {
    return this.findOne({ where: { delegateCode, role: UserRole.DELEGATE } });
  }

  public static async findByCoordinatorCode(
    coordinatorCode: string
  ): Promise<User | null> {
    return this.findOne({
      where: { coordinatorCode, role: UserRole.COORDINATOR },
    });
  }

  public static async generateUniqueMembershipNumber(
    maxRetries: number = 5
  ): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const membershipNumber = this.generateMembershipNumber();

      // Check if it already exists
      const existingUser = await this.findByMembershipNumber(membershipNumber);
      if (!existingUser) {
        if (i > 0) {
          console.log(
            `✅ Generated unique membership number after ${
              i + 1
            } attempts: ${membershipNumber}`
          );
        }
        return membershipNumber;
      }

      if (i === 0) {
        console.log(
          `⚠️  Collision detected for membership number: ${membershipNumber}, retrying...`
        );
      }
    }

    console.log(
      `🚨 Max retries (${maxRetries}) reached, using fallback generation method`
    );
    // If we hit max retries, use timestamp-based fallback
    return this.generateFallbackMembershipNumber();
  }

  public static generateMembershipNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year

    // Generate random letters (2 uppercase letters)
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed I and O to avoid confusion
    const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
    const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));

    // Generate random numbers (4 digits)
    const randomNum = Math.floor(1000 + Math.random() * 9000).toString();

    // Combine: MWU-{year}{2 random letters}{random 4 numbers}
    return `MWU-${year}${letter1}${letter2}${randomNum}`;
  }

  private static generateFallbackMembershipNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return `MWU-${year}${timestamp}${random}`;
  }

  public static generateDelegateCode(): string {
    const prefix = "DEL";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return `${prefix}${timestamp}${random}`;
  }

  public static generateCoordinatorCode(): string {
    const prefix = "CRD";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return `${prefix}${timestamp}${random}`;
  }

  public static formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return "";
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, "");
    // Ensure it starts with +254 and has 12 digits (including +254)
    if (digits.startsWith("254")) {
      return `+${digits}`;
    }
    // If it starts with 07, add +254
    if (digits.startsWith("07")) {
      return `+254${digits.slice(1)}`;
    }
    // If it starts with 7, add +254
    if (digits.startsWith("7")) {
      return `+254${digits}`;
    }
    // If it starts with 0, add +254
    if (digits.startsWith("0")) {
      return `+254${digits.slice(1)}`;
    }
    // If it starts with +, ensure it's +254
    if (digits.startsWith("+")) {
      return `+254${digits.slice(1)}`;
    }
    return `+254${digits}`;
  }
}

// Initialize the model
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    otherNames: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^\+254\d{9}$/, // Updated to accept +254XXXXXXXXX format
      },
    },
    idNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [6, 20],
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash",
    },
    gender: {
      type: DataTypes.ENUM(...Object.values(Gender)),
      allowNull: true,
    },
    county: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    sacco: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    route: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    membershipStatus: {
      type: DataTypes.ENUM(...Object.values(MembershipStatus)),
      allowNull: false,
      defaultValue: MembershipStatus.PENDING,
      field: "membership_status",
    },
    membershipNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      field: "membership_number",
    },
    membershipDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "membership_date",
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_email_verified",
    },
    isPhoneVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_phone_verified",
    },
    isIdNumberVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_id_number_verified",
    },
    delegateId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "delegate_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    coordinatorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "coordinator_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    delegateCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "delegate_code",
    },
    coordinatorCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "coordinator_code",
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login",
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "refresh_token",
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "password_reset_token",
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "password_reset_expires",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "users",
    indexes: [
      {
        unique: true,
        fields: ["phoneNumber"],
      },
      {
        unique: true,
        fields: ["email"],
        where: {
          email: {
            [Op.ne]: null,
          },
        },
      },
      {
        unique: true,
        fields: ["idNumber"],
      },
      {
        unique: true,
        fields: ["membership_number"],
        where: {
          membership_number: {
            [Op.ne]: null,
          },
        },
      },
      {
        fields: ["role"],
      },
      {
        fields: ["membership_status"],
      },
      {
        fields: ["delegate_id"],
      },
      {
        fields: ["coordinator_id"],
      },
      {
        unique: true,
        fields: ["delegate_code"],
        where: {
          delegate_code: {
            [Op.ne]: null,
          },
        },
      },
      {
        unique: true,
        fields: ["coordinator_code"],
        where: {
          coordinator_code: {
            [Op.ne]: null,
          },
        },
      },
    ],
    hooks: {
      beforeCreate: async (user: User) => {
        // Hash password if provided
        if (user.passwordHash) {
          user.passwordHash = await User.hashPassword(user.passwordHash);
        }

        // Format phone number to +254XXXXXXXXX format
        if (user.phoneNumber) {
          user.phoneNumber = User.formatPhoneNumber(user.phoneNumber);
        }

        // Generate membership number for members
        if (user.role === UserRole.MEMBER && !user.membershipNumber) {
          user.membershipNumber = await User.generateUniqueMembershipNumber();
          user.membershipDate = new Date();
        }

        // Generate delegate code for delegates
        if (user.role === UserRole.DELEGATE && !user.delegateCode) {
          user.delegateCode = User.generateDelegateCode();
        }

        // Generate coordinator code for coordinators
        if (user.role === UserRole.COORDINATOR && !user.coordinatorCode) {
          user.coordinatorCode = User.generateCoordinatorCode();
        }
      },
      beforeUpdate: async (user: User) => {
        // Hash password if provided and changed
        if (user.changed("passwordHash") && user.passwordHash) {
          user.passwordHash = await User.hashPassword(user.passwordHash);
        }

        // Format phone number if changed
        if (user.changed("phoneNumber") && user.phoneNumber) {
          user.phoneNumber = User.formatPhoneNumber(user.phoneNumber);
        }

        if (user.changed("role")) {
          // Update membership date when status changes to active
          if (
            user.membershipStatus === MembershipStatus.ACTIVE &&
            !user.membershipDate
          ) {
            user.membershipDate = new Date();
          }
        }
      },
    },
  }
);

export default User;
