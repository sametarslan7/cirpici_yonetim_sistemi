import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VETERANS = [
  "Beren Ersan",
  "Nurhan Elif Meriç",
  "Nur Sena Öztürk",
  "Berke Ünay",
  "Mertcan Kara",
];

const NEW_TEAM = ["Duhan Batıkan", "Minel", "Bora"];

async function main() {
  await prisma.employee.upsert({
    where: { name: "Mahsum Akikol" },
    create: { name: "Mahsum Akikol", role: "MANAGER" },
    update: { role: "MANAGER", active: true },
  });

  for (let i = 0; i < VETERANS.length; i++) {
    await prisma.employee.upsert({
      where: { name: VETERANS[i] },
      create: { name: VETERANS[i], role: "VETERAN", rotationOrder: i + 1 },
      update: { role: "VETERAN", rotationOrder: i + 1, active: true },
    });
  }

  for (let i = 0; i < NEW_TEAM.length; i++) {
    await prisma.employee.upsert({
      where: { name: NEW_TEAM[i] },
      create: { name: NEW_TEAM[i], role: "NEW", rotationOrder: i + 1 },
      update: { role: "NEW", rotationOrder: i + 1, active: true },
    });
  }

  console.log("Seed tamamlandı: 1 yönetici, 5 eski ekip, 3 yeni ekip.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
