-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PENDING',
    "googleId" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leonFlightId" TEXT NOT NULL,
    "flightNo" TEXT NOT NULL,
    "depDatetimeUtc" DATETIME NOT NULL,
    "aircraftType" TEXT NOT NULL,
    "depAirportIata" TEXT NOT NULL,
    "depAirportIcao" TEXT NOT NULL,
    "depCity" TEXT NOT NULL,
    "depCountry" TEXT NOT NULL,
    "arrAirportIata" TEXT NOT NULL,
    "arrAirportIcao" TEXT NOT NULL,
    "arrCity" TEXT NOT NULL,
    "arrCountry" TEXT NOT NULL,
    "distanceNm" INTEGER NOT NULL,
    "paxCapacity" INTEGER NOT NULL,
    "calculatedPrice" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "adminNotes" TEXT,
    "syncedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flightId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "handledById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inquiry_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortFlightThresholdNm" INTEGER NOT NULL DEFAULT 400,
    "shortFlightMultiplier" REAL NOT NULL DEFAULT 18.9,
    "longFlightMultiplier" REAL NOT NULL DEFAULT 8.5,
    "minimumPrice" INTEGER NOT NULL DEFAULT 1700,
    "roundToNearest" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "flightsSynced" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ApiConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leonRefreshToken" TEXT NOT NULL,
    "syncIntervalMin" INTEGER NOT NULL DEFAULT 15,
    "notificationEmail" TEXT NOT NULL DEFAULT 'fly@hypejets.com',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_leonFlightId_key" ON "Flight"("leonFlightId");
