import { Transaction } from "sequelize";
import { MedicalScheme } from "../models";
import { CoverageType } from "../models/types";
import sequelize from "../config/database";

export async function seedMedicalSchemes(transaction?: Transaction) {
  const t = transaction || (await sequelize.transaction());

  try {
    // Check if medical schemes already exist
    const existingSchemes = await MedicalScheme.count({ transaction: t });
    if (existingSchemes > 0) {
      console.log(
        "⚠️  Medical schemes already exist, skipping medical scheme seeding"
      );
      return;
    }

    console.log("🌱 Seeding medical schemes...");

    const medicalSchemes = await MedicalScheme.bulkCreate(
      [
        {
          name: "Basic Medical Cover",
          code: "BASIC",
          description: "Basic medical coverage for individuals",
          coverageType: CoverageType.M,
          dailyPremium: 50.0,
          shaPortion: 45.0,
          delegateCommission: 2.0,
          coordinatorCommission: 1.0,
          benefits: {
            inpatient: true,
            outpatient: false,
            dental: false,
            optical: false,
            maternity: false,
            maxCoverage: 50000,
          },
          isActive: true,
          shaSchemeId: "SHA_BASIC_001",
        },
        {
          name: "Family Medical Cover",
          code: "FAMILY",
          description: "Medical coverage for family (Member + 1)",
          coverageType: CoverageType.M_PLUS_1,
          dailyPremium: 80.0,
          shaPortion: 72.0,
          delegateCommission: 2.0,
          coordinatorCommission: 1.0,
          benefits: {
            inpatient: true,
            outpatient: true,
            dental: false,
            optical: false,
            maternity: true,
            maxCoverage: 100000,
          },
          isActive: true,
          shaSchemeId: "SHA_FAMILY_001",
        },
        {
          name: "Extended Family Cover",
          code: "EXTENDED",
          description: "Medical coverage for extended family (Member + 2)",
          coverageType: CoverageType.M_PLUS_2,
          dailyPremium: 100.0,
          shaPortion: 90.0,
          delegateCommission: 2.0,
          coordinatorCommission: 1.0,
          benefits: {
            inpatient: true,
            outpatient: true,
            dental: true,
            optical: false,
            maternity: true,
            maxCoverage: 150000,
          },
          isActive: true,
          shaSchemeId: "SHA_EXTENDED_001",
        },
        {
          name: "Premium Family Cover",
          code: "PREMIUM",
          description: "Premium medical coverage for large family (Member + 3)",
          coverageType: CoverageType.M_PLUS_3,
          dailyPremium: 120.0,
          shaPortion: 108.0,
          delegateCommission: 2.0,
          coordinatorCommission: 1.0,
          benefits: {
            inpatient: true,
            outpatient: true,
            dental: true,
            optical: true,
            maternity: true,
            maxCoverage: 200000,
          },
          isActive: true,
          shaSchemeId: "SHA_PREMIUM_001",
        },
        {
          name: "Comprehensive Family Cover",
          code: "COMPREHENSIVE",
          description:
            "Comprehensive medical coverage for large family (Member + 4)",
          coverageType: CoverageType.M_PLUS_4,
          dailyPremium: 140.0,
          shaPortion: 126.0,
          delegateCommission: 2.0,
          coordinatorCommission: 1.0,
          benefits: {
            inpatient: true,
            outpatient: true,
            dental: true,
            optical: true,
            maternity: true,
            maxCoverage: 250000,
          },
          isActive: true,
          shaSchemeId: "SHA_COMPREHENSIVE_001",
        },
        {
          name: "Ultimate Family Cover",
          code: "ULTIMATE",
          description:
            "Ultimate medical coverage for large family (Member + 5)",
          coverageType: CoverageType.M_PLUS_5,
          dailyPremium: 160.0,
          shaPortion: 144.0,
          delegateCommission: 2.0,
          coordinatorCommission: 1.0,
          benefits: {
            inpatient: true,
            outpatient: true,
            dental: true,
            optical: true,
            maternity: true,
            maxCoverage: 300000,
          },
          isActive: true,
          shaSchemeId: "SHA_ULTIMATE_001",
        },
      ],
      { transaction: t }
    );

    console.log(`✅ Created ${medicalSchemes.length} Medical Schemes`);

    console.log("\n📊 Medical Scheme Seeding Summary:");
    medicalSchemes.forEach((scheme) => {
      console.log(
        `   • ${scheme.name} (${scheme.code}) - ${scheme.coverageType} - KES ${scheme.dailyPremium}/day`
      );
    });

    if (!transaction) {
      await t.commit();
    }
  } catch (error) {
    if (!transaction) {
      await t.rollback();
    }
    throw error;
  }
}

// Run seeder if this file is executed directly
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
