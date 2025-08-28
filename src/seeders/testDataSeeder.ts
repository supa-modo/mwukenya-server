import { Transaction } from "sequelize";
import { User } from "../models";
import { UserRole, MembershipStatus, Gender } from "../models/types";
import sequelize from "../config/database";
import bcrypt from "bcrypt";

export async function seedTestData(transaction?: Transaction) {
  const t = transaction || (await sequelize.transaction());

  try {
    console.log("🧪 Seeding test data with multiple members...");

    // Hash the password
    const hashedPassword = await bcrypt.hash("Password123!", 10);
    const defaultPassword = "Password123!";

    // 1. Create one test coordinator
    const testCoordinator = await User.create(
      {
        firstName: "Test",
        lastName: "Coordinator",
        email: "test.coordinator@mwukenya.co.ke",
        phoneNumber: "+254700000100",
        idNumber: "TEST001",
        passwordHash: hashedPassword,
        gender: Gender.MALE,
        county: "Nairobi",
        membershipStatus: MembershipStatus.ACTIVE,
        role: UserRole.COORDINATOR,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isIdNumberVerified: true,
        coordinatorCode: "TESTCOORD001",
        membershipDate: new Date(),
      },
      { transaction: t }
    );

    console.log(
      `✅ Created Test Coordinator: ${testCoordinator.fullName} (${testCoordinator.email})`
    );

    // 2. Create one test delegate under the coordinator
    const testDelegate = await User.create(
      {
        firstName: "Test",
        lastName: "Delegate",
        email: "test.delegate@mwukenya.co.ke",
        phoneNumber: "+254700000101",
        idNumber: "TEST002",
        passwordHash: hashedPassword,
        gender: Gender.FEMALE,
        county: "Nairobi",
        sacco: "Test Sacco",
        route: "Test Route",
        membershipStatus: MembershipStatus.ACTIVE,
        role: UserRole.DELEGATE,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isIdNumberVerified: true,
        coordinatorId: testCoordinator.id,
        delegateCode: "TESTDEL001",
        membershipDate: new Date(),
      },
      { transaction: t }
    );

    console.log(
      `✅ Created Test Delegate: ${testDelegate.fullName} (${testDelegate.email})`
    );

    // 3. Create 25 test members under the delegate
    const memberData = [];
    const counties = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"];
    const saccos = ["Test Sacco A", "Test Sacco B", "Test Sacco C"];
    const routes = ["Route 1", "Route 2", "Route 3", "Route 4", "Route 5"];
    const firstNames = [
      "Alice",
      "Bob",
      "Carol",
      "David",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
      "Ivy",
      "Jack",
      "Kate",
      "Liam",
      "Mia",
      "Noah",
      "Olivia",
      "Paul",
      "Quinn",
      "Ruby",
      "Sam",
      "Tina",
      "Uma",
      "Victor",
      "Wendy",
      "Xander",
      "Yara",
    ];
    const lastNames = [
      "Anderson",
      "Brown",
      "Clark",
      "Davis",
      "Evans",
      "Fisher",
      "Garcia",
      "Harris",
      "Ivanov",
      "Johnson",
      "King",
      "Lee",
      "Miller",
      "Nelson",
      "O'Connor",
      "Parker",
      "Quinn",
      "Roberts",
      "Smith",
      "Taylor",
      "Upton",
      "Vargas",
      "Wilson",
      "Xavier",
      "Young",
    ];

    for (let i = 0; i < 25; i++) {
      const member = {
        firstName: firstNames[i],
        lastName: lastNames[i],
        email: `test.member${i + 1}@example.com`,
        phoneNumber: `+25470000${(200 + i).toString().padStart(3, "0")}`,
        idNumber: `TESTMEM${(i + 1).toString().padStart(3, "0")}`,
        passwordHash: hashedPassword,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        county: counties[i % counties.length],
        sacco: saccos[i % saccos.length],
        route: routes[i % routes.length],
        membershipStatus: MembershipStatus.ACTIVE,
        role: UserRole.MEMBER,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isIdNumberVerified: true,
        delegateId: testDelegate.id,
        coordinatorId: testCoordinator.id,
        membershipNumber: `TESTMEM${(i + 1).toString().padStart(3, "0")}`,
        membershipDate: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ), // Random date within last year
      };
      memberData.push(member);
    }

    const testMembers = await User.bulkCreate(memberData, { transaction: t });

    console.log(`✅ Created ${testMembers.length} Test Members`);

    // 4. Create some additional test data variations
    // Create a few pending members
    const pendingMembers = await User.bulkCreate(
      [
        {
          firstName: "Pending",
          lastName: "Member1",
          email: "pending.test1@example.com",
          phoneNumber: "+254700000300",
          idNumber: "TESTPEND001",
          passwordHash: hashedPassword,
          gender: Gender.MALE,
          county: "Nairobi",
          sacco: "Test Sacco",
          route: "Test Route",
          membershipStatus: MembershipStatus.PENDING,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: false,
          isPhoneVerified: false,
          isIdNumberVerified: false,
          delegateId: testDelegate.id,
          coordinatorId: testCoordinator.id,
          membershipNumber: "TESTPEND001",
        },
        {
          firstName: "Pending",
          lastName: "Member2",
          email: "pending.test2@example.com",
          phoneNumber: "+254700000301",
          idNumber: "TESTPEND002",
          passwordHash: hashedPassword,
          gender: Gender.FEMALE,
          county: "Mombasa",
          sacco: "Test Sacco",
          route: "Test Route",
          membershipStatus: MembershipStatus.PENDING,
          role: UserRole.MEMBER,
          isActive: true,
          isEmailVerified: false,
          isPhoneVerified: false,
          isIdNumberVerified: false,
          delegateId: testDelegate.id,
          coordinatorId: testCoordinator.id,
          membershipNumber: "TESTPEND002",
        },
      ],
      { transaction: t }
    );

    console.log(`✅ Created ${pendingMembers.length} Pending Test Members`);

    // Create a few inactive members
    const inactiveMembers = await User.bulkCreate(
      [
        {
          firstName: "Inactive",
          lastName: "Member1",
          email: "inactive.test1@example.com",
          phoneNumber: "+254700000400",
          idNumber: "TESTINACT001",
          passwordHash: hashedPassword,
          gender: Gender.MALE,
          county: "Kisumu",
          sacco: "Test Sacco",
          route: "Test Route",
          membershipStatus: MembershipStatus.INACTIVE,
          role: UserRole.MEMBER,
          isActive: false,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          delegateId: testDelegate.id,
          coordinatorId: testCoordinator.id,
          membershipNumber: "TESTINACT001",
          membershipDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000), // 2 years ago
        },
        {
          firstName: "Inactive",
          lastName: "Member2",
          email: "inactive.test2@example.com",
          phoneNumber: "+254700000401",
          idNumber: "TESTINACT002",
          passwordHash: hashedPassword,
          gender: Gender.FEMALE,
          county: "Nakuru",
          sacco: "Test Sacco",
          route: "Test Route",
          membershipStatus: MembershipStatus.INACTIVE,
          role: UserRole.MEMBER,
          isActive: false,
          isEmailVerified: true,
          isPhoneVerified: true,
          isIdNumberVerified: true,
          delegateId: testDelegate.id,
          coordinatorId: testCoordinator.id,
          membershipNumber: "TESTINACT002",
          membershipDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000), // 2 years ago
        },
      ],
      { transaction: t }
    );

    console.log(`✅ Created ${inactiveMembers.length} Inactive Test Members`);

    console.log("\n📊 Test Data Seeding Summary:");
    console.log(`   • Test Coordinator: 1`);
    console.log(`   • Test Delegate: 1`);
    console.log(`   • Active Test Members: ${testMembers.length}`);
    console.log(`   • Pending Test Members: ${pendingMembers.length}`);
    console.log(`   • Inactive Test Members: ${inactiveMembers.length}`);
    console.log(
      `   • Total Test Users: ${
        1 +
        1 +
        testMembers.length +
        pendingMembers.length +
        inactiveMembers.length
      }`
    );
    console.log(`\n🔑 Default Password for all test users: ${defaultPassword}`);
    console.log(`\n📋 Test Data Structure:`);
    console.log(`   • 1 Coordinator manages 1 Delegate`);
    console.log(`   • 1 Delegate manages ${testMembers.length} Active Members`);
    console.log(
      `   • Plus ${pendingMembers.length} Pending and ${inactiveMembers.length} Inactive Members`
    );
    console.log(`   • Perfect for testing table pagination and data display`);

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
  seedTestData()
    .then(() => {
      console.log("✅ Test data seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test data seeding failed:", error);
      process.exit(1);
    });
}
