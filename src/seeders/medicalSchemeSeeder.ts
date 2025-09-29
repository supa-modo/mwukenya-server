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
          benefits: [
            "Inpatient hospitalization coverage up to KES 50,000 per admission",
            "Emergency medical services and ambulance",
            "Basic diagnostic tests (blood tests, X-rays, ultrasounds)",
            "General practitioner consultations",
            "Prescription medications for covered conditions",
            "Surgical procedures for common conditions",
            "24/7 medical helpline support",
            "Access to network hospitals nationwide",
            "Pre-authorization for planned procedures",
            "Medical reports and documentation",
          ],
          limitations: [
            "No outpatient coverage",
            "No dental coverage",
            "No optical coverage",
            "No maternity coverage",
            "No chronic disease management",
            "No physiotherapy services",
            "No alternative medicine coverage",
          ],
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
          benefits: [
            "Inpatient hospitalization coverage up to KES 100,000 per admission",
            "Outpatient consultations and treatments",
            "Emergency medical services and ambulance",
            "Maternity coverage including antenatal and postnatal care",
            "Child immunization and wellness visits",
            "Family planning services",
            "Diagnostic tests and laboratory services",
            "Prescription medications for covered conditions",
            "Surgical procedures including minor surgeries",
            "Specialist consultations (cardiology, pediatrics, gynecology)",
            "24/7 medical helpline support",
            "Access to network hospitals and clinics nationwide",
            "Pre-authorization for planned procedures",
            "Medical reports and documentation",
            "Wellness and preventive care programs",
          ],
          limitations: [
            "No dental coverage",
            "No optical coverage",
            "No chronic disease management",
            "No physiotherapy services",
            "No alternative medicine coverage",
          ],
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
          benefits: [
            "Inpatient hospitalization coverage up to KES 150,000 per admission",
            "Outpatient consultations and treatments",
            "Emergency medical services and ambulance",
            "Dental coverage including routine checkups, fillings, and extractions",
            "Maternity coverage including antenatal, delivery, and postnatal care",
            "Child immunization and wellness visits",
            "Family planning services",
            "Diagnostic tests and laboratory services",
            "Prescription medications for covered conditions",
            "Surgical procedures including major surgeries",
            "Specialist consultations (all specialties)",
            "Physiotherapy and rehabilitation services",
            "Chronic disease management programs",
            "Mental health services and counseling",
            "24/7 medical helpline support",
            "Access to network hospitals and clinics nationwide",
            "Pre-authorization for planned procedures",
            "Medical reports and documentation",
            "Wellness and preventive care programs",
            "Health education and awareness programs",
          ],
          limitations: [
            "No optical coverage",
            "No alternative medicine coverage",
            "Limited cosmetic procedures",
          ],
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
          benefits: [
            "Inpatient hospitalization coverage up to KES 200,000 per admission",
            "Outpatient consultations and treatments",
            "Emergency medical services and ambulance",
            "Dental coverage including routine checkups, fillings, extractions, and root canals",
            "Optical coverage including eye exams, prescription glasses, and contact lenses",
            "Maternity coverage including antenatal, delivery, and postnatal care",
            "Child immunization and wellness visits",
            "Family planning services",
            "Diagnostic tests and laboratory services",
            "Prescription medications for covered conditions",
            "Surgical procedures including major surgeries",
            "Specialist consultations (all specialties)",
            "Physiotherapy and rehabilitation services",
            "Chronic disease management programs",
            "Mental health services and counseling",
            "Alternative medicine coverage (acupuncture, chiropractic)",
            "Cosmetic procedures (limited)",
            "24/7 medical helpline support",
            "Access to network hospitals and clinics nationwide",
            "Pre-authorization for planned procedures",
            "Medical reports and documentation",
            "Wellness and preventive care programs",
            "Health education and awareness programs",
            "Annual health checkups and screenings",
            "Vaccination programs",
            "Travel health services",
          ],
          limitations: [
            "No experimental treatments",
            "Limited cosmetic procedures",
            "No fertility treatments",
          ],
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
          benefits: [
            "Inpatient hospitalization coverage up to KES 300,000 per admission",
            "Outpatient consultations and treatments",
            "Emergency medical services and ambulance",
            "Dental coverage including routine checkups, fillings, extractions, root canals, and crowns",
            "Optical coverage including eye exams, prescription glasses, contact lenses, and LASIK surgery",
            "Maternity coverage including antenatal, delivery, and postnatal care",
            "Child immunization and wellness visits",
            "Family planning services",
            "Diagnostic tests and laboratory services",
            "Prescription medications for covered conditions",
            "Surgical procedures including major surgeries",
            "Specialist consultations (all specialties)",
            "Physiotherapy and rehabilitation services",
            "Chronic disease management programs",
            "Mental health services and counseling",
            "Alternative medicine coverage (acupuncture, chiropractic, homeopathy)",
            "Cosmetic procedures (extended coverage)",
            "Fertility treatments and IVF",
            "Cancer treatment and chemotherapy",
            "Organ transplant coverage",
            "24/7 medical helpline support",
            "Access to network hospitals and clinics nationwide",
            "Pre-authorization for planned procedures",
            "Medical reports and documentation",
            "Wellness and preventive care programs",
            "Health education and awareness programs",
            "Annual health checkups and screenings",
            "Vaccination programs",
            "Travel health services",
            "International medical coverage",
            "Second medical opinion services",
            "Concierge medical services",
          ],
          limitations: [
            "No experimental treatments",
            "Limited cosmetic procedures",
            "No elective procedures without medical necessity",
          ],
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
          benefits: [
            "Inpatient hospitalization coverage up to KES 500,000 per admission",
            "Outpatient consultations and treatments",
            "Emergency medical services and ambulance",
            "Dental coverage including routine checkups, fillings, extractions, root canals, crowns, and implants",
            "Optical coverage including eye exams, prescription glasses, contact lenses, LASIK surgery, and cataract surgery",
            "Maternity coverage including antenatal, delivery, and postnatal care",
            "Child immunization and wellness visits",
            "Family planning services",
            "Diagnostic tests and laboratory services",
            "Prescription medications for covered conditions",
            "Surgical procedures including major surgeries",
            "Specialist consultations (all specialties)",
            "Physiotherapy and rehabilitation services",
            "Chronic disease management programs",
            "Mental health services and counseling",
            "Alternative medicine coverage (acupuncture, chiropractic, homeopathy, naturopathy)",
            "Cosmetic procedures (comprehensive coverage)",
            "Fertility treatments and IVF",
            "Cancer treatment and chemotherapy",
            "Organ transplant coverage",
            "Experimental treatments and clinical trials",
            "24/7 medical helpline support",
            "Access to network hospitals and clinics nationwide",
            "Pre-authorization for planned procedures",
            "Medical reports and documentation",
            "Wellness and preventive care programs",
            "Health education and awareness programs",
            "Annual health checkups and screenings",
            "Vaccination programs",
            "Travel health services",
            "International medical coverage",
            "Second medical opinion services",
            "Concierge medical services",
            "VIP hospital accommodations",
            "Personal medical assistant",
            "Health coaching and lifestyle management",
            "Nutritional counseling",
            "Stress management programs",
            "Executive health programs",
            "Priority access to specialists",
            "Home healthcare services",
            "Medical equipment rental",
            "Telemedicine services",
            "Health monitoring devices",
            "Personalized health plans",
          ],
          limitations: [
            "No experimental treatments without approval",
            "No elective procedures without medical necessity",
            "No coverage for pre-existing conditions not declared",
          ],
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
