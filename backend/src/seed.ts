import { PrismaClient } from "@prisma/client";
import { hashString } from "./lib/auth-utils.js";

const prisma = new PrismaClient();

async function main() {
  const passcode = process.env.SUPER_ADMIN_PASSCODE ?? "123456";

  const existing = await prisma.user.findUnique({ where: { username: "super_admin" } });

  if (existing) {
    console.log("✓ super_admin already exists, skipping seed.");
    return;
  }

  await prisma.user.create({
    data: {
      username: "super_admin",
      displayName: "Super Admin",
      role: "SUPER_ADMIN",
      passcodeHash: hashString(passcode),
    },
  });

  console.log("✓ super_admin created.");
  console.log("  username : super_admin");
  console.log(`  passcode : ${passcode}`);

  if (passcode === "123456") {
    console.warn("⚠  SUPER_ADMIN_PASSCODE not set — using default '123456'. Change it after first login!");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
