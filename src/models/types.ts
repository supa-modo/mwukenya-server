// TypeScript Type Definitions for MWU Kenya Digital Platform

// Enums matching database types
export enum UserRole {
  MEMBER = "member",
  DELEGATE = "delegate",
  COORDINATOR = "coordinator",
  ADMIN = "admin",
  SUPERADMIN = "superadmin",
}

export enum MembershipStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending",
}

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
}

export enum CoverageType {
  M = "M",
  M_PLUS_1 = "M+1",
  M_PLUS_2 = "M+2",
  M_PLUS_3 = "M+3",
  M_PLUS_4 = "M+4",
  M_PLUS_5 = "M+5",
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CANCELLED = "cancelled",
}

export enum CommissionStatus {
  PENDING = "pending",
  PROCESSED = "processed",
  FAILED = "failed",
}

export enum TransferStatus {
  PENDING = "pending",
  PROCESSED = "processed",
  FAILED = "failed",
}

export enum NotificationType {
  SMS = "sms",
  EMAIL = "email",
  PUSH = "push",
  USSD = "ussd",
}

export enum NotificationStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  DELIVERED = "delivered",
}

export enum UssdSessionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  EXPIRED = "expired",
}

// Interface definitions for model attributes
export interface UserAttributes {
  id: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  email?: string;
  phoneNumber: string;
  idNumber: string;
  passwordHash: string;
  gender?: Gender;
  county?: string;
  sacco?: string;
  route?: string;
  membershipStatus: MembershipStatus;
  membershipNumber?: string;
  membershipDate?: Date;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdNumberVerified: boolean;
  delegateId?: string;
  coordinatorId?: string;
  delegateCode?: string;
  coordinatorCode?: string;
  lastLogin?: Date;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Association properties
  delegate?: UserAttributes;
  coordinator?: UserAttributes;
  delegateMembers?: UserAttributes[];
  coordinatorDelegates?: UserAttributes[];
}

