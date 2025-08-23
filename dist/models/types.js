"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UssdSessionStatus = exports.DependantRelationship = exports.DependantStatus = exports.DocumentStatus = exports.DocumentType = exports.NotificationStatus = exports.NotificationType = exports.TransferStatus = exports.CommissionStatus = exports.SubscriptionStatus = exports.PaymentStatus = exports.CoverageType = exports.Gender = exports.MembershipStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["MEMBER"] = "member";
    UserRole["DELEGATE"] = "delegate";
    UserRole["COORDINATOR"] = "coordinator";
    UserRole["ADMIN"] = "admin";
    UserRole["SUPERADMIN"] = "superadmin";
})(UserRole || (exports.UserRole = UserRole = {}));
var MembershipStatus;
(function (MembershipStatus) {
    MembershipStatus["ACTIVE"] = "active";
    MembershipStatus["INACTIVE"] = "inactive";
    MembershipStatus["SUSPENDED"] = "suspended";
    MembershipStatus["PENDING"] = "pending";
})(MembershipStatus || (exports.MembershipStatus = MembershipStatus = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "Male";
    Gender["FEMALE"] = "Female";
})(Gender || (exports.Gender = Gender = {}));
var CoverageType;
(function (CoverageType) {
    CoverageType["M"] = "M";
    CoverageType["M_PLUS_1"] = "M+1";
    CoverageType["M_PLUS_2"] = "M+2";
    CoverageType["M_PLUS_3"] = "M+3";
    CoverageType["M_PLUS_4"] = "M+4";
    CoverageType["M_PLUS_5"] = "M+5";
})(CoverageType || (exports.CoverageType = CoverageType = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["SUSPENDED"] = "suspended";
    SubscriptionStatus["CANCELLED"] = "cancelled";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var CommissionStatus;
(function (CommissionStatus) {
    CommissionStatus["PENDING"] = "pending";
    CommissionStatus["PROCESSED"] = "processed";
    CommissionStatus["FAILED"] = "failed";
})(CommissionStatus || (exports.CommissionStatus = CommissionStatus = {}));
var TransferStatus;
(function (TransferStatus) {
    TransferStatus["PENDING"] = "pending";
    TransferStatus["PROCESSED"] = "processed";
    TransferStatus["FAILED"] = "failed";
})(TransferStatus || (exports.TransferStatus = TransferStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["SMS"] = "sms";
    NotificationType["EMAIL"] = "email";
    NotificationType["PUSH"] = "push";
    NotificationType["USSD"] = "ussd";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "pending";
    NotificationStatus["SENT"] = "sent";
    NotificationStatus["FAILED"] = "failed";
    NotificationStatus["DELIVERED"] = "delivered";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["IDENTITY"] = "identity";
    DocumentType["MEDICAL"] = "medical";
    DocumentType["INSURANCE"] = "insurance";
    DocumentType["RECEIPT"] = "receipt";
    DocumentType["OTHER"] = "other";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING"] = "pending";
    DocumentStatus["VERIFIED"] = "verified";
    DocumentStatus["REJECTED"] = "rejected";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
var DependantStatus;
(function (DependantStatus) {
    DependantStatus["ACTIVE"] = "active";
    DependantStatus["INACTIVE"] = "inactive";
    DependantStatus["SUSPENDED"] = "suspended";
})(DependantStatus || (exports.DependantStatus = DependantStatus = {}));
var DependantRelationship;
(function (DependantRelationship) {
    DependantRelationship["SPOUSE"] = "spouse";
    DependantRelationship["CHILD"] = "child";
    DependantRelationship["PARENT"] = "parent";
    DependantRelationship["SIBLING"] = "sibling";
    DependantRelationship["OTHER"] = "other";
})(DependantRelationship || (exports.DependantRelationship = DependantRelationship = {}));
var UssdSessionStatus;
(function (UssdSessionStatus) {
    UssdSessionStatus["ACTIVE"] = "active";
    UssdSessionStatus["COMPLETED"] = "completed";
    UssdSessionStatus["EXPIRED"] = "expired";
})(UssdSessionStatus || (exports.UssdSessionStatus = UssdSessionStatus = {}));
//# sourceMappingURL=types.js.map