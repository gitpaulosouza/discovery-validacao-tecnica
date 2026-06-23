-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "painPoint" TEXT NOT NULL,
    "declaredDeadline" TEXT,
    "budget" REAL,
    "mentionedStack" TEXT,
    "decisorName" TEXT,
    "transcript" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ANALYSIS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "effortMinWeeks" REAL NOT NULL,
    "effortMaxWeeks" REAL NOT NULL,
    "confidenceNote" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "suggestedSeniority" TEXT NOT NULL,
    "slaDeadlineAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadAnalysis_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisNfr" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "AnalysisNfr_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "LeadAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisRisk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "AnalysisRisk_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "LeadAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "AnalysisSkill_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "LeadAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "PersonSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "PersonSkill_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deciderName" TEXT NOT NULL,
    "remediationNote" TEXT,
    "recycleReason" TEXT,
    "killReason" TEXT,
    "killTag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Decision_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadAnalysis_leadId_key" ON "LeadAnalysis"("leadId");

-- CreateIndex
CREATE INDEX "AnalysisNfr_analysisId_idx" ON "AnalysisNfr"("analysisId");

-- CreateIndex
CREATE INDEX "AnalysisRisk_analysisId_idx" ON "AnalysisRisk"("analysisId");

-- CreateIndex
CREATE INDEX "AnalysisSkill_analysisId_idx" ON "AnalysisSkill"("analysisId");

-- CreateIndex
CREATE INDEX "PersonSkill_personId_idx" ON "PersonSkill"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonSkill_personId_value_key" ON "PersonSkill"("personId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_leadId_key" ON "Decision"("leadId");