export interface UserCreationAttributes
  extends Omit<UserAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface MedicalSchemeAttributes {
  id: string;
  name: string;
  code: string;
  description?: string;
  coverageType: CoverageType;
  dailyPremium: number;
  shaPortion: number;
  delegateCommission: number;
  coordinatorCommission: number;
  benefits?: Record<string, any>;
  isActive: boolean;
  shaSchemeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalSchemeCreationAttributes
  extends Omit<MedicalSchemeAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface MemberSubscriptionAttributes {
  id: string;
  userId: string;
  schemeId: string;
  subscriptionDate: Date;
  status: SubscriptionStatus;
  effectiveDate: Date;
  registrationDelegateId?: string;
  registrationCoordinatorId?: string;
  shaMemberNumber?: string;
  dependents?: Record<string, any>[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberSubscriptionCreationAttributes
  extends Omit<MemberSubscriptionAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface PaymentAttributes {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  transactionReference: string;
  paymentStatus: PaymentStatus;
  daysCovered: number;
  coverageStartDate: Date;
  coverageEndDate: Date;
  delegateCommission: number;
  coordinatorCommission: number;
  shaPortion: number;
  commissionDelegateId?: string;
  commissionCoordinatorId?: string;
  processedAt?: Date;
  processorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCreationAttributes
  extends Omit<PaymentAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface PaymentCoverageAttributes {
  id: string;
  userId: string;
  subscriptionId: string;
  coverageDate: Date;
  paymentId?: string;
  isPaid: boolean;
  amount?: number;
  createdAt: Date;
}

export interface PaymentCoverageCreationAttributes
  extends Omit<PaymentCoverageAttributes, "id" | "createdAt"> {
  id?: string;
}

export interface CommissionPaymentAttributes {
  id: string;
  recipientId: string;
  recipientType: UserRole;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  paymentCount: number;
  paymentMethod?: string;
  transactionReference?: string;
  status: CommissionStatus;
  processedAt?: Date;
  processorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionPaymentCreationAttributes
  extends Omit<CommissionPaymentAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface CommissionPaymentDetailAttributes {
  id: string;
  commissionPaymentId: string;
  sourcePaymentId: string;
  amount: number;
  createdAt: Date;
}

export interface CommissionPaymentDetailCreationAttributes
  extends Omit<CommissionPaymentDetailAttributes, "id" | "createdAt"> {
  id?: string;
}

export interface ShaTransferAttributes {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  memberCount: number;
  paymentCount: number;
  transferReference?: string;
  status: TransferStatus;
  transferData?: Record<string, any>;
  processedAt?: Date;
  processorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShaTransferCreationAttributes
  extends Omit<ShaTransferAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface ShaTransferDetailAttributes {
  id: string;
  shaTransferId: string;
  sourcePaymentId: string;
  amount: number;
  createdAt: Date;
}

export interface ShaTransferDetailCreationAttributes
  extends Omit<ShaTransferDetailAttributes, "id" | "createdAt"> {
  id?: string;
}

export interface SystemConfigAttributes {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemConfigCreationAttributes
  extends Omit<SystemConfigAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface AuditLogAttributes {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  timestamp: Date;
}

export interface AuditLogCreationAttributes
  extends Omit<AuditLogAttributes, "id" | "timestamp"> {
  id?: string;
}

export interface ApiLogAttributes {
  id: string;
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs?: number;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  errorMessage?: string;
  timestamp: Date;
}

export interface ApiLogCreationAttributes
  extends Omit<ApiLogAttributes, "id" | "timestamp"> {
  id?: string;
}

export interface NotificationAttributes {
  id: string;
  userId: string;
  type: NotificationType;
  subject?: string;
  message: string;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failedReason?: string;
  externalReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCreationAttributes
  extends Omit<NotificationAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface UssdSessionAttributes {
  id: string;
  sessionId: string;
  phoneNumber: string;
  userId?: string;
  currentMenu?: string;
  sessionData: Record<string, any>;
  status: UssdSessionStatus;
  startedAt: Date;
  lastActivity: Date;
  endedAt?: Date;
}

export interface UssdSessionCreationAttributes
  extends Omit<UssdSessionAttributes, "id" | "startedAt" | "lastActivity"> {
  id?: string;
}

// Additional utility types
export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaymentSummary {
  totalAmount: number;
  paymentCount: number;
  delegateCommission: number;
  coordinatorCommission: number;
  shaPortion: number;
  mwuPortion: number;
}

export interface MemberPaymentStatus {
  userId: string;
  memberName: string;
  phoneNumber: string;
  totalDays: number;
  paidDays: number;
  unpaidDays: number;
  firstUnpaidDate?: Date;
  currentBalance: number;
  lastPaymentDate?: Date;
}

export interface DelegatePerformance {
  delegateId: string;
  delegateName: string;
  activeMembers: number;
  totalPayments: number;
  totalCommission: number;
  averagePaymentCompliance: number;
}

export interface CoordinatorPerformance {
  coordinatorId: string;
  coordinatorName: string;
  activeDelegates: number;
  activeMembers: number;
  totalPayments: number;
  totalCommission: number;
  averagePaymentCompliance: number;
}

// Financial report types
export interface FinancialSummary {
  period: {
    start: Date;
    end: Date;
  };
  totalRevenue: number;
  shaTransfers: number;
  delegateCommissions: number;
  coordinatorCommissions: number;
  mwuRevenue: number;
  activeMembers: number;
  totalPayments: number;
  paymentCompliance: number;
}

// SHA integration types
export interface ShaApiMemberData {
  memberNumber: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phoneNumber: string;
  scheme: string;
  coverageType: CoverageType;
  effectiveDate: Date;
  dependents?: ShaApiDependentData[];
}

export interface ShaApiDependentData {
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth: Date;
  idNumber?: string;
}

export interface ShaApiPaymentData {
  memberNumber: string;
  amount: number;
  paymentDate: Date;
  coveragePeriod: {
    start: Date;
    end: Date;
  };
  transactionReference: string;
}

// USSD menu structure
export interface UssdMenuOptions {
  [key: string]: {
    text: string;
    action?: string;
    nextMenu?: string;
    requiresAuth?: boolean;
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}

// Authentication types
export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  sessionId: string;
  iat: number;
}

export interface LoginCredentials {
  phoneNumber?: string;
  identifier?: string; // Can be phone number or ID number
  password: string;
}

export interface RegistrationData
  extends Omit<UserCreationAttributes, "passwordHash"> {
  password: string;
  confirmPassword: string;
}
