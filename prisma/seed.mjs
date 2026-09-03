import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VETERANS = [
  { name: "Beren Ersan", password: "2562" },
  { name: "Nurhan Elif Meriç", password: "6139" },
  { name: "Nur Sena Öztürk", password: "8157" },
  { name: "Berke Ünay", password: "6918" },
  { name: "Mertcan Kara", password: "9689" },
];

const NEW_TEAM = ["Duhan Batıkan", "Minel", "Bora"];

async function main() {
  await prisma.employee.upsert({
    where: { name: "Mahsum Akikol" },
    create: { name: "Mahsum Akikol", role: "MANAGER" },
    update: { role: "MANAGER", active: true },
  });

  for (let i = 0; i < VETERANS.length; i++) {
    const { name, password } = VETERANS[i];
    await prisma.employee.upsert({
      where: { name },
      create: { name, role: "VETERAN", rotationOrder: i + 1, password },
      update: { role: "VETERAN", rotationOrder: i + 1, active: true, password },
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
