import { Transaction } from "sequelize";
import { User } from "../models";
import { UserRole, MembershipStatus, Gender } from "../models/types";
import sequelize from "../config/database";

export async function seedUsers(transaction?: Transaction) {
  const t = transaction || (await sequelize.transaction());

  try {
    // Check if users already exist
    const existingUsers = await User.count({ transaction: t });
    if (existingUsers > 0) {
      console.log("⚠️  Users already exist, skipping user seeding");
      return;
    }

    console.log("🌱 Seeding users...");
    const defaultPassword = "Password123!";

    // 1. Create Super Admin
    const superAdmin = await User.create(
      {
        firstName: "Super",
        lastName: "Admin",
        email: "eddie.oodhiambo@gmail.com",
        phoneNumber: "+254790193402",
        idNumber: "38353477",
        passwordHash: defaultPassword,
        gender: Gender.MALE,
        county: "Nairobi",
        membershipStatus: MembershipStatus.ACTIVE,
        role: UserRole.SUPERADMIN,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isIdNumberVerified: true,
        membershipDate: new Date(),
      },
      { transaction: t }
    );

    console.log(
      `✅ Created Super Admin: ${superAdmin.fullName} (${superAdmin.email})`
    );

    // 2. Create Admin
    const admin = await User.create(
      {
        firstName: "System",
        lastName: "Administrator",
        email: "system@mwukenya.co.ke",
        phoneNumber: "+254700000002",
        idNumber: "12345679",
        passwordHash: defaultPassword,
        gender: Gender.MALE,
        county: "Nairobi",
        membershipStatus: MembershipStatus.ACTIVE,
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isIdNumberVerified: true,
        membershipDate: new Date(),
      },
      { transaction: t }
    );

    console.log(`✅ Created Admin: ${admin.fullName} (${admin.email})`);

    // 3. Create Coordinators
    const coordinators = await User.bulkCreate(
      [
        {
          firstName: "John",
          lastName: "Coordinator",
          email: "eddieodhiambo11@gmail.com",
          phoneNumber: "+254700000003",
          idNumber: "11111111",
          passwordHash: defaultPassword,
          gender: Gender.MALE,
          county: "Mombasa",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.COORDINATOR,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          coordinatorCode: "COORD001",
          membershipDate: new Date(),
        },
        {
          firstName: "Jane",
          lastName: "Coordinator",
          email: "coordinator2@mwukenya.co.ke",
          phoneNumber: "+254700000004",
          idNumber: "12345681",
          passwordHash: defaultPassword,
          gender: Gender.FEMALE,
          county: "Kisumu",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.COORDINATOR,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          coordinatorCode: "COORD002",
          membershipDate: new Date(),
        },
      ],
      { transaction: t }
    );

    console.log(`✅ Created ${coordinators.length} Coordinators`);

    // 4. Create Delegates (assigned to coordinators)
    const delegates = await User.bulkCreate(
      [
        {
          firstName: "Peter",
          lastName: "Delegate",
          email: "delegate1@mwukenya.co.ke",
          phoneNumber: "+254700000005",
          idNumber: "12345682",
          passwordHash: defaultPassword,
          gender: Gender.MALE,
          county: "Mombasa",
          sacco: "Mombasa Sacco",
          route: "Route A",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.DELEGATE,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          coordinatorId: coordinators[0].id,
          delegateCode: "DEL001",
          membershipDate: new Date(),
        },
        {
          firstName: "Mary",
          lastName: "Delegate",
          email: "delegate2@mwukenya.co.ke",
          phoneNumber: "+254700000006",
          idNumber: "12345683",
          passwordHash: defaultPassword,
          gender: Gender.FEMALE,
          county: "Mombasa",
          sacco: "Mombasa Sacco",
          route: "Route B",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.DELEGATE,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          coordinatorId: coordinators[0].id,
          delegateCode: "DEL002",
          membershipDate: new Date(),
        },
        {
          firstName: "James",
          lastName: "Delegate",
          email: "delegate3@mwukenya.co.ke",
          phoneNumber: "+254700000007",
          idNumber: "12345684",
          passwordHash: defaultPassword,
          gender: Gender.MALE,
          county: "Kisumu",
          sacco: "Kisumu Sacco",
          route: "Route C",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.DELEGATE,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          coordinatorId: coordinators[1].id,
          delegateCode: "DEL003",
          membershipDate: new Date(),
        },
      ],
      { transaction: t }
    );

    console.log(`✅ Created ${delegates.length} Delegates`);

    // 5. Create Members (assigned to delegates)
    const members = await User.bulkCreate(
      [
        {
          firstName: "Alice",
          lastName: "Member",
          email: "member1@example.com",
          phoneNumber: "+254700000008",
          idNumber: "12345685",
          passwordHash: defaultPassword,
          gender: Gender.FEMALE,
          county: "Mombasa",
          sacco: "Mombasa Sacco",
          route: "Route A",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          delegateId: delegates[0].id,
          coordinatorId: coordinators[0].id,
          membershipNumber: "MEM001",
          membershipDate: new Date(),
        },
        {
          firstName: "Bob",
          lastName: "Member",
          email: "member2@example.com",
          phoneNumber: "+254700000009",
          idNumber: "12345686",
          passwordHash: defaultPassword,
          gender: Gender.MALE,
          county: "Mombasa",
          sacco: "Mombasa Sacco",
          route: "Route A",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          delegateId: delegates[0].id,
          coordinatorId: coordinators[0].id,
          membershipNumber: "MEM002",
          membershipDate: new Date(),
        },
        {
          firstName: "Carol",
          lastName: "Member",
          email: "member3@example.com",
          phoneNumber: "+254700000010",
          idNumber: "12345687",
          passwordHash: defaultPassword,
          gender: Gender.FEMALE,
          county: "Mombasa",
          sacco: "Mombasa Sacco",
          route: "Route B",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          delegateId: delegates[1].id,
          coordinatorId: coordinators[0].id,
          membershipNumber: "MEM003",
          membershipDate: new Date(),
        },
        {
          firstName: "David",
          lastName: "Member",
          email: "member4@example.com",
          phoneNumber: "+254700000011",
          idNumber: "12345688",
          passwordHash: defaultPassword,
          gender: Gender.MALE,
          county: "Kisumu",
          sacco: "Kisumu Sacco",
          route: "Route C",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          delegateId: delegates[2].id,
          coordinatorId: coordinators[1].id,
          membershipNumber: "MEM004",
          membershipDate: new Date(),
        },
        {
          firstName: "Eve",
          lastName: "Member",
          email: "member5@example.com",
          phoneNumber: "+254700000012",
          idNumber: "12345689",
          passwordHash: defaultPassword,
          gender: Gender.FEMALE,
          county: "Kisumu",
          sacco: "Kisumu Sacco",
          route: "Route C",
          membershipStatus: MembershipStatus.ACTIVE,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          delegateId: delegates[2].id,
          coordinatorId: coordinators[1].id,
          membershipNumber: "MEM005",
          membershipDate: new Date(),
        },
      ],
      { transaction: t }
    );

    console.log(`✅ Created ${members.length} Members`);

    // 6. Create some pending members
    const pendingMembers = await User.bulkCreate(
      [
        {
          firstName: "Frank",
          lastName: "Pending",
          email: "pending1@example.com",
          phoneNumber: "+254700000013",
          idNumber: "12345690",
          passwordHash: defaultPassword,
          gender: Gender.MALE,
          county: "Nairobi",
          sacco: "Nairobi Sacco",
          route: "Route D",
          membershipStatus: MembershipStatus.PENDING,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: false,
          isPhoneVerified: false,
          isIdNumberVerified: false,
          membershipNumber: "MEM006",
        },
        {
          firstName: "Grace",
          lastName: "Pending",
          email: "pending2@example.com",
          phoneNumber: "+254700000014",
          idNumber: "12345691",
          passwordHash: defaultPassword,
          gender: Gender.FEMALE,
          county: "Nakuru",
          sacco: "Nakuru Sacco",
          route: "Route E",
          membershipStatus: MembershipStatus.PENDING,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: false,
          isPhoneVerified: false,
          isIdNumberVerified: false,
          membershipNumber: "MEM007",
        },
      ],
      { transaction: t }
    );

    console.log(`✅ Created ${pendingMembers.length} Pending Members`);

    console.log("\n📊 User Seeding Summary:");
    console.log(`   • Super Admin: 1`);
    console.log(`   • Admin: 1`);
    console.log(`   • Coordinators: ${coordinators.length}`);
    console.log(`   • Delegates: ${delegates.length}`);
    console.log(`   • Active Members: ${members.length}`);
    console.log(`   • Pending Members: ${pendingMembers.length}`);
    console.log(
      `   • Total Users: ${
        1 +
        1 +
        coordinators.length +
        delegates.length +
        members.length +
        pendingMembers.length
      }`
    );
    console.log(`\n🔑 Default Password for all users: ${defaultPassword}`);

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
  seedUsers()
    .then(() => {
      console.log("✅ User seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ User seeding failed:", error);
      process.exit(1);
    });
}
