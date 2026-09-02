-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rotationOrder" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WeeklyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "workingSaturday" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weeklyRequestId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "shift" TEXT NOT NULL,
    "isSaturday" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DayEntry_weeklyRequestId_fkey" FOREIGN KEY ("weeklyRequestId") REFERENCES "WeeklyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewTeamWeekOff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "dayOffIndex" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NewTeamWeekOff_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
