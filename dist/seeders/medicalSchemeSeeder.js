"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMedicalSchemes = seedMedicalSchemes;
const models_1 = require("../models");
const types_1 = require("../models/types");
const database_1 = __importDefault(require("../config/database"));
async function seedMedicalSchemes(transaction) {
    const t = transaction || (await database_1.default.transaction());
    try {
        const existingSchemes = await models_1.MedicalScheme.count({ transaction: t });
        if (existingSchemes > 0) {
            console.log("⚠️  Medical schemes already exist, skipping medical scheme seeding");
            return;
        }
        console.log("🌱 Seeding medical schemes...");
        const medicalSchemes = await models_1.MedicalScheme.bulkCreate([
            {
                name: "Basic Medical Cover",
                code: "BASIC",
                description: "Basic medical coverage for individuals",
                coverageType: types_1.CoverageType.M,
                dailyPremium: 50.0,
                shaPortion: 45.0,
                delegateCommission: 2.0,
                coordinatorCommission: 1.0,
                benefits: ["Inpatient coverage", "Basic medical services"],
                limitations: [
                    "No outpatient coverage",
                    "No dental coverage",
                    "No optical coverage",
                    "No maternity coverage",
                ],
                isActive: true,
                shaSchemeId: "SHA_BASIC_001",
            },
            {
                name: "Family Medical Cover",
                code: "FAMILY",
                description: "Medical coverage for family (Member + 1)",
                coverageType: types_1.CoverageType.M_PLUS_1,
                dailyPremium: 80.0,
                shaPortion: 72.0,
                delegateCommission: 2.0,
                coordinatorCommission: 1.0,
                benefits: [
                    "Inpatient coverage",
                    "Outpatient coverage",
                    "Maternity coverage",
                    "Family medical services",
                ],
                limitations: ["No dental coverage", "No optical coverage"],
                isActive: true,
                shaSchemeId: "SHA_FAMILY_001",
            },
            {
                name: "Extended Family Cover",
                code: "EXTENDED",
                description: "Medical coverage for extended family (Member + 2)",
                coverageType: types_1.CoverageType.M_PLUS_2,
                dailyPremium: 100.0,
                shaPortion: 90.0,
                delegateCommission: 2.0,
                coordinatorCommission: 1.0,
                benefits: [
                    "Inpatient coverage",
                    "Outpatient coverage",
                    "Dental coverage",
                    "Maternity coverage",
                    "Extended family services",
                ],
                limitations: ["No optical coverage"],
                isActive: true,
                shaSchemeId: "SHA_EXTENDED_001",
            },
            {
                name: "Premium Family Cover",
                code: "PREMIUM",
                description: "Premium medical coverage for large family (Member + 3)",
                coverageType: types_1.CoverageType.M_PLUS_3,
                dailyPremium: 120.0,
                shaPortion: 108.0,
                delegateCommission: 2.0,
                coordinatorCommission: 1.0,
                benefits: [
                    "Inpatient coverage",
                    "Outpatient coverage",
                    "Dental coverage",
                    "Optical coverage",
                    "Maternity coverage",
                    "Premium family services",
                ],
                limitations: [],
                isActive: true,
                shaSchemeId: "SHA_PREMIUM_001",
            },
            {
                name: "Comprehensive Family Cover",
                code: "COMPREHENSIVE",
                description: "Comprehensive medical coverage for large family (Member + 4)",
                coverageType: types_1.CoverageType.M_PLUS_4,
                dailyPremium: 140.0,
                shaPortion: 126.0,
                delegateCommission: 2.0,
                coordinatorCommission: 1.0,
                benefits: [
                    "Inpatient coverage",
                    "Outpatient coverage",
                    "Dental coverage",
                    "Optical coverage",
                    "Maternity coverage",
                    "Comprehensive family services",
                    "High coverage limits",
                ],
                limitations: [],
                isActive: true,
                shaSchemeId: "SHA_COMPREHENSIVE_001",
            },
            {
                name: "Ultimate Family Cover",
                code: "ULTIMATE",
                description: "Ultimate medical coverage for large family (Member + 5)",
                coverageType: types_1.CoverageType.M_PLUS_5,
                dailyPremium: 160.0,
                shaPortion: 144.0,
                delegateCommission: 2.0,
                coordinatorCommission: 1.0,
                benefits: [
                    "Inpatient coverage",
                    "Outpatient coverage",
                    "Dental coverage",
                    "Optical coverage",
                    "Maternity coverage",
                    "Ultimate family services",
                    "Maximum coverage limits",
                ],
                limitations: [],
                isActive: true,
                shaSchemeId: "SHA_ULTIMATE_001",
            },
        ], { transaction: t });
        console.log(`✅ Created ${medicalSchemes.length} Medical Schemes`);
        console.log("\n📊 Medical Scheme Seeding Summary:");
        medicalSchemes.forEach((scheme) => {
            console.log(`   • ${scheme.name} (${scheme.code}) - ${scheme.coverageType} - KES ${scheme.dailyPremium}/day`);
        });
        if (!transaction) {
            await t.commit();
        }
    }
    catch (error) {
        if (!transaction) {
            await t.rollback();
        }
        throw error;
    }
}
if (require.main === module) {
    seedMedicalSchemes()
        .then(() => {
        console.log("✅ Medical scheme seeding completed successfully");
        process.exit(0);
    })
        .catch((error) => {
        console.error("❌ Medical scheme seeding failed:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=medicalSchemeSeeder.js.map