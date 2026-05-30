-- CreateTable
CREATE TABLE "CountrySurcharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "surchargeType" TEXT NOT NULL DEFAULT 'FIXED',
    "amount" REAL NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesTo" TEXT NOT NULL DEFAULT 'BOTH',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CountrySurcharge_countryCode_label_key" ON "CountrySurcharge"("countryCode", "label");
