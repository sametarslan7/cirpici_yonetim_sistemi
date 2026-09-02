-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'VETERAN', 'NEW');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('NORMAL', 'LATE', 'EXTRA', 'OFF');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "rotationOrder" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "workingSaturday" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayEntry" (
    "id" TEXT NOT NULL,
    "weeklyRequestId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "isSaturday" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DayEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewTeamWeekOff" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOffIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewTeamWeekOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_name_key" ON "Employee"("name");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "WeeklyRequest_weekStart_idx" ON "WeeklyRequest"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRequest_employeeId_weekStart_key" ON "WeeklyRequest"("employeeId", "weekStart");

-- CreateIndex
CREATE INDEX "DayEntry_date_idx" ON "DayEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DayEntry_weeklyRequestId_date_key" ON "DayEntry"("weeklyRequestId", "date");

-- CreateIndex
CREATE INDEX "NewTeamWeekOff_weekStart_idx" ON "NewTeamWeekOff"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "NewTeamWeekOff_employeeId_weekStart_key" ON "NewTeamWeekOff"("employeeId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyRequest" ADD CONSTRAINT "WeeklyRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayEntry" ADD CONSTRAINT "DayEntry_weeklyRequestId_fkey" FOREIGN KEY ("weeklyRequestId") REFERENCES "WeeklyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewTeamWeekOff" ADD CONSTRAINT "NewTeamWeekOff_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
