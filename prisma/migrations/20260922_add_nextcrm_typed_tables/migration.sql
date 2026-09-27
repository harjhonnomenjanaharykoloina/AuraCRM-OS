Loaded Prisma config from prisma.config.ts.

-- CreateEnum
CREATE TYPE "taskStatus" AS ENUM ('ACTIVE', 'PENDING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "DocumentSystemType" AS ENUM ('RECEIPT', 'CONTRACT', 'OFFER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "Invoice_Status" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED', 'REFUNDED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "Invoice_Type" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'PROFORMA');

-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL', 'ECB');

-- CreateEnum
CREATE TYPE "EmailFolder" AS ENUM ('INBOX', 'SENT');

-- CreateEnum
CREATE TYPE "crm_Activity_Type" AS ENUM ('call', 'meeting', 'note', 'email');

-- CreateEnum
CREATE TYPE "crm_Activity_Status" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "crm_Contracts_Status" AS ENUM ('NOTSTARTED', 'INPROGRESS', 'SIGNED');

-- CreateEnum
CREATE TYPE "crm_AuditLog_Action" AS ENUM ('created', 'updated', 'deleted', 'restored', 'relation_added', 'relation_removed');

-- CreateEnum
CREATE TYPE "crm_Product_Type" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "crm_Product_Status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "crm_Billing_Period" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "crm_AccountProduct_Status" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "crm_Discount_Type" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('google');

-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('SYSTEM', 'USER');

-- CreateEnum
CREATE TYPE "ApiKeyProvider" AS ENUM ('OPENAI', 'FIRECRAWL', 'ANTHROPIC', 'GROQ');

-- CreateTable
CREATE TABLE "Boards" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "favourite" BOOLEAN,
    "favouritePosition" BIGINT,
    "icon" TEXT,
    "position" BIGINT,
    "title" TEXT NOT NULL,
    "user" INTEGER NOT NULL,
    "visibility" TEXT,
    "sharedWith" UUID[],
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sections" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "board" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" BIGINT,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tasks" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "dueDateAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "position" BIGINT NOT NULL,
    "priority" TEXT NOT NULL,
    "section" UUID,
    "tags" JSONB,
    "title" TEXT NOT NULL,
    "likes" BIGINT DEFAULT 0,
    "user" INTEGER,
    "taskStatus" "taskStatus" DEFAULT 'ACTIVE',
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasksComments" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "task" UUID,
    "user" INTEGER NOT NULL,
    "assigned_crm_account_task" UUID,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "tasksComments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardWatchers" (
    "board_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "BoardWatchers_pkey" PRIMARY KEY ("board_id","user_id")
);

-- CreateTable
CREATE TABLE "TodoList" (
    "id" UUID NOT NULL,
    "createdAt" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "TodoList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employees" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "avatar" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "salary" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageUpload" (
    "id" UUID NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "ImageUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents" (
    "id" UUID NOT NULL,
    "__v" INTEGER,
    "date_created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "document_name" TEXT NOT NULL,
    "created_by_user" INTEGER,
    "createdBy" UUID,
    "description" TEXT,
    "document_type" UUID,
    "favourite" BOOLEAN,
    "document_file_mimeType" TEXT NOT NULL,
    "document_file_url" TEXT NOT NULL,
    "status" TEXT,
    "visibility" TEXT,
    "tags" JSONB,
    "key" TEXT,
    "size" INTEGER,
    "assigned_user" INTEGER,
    "connected_documents" TEXT[],
    "content_text" TEXT,
    "summary" TEXT,
    "content_hash" TEXT,
    "thumbnail_url" TEXT,
    "processing_status" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processing_error" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_document_id" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "document_system_type" "DocumentSystemType" DEFAULT 'OTHER',
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents_Types" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Documents_Types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentsToOpportunities" (
    "document_id" UUID NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "DocumentsToOpportunities_pkey" PRIMARY KEY ("document_id","opportunity_id")
);

-- CreateTable
CREATE TABLE "DocumentsToContacts" (
    "document_id" UUID NOT NULL,
    "contact_id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "DocumentsToContacts_pkey" PRIMARY KEY ("document_id","contact_id")
);

-- CreateTable
CREATE TABLE "DocumentsToTasks" (
    "document_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "DocumentsToTasks_pkey" PRIMARY KEY ("document_id","task_id")
);

-- CreateTable
CREATE TABLE "DocumentsToCrmAccountsTasks" (
    "document_id" UUID NOT NULL,
    "crm_accounts_task_id" UUID NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "DocumentsToCrmAccountsTasks_pkey" PRIMARY KEY ("document_id","crm_accounts_task_id")
);

-- CreateTable
CREATE TABLE "DocumentsToLeads" (
    "document_id" UUID NOT NULL,
    "lead_id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "DocumentsToLeads_pkey" PRIMARY KEY ("document_id","lead_id")
);

-- CreateTable
CREATE TABLE "DocumentsToAccounts" (
    "document_id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "DocumentsToAccounts_pkey" PRIMARY KEY ("document_id","account_id")
);

-- CreateTable
CREATE TABLE "AccountWatchers" (
    "account_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "AccountWatchers_pkey" PRIMARY KEY ("account_id","user_id")
);

-- CreateTable
CREATE TABLE "Invoices" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "type" "Invoice_Type" NOT NULL DEFAULT 'INVOICE',
    "status" "Invoice_Status" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT,
    "numberOverridden" BOOLEAN NOT NULL DEFAULT false,
    "seriesId" UUID,
    "accountId" TEXT NOT NULL,
    "billingSnapshot" JSONB,
    "issueDate" TIMESTAMP(3),
    "taxableSupplyDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL,
    "baseCurrency" VARCHAR(3),
    "fxRateToBase" DECIMAL(18,8),
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vatTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "variableSymbol" TEXT,
    "publicNotes" TEXT,
    "internalNotes" TEXT,
    "originalInvoiceId" UUID,
    "pdfStorageKey" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "search_vector" tsvector,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_LineItems" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRateId" UUID,
    "taxRateSnapshot" DECIMAL(5,2),
    "lineSubtotal" DECIMAL(14,2) NOT NULL,
    "lineVat" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_LineItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Payments" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_Payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Attachments" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrimaryPdf" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_Attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Activity" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_TaxRates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_TaxRates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Series" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prefixTemplate" TEXT NOT NULL,
    "resetPolicy" TEXT NOT NULL DEFAULT 'YEARLY',
    "currentYear" INTEGER,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Settings" (
    "id" UUID NOT NULL,
    "baseCurrency" VARCHAR(3) NOT NULL,
    "defaultSeriesId" UUID,
    "defaultTaxRateId" UUID,
    "defaultDueDays" INTEGER NOT NULL DEFAULT 14,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "footerText" TEXT,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "companyCity" TEXT,
    "companyZip" TEXT,
    "companyCountry" TEXT,
    "companyVatId" TEXT,
    "companyTaxId" TEXT,
    "companyRegNo" TEXT,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "companyWebsite" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" VARCHAR(5) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" UUID NOT NULL,
    "fromCurrency" VARCHAR(3) NOT NULL,
    "toCurrency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL,
    "imapSsl" BOOLEAN NOT NULL DEFAULT true,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpSsl" BOOLEAN NOT NULL DEFAULT true,
    "allowSelfSignedTls" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "passwordEncrypted" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sentFolderName" TEXT NOT NULL DEFAULT 'Sent',
    "lastSyncedAt" TIMESTAMP(3),
    "inboxLastUid" INTEGER,
    "sentLastUid" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" UUID NOT NULL,
    "emailAccountId" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "rfcMessageId" TEXT NOT NULL,
    "imapUid" INTEGER,
    "folder" "EmailFolder" NOT NULL,
    "subject" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "toRecipients" JSONB NOT NULL DEFAULT '[]',
    "ccRecipients" JSONB NOT NULL DEFAULT '[]',
    "bccRecipients" JSONB NOT NULL DEFAULT '[]',
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "sentAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEmbedding" (
    "id" UUID NOT NULL,
    "emailId" UUID NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embeddedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "EmailEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailsToContacts" (
    "emailId" UUID NOT NULL,
    "contactId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "EmailsToContacts_pkey" PRIMARY KEY ("emailId","contactId")
);

-- CreateTable
CREATE TABLE "EmailsToAccounts" (
    "emailId" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "EmailsToAccounts_pkey" PRIMARY KEY ("emailId","accountId")
);

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "syncToken" TEXT,
    "scopeLevel" TEXT NOT NULL DEFAULT 'readonly',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_CalendarEvents" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "iCalUID" TEXT,
    "connectionId" UUID,
    "activityId" UUID NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "attendeeEmails" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_CalendarEvents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" VARCHAR(8) NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKeys" (
    "id" UUID NOT NULL,
    "scope" "ApiKeyScope" NOT NULL,
    "userId" INTEGER,
    "provider" "ApiKeyProvider" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "ApiKeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemServices" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "serviceUrl" TEXT,
    "serviceId" TEXT,
    "serviceKey" TEXT,
    "servicePassword" TEXT,
    "servicePort" TEXT,
    "description" TEXT,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "systemServices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_AuditLog" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" "crm_AuditLog_Action" NOT NULL,
    "changes" JSONB,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Report_Config" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_Report_Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Report_Schedule" (
    "id" TEXT NOT NULL,
    "reportConfigId" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "recipients" JSONB NOT NULL,
    "format" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_Report_Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_SystemSettings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_SystemSettings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "crm_ActivityLinks" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_ActivityLinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Activities" (
    "id" UUID NOT NULL,
    "type" "crm_Activity_Type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "outcome" TEXT,
    "status" "crm_Activity_Status" NOT NULL DEFAULT 'scheduled',
    "metadata" JSONB,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_Activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Embeddings_Documents" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "content_hash" TEXT NOT NULL,
    "embedded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_Embeddings_Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Document_Chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "chunk_text" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "embedded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_Document_Chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Accounts_Tasks" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "dueDateAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL,
    "tags" JSONB,
    "title" TEXT NOT NULL,
    "likes" BIGINT DEFAULT 0,
    "user" INTEGER,
    "taskStatus" "taskStatus" DEFAULT 'ACTIVE',
    "account" TEXT,
    "opportunity_id" TEXT,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "crm_Accounts_Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Boards_user_idx" ON "Boards"("user");

-- CreateIndex
CREATE INDEX "Boards_createdBy_idx" ON "Boards"("createdBy");

-- CreateIndex
CREATE INDEX "Boards_updatedBy_idx" ON "Boards"("updatedBy");

-- CreateIndex
CREATE INDEX "Boards_favourite_idx" ON "Boards"("favourite");

-- CreateIndex
CREATE INDEX "Boards_visibility_idx" ON "Boards"("visibility");

-- CreateIndex
CREATE INDEX "Boards_createdAt_idx" ON "Boards"("createdAt");

-- CreateIndex
CREATE INDEX "Boards_user_favourite_idx" ON "Boards"("user", "favourite");

-- CreateIndex
CREATE INDEX "Boards_deletedAt_idx" ON "Boards"("deletedAt");

-- CreateIndex
CREATE INDEX "Boards_organizationId_idx" ON "Boards"("organizationId");

-- CreateIndex
CREATE INDEX "Sections_board_idx" ON "Sections"("board");

-- CreateIndex
CREATE INDEX "Sections_organizationId_idx" ON "Sections"("organizationId");

-- CreateIndex
CREATE INDEX "Tasks_user_idx" ON "Tasks"("user");

-- CreateIndex
CREATE INDEX "Tasks_section_idx" ON "Tasks"("section");

-- CreateIndex
CREATE INDEX "Tasks_createdBy_idx" ON "Tasks"("createdBy");

-- CreateIndex
CREATE INDEX "Tasks_updatedBy_idx" ON "Tasks"("updatedBy");

-- CreateIndex
CREATE INDEX "Tasks_priority_idx" ON "Tasks"("priority");

-- CreateIndex
CREATE INDEX "Tasks_taskStatus_idx" ON "Tasks"("taskStatus");

-- CreateIndex
CREATE INDEX "Tasks_dueDateAt_idx" ON "Tasks"("dueDateAt");

-- CreateIndex
CREATE INDEX "Tasks_createdAt_idx" ON "Tasks"("createdAt");

-- CreateIndex
CREATE INDEX "Tasks_user_taskStatus_idx" ON "Tasks"("user", "taskStatus");

-- CreateIndex
CREATE INDEX "Tasks_organizationId_idx" ON "Tasks"("organizationId");

-- CreateIndex
CREATE INDEX "tasksComments_task_idx" ON "tasksComments"("task");

-- CreateIndex
CREATE INDEX "tasksComments_user_idx" ON "tasksComments"("user");

-- CreateIndex
CREATE INDEX "tasksComments_assigned_crm_account_task_idx" ON "tasksComments"("assigned_crm_account_task");

-- CreateIndex
CREATE INDEX "tasksComments_organizationId_idx" ON "tasksComments"("organizationId");

-- CreateIndex
CREATE INDEX "BoardWatchers_board_id_idx" ON "BoardWatchers"("board_id");

-- CreateIndex
CREATE INDEX "BoardWatchers_user_id_idx" ON "BoardWatchers"("user_id");

-- CreateIndex
CREATE INDEX "BoardWatchers_organizationId_idx" ON "BoardWatchers"("organizationId");

-- CreateIndex
CREATE INDEX "TodoList_organizationId_idx" ON "TodoList"("organizationId");

-- CreateIndex
CREATE INDEX "Employees_organizationId_idx" ON "Employees"("organizationId");

-- CreateIndex
CREATE INDEX "ImageUpload_organizationId_idx" ON "ImageUpload"("organizationId");

-- CreateIndex
CREATE INDEX "Documents_created_by_user_idx" ON "Documents"("created_by_user");

-- CreateIndex
CREATE INDEX "Documents_assigned_user_idx" ON "Documents"("assigned_user");

-- CreateIndex
CREATE INDEX "Documents_document_type_idx" ON "Documents"("document_type");

-- CreateIndex
CREATE INDEX "Documents_createdBy_idx" ON "Documents"("createdBy");

-- CreateIndex
CREATE INDEX "Documents_status_idx" ON "Documents"("status");

-- CreateIndex
CREATE INDEX "Documents_visibility_idx" ON "Documents"("visibility");

-- CreateIndex
CREATE INDEX "Documents_favourite_idx" ON "Documents"("favourite");

-- CreateIndex
CREATE INDEX "Documents_createdAt_idx" ON "Documents"("createdAt");

-- CreateIndex
CREATE INDEX "Documents_document_system_type_idx" ON "Documents"("document_system_type");

-- CreateIndex
CREATE INDEX "Documents_content_hash_idx" ON "Documents"("content_hash");

-- CreateIndex
CREATE INDEX "Documents_parent_document_id_idx" ON "Documents"("parent_document_id");

-- CreateIndex
CREATE INDEX "Documents_processing_status_idx" ON "Documents"("processing_status");

-- CreateIndex
CREATE INDEX "Documents_deletedAt_idx" ON "Documents"("deletedAt");

-- CreateIndex
CREATE INDEX "Documents_organizationId_idx" ON "Documents"("organizationId");

-- CreateIndex
CREATE INDEX "Documents_Types_organizationId_idx" ON "Documents_Types"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentsToOpportunities_document_id_idx" ON "DocumentsToOpportunities"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToOpportunities_opportunity_id_idx" ON "DocumentsToOpportunities"("opportunity_id");

-- CreateIndex
CREATE INDEX "DocumentsToOpportunities_organizationId_idx" ON "DocumentsToOpportunities"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentsToContacts_document_id_idx" ON "DocumentsToContacts"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToContacts_contact_id_idx" ON "DocumentsToContacts"("contact_id");

-- CreateIndex
CREATE INDEX "DocumentsToContacts_organizationId_idx" ON "DocumentsToContacts"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentsToTasks_document_id_idx" ON "DocumentsToTasks"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToTasks_task_id_idx" ON "DocumentsToTasks"("task_id");

-- CreateIndex
CREATE INDEX "DocumentsToTasks_organizationId_idx" ON "DocumentsToTasks"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentsToCrmAccountsTasks_document_id_idx" ON "DocumentsToCrmAccountsTasks"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToCrmAccountsTasks_crm_accounts_task_id_idx" ON "DocumentsToCrmAccountsTasks"("crm_accounts_task_id");

-- CreateIndex
CREATE INDEX "DocumentsToCrmAccountsTasks_organizationId_idx" ON "DocumentsToCrmAccountsTasks"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentsToLeads_document_id_idx" ON "DocumentsToLeads"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToLeads_lead_id_idx" ON "DocumentsToLeads"("lead_id");

-- CreateIndex
CREATE INDEX "DocumentsToLeads_organizationId_idx" ON "DocumentsToLeads"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentsToAccounts_document_id_idx" ON "DocumentsToAccounts"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToAccounts_account_id_idx" ON "DocumentsToAccounts"("account_id");

-- CreateIndex
CREATE INDEX "DocumentsToAccounts_organizationId_idx" ON "DocumentsToAccounts"("organizationId");

-- CreateIndex
CREATE INDEX "AccountWatchers_account_id_idx" ON "AccountWatchers"("account_id");

-- CreateIndex
CREATE INDEX "AccountWatchers_user_id_idx" ON "AccountWatchers"("user_id");

-- CreateIndex
CREATE INDEX "AccountWatchers_organizationId_idx" ON "AccountWatchers"("organizationId");

-- CreateIndex
CREATE INDEX "Invoices_accountId_idx" ON "Invoices"("accountId");

-- CreateIndex
CREATE INDEX "Invoices_status_idx" ON "Invoices"("status");

-- CreateIndex
CREATE INDEX "Invoices_issueDate_idx" ON "Invoices"("issueDate");

-- CreateIndex
CREATE INDEX "Invoices_dueDate_idx" ON "Invoices"("dueDate");

-- CreateIndex
CREATE INDEX "Invoices_createdBy_idx" ON "Invoices"("createdBy");

-- CreateIndex
CREATE INDEX "Invoices_originalInvoiceId_idx" ON "Invoices"("originalInvoiceId");

-- CreateIndex
CREATE INDEX "Invoices_organizationId_idx" ON "Invoices"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoices_seriesId_number_key" ON "Invoices"("seriesId", "number");

-- CreateIndex
CREATE INDEX "Invoice_LineItems_invoiceId_idx" ON "Invoice_LineItems"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_LineItems_productId_idx" ON "Invoice_LineItems"("productId");

-- CreateIndex
CREATE INDEX "Invoice_LineItems_taxRateId_idx" ON "Invoice_LineItems"("taxRateId");

-- CreateIndex
CREATE INDEX "Invoice_LineItems_organizationId_idx" ON "Invoice_LineItems"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_Payments_invoiceId_idx" ON "Invoice_Payments"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_Payments_organizationId_idx" ON "Invoice_Payments"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_Attachments_invoiceId_idx" ON "Invoice_Attachments"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_Attachments_organizationId_idx" ON "Invoice_Attachments"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_Activity_invoiceId_idx" ON "Invoice_Activity"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_Activity_organizationId_idx" ON "Invoice_Activity"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_TaxRates_organizationId_idx" ON "Invoice_TaxRates"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_Series_organizationId_idx" ON "Invoice_Series"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_Settings_organizationId_idx" ON "Invoice_Settings"("organizationId");

-- CreateIndex
CREATE INDEX "Currency_organizationId_idx" ON "Currency"("organizationId");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrency_idx" ON "ExchangeRate"("fromCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRate_toCurrency_idx" ON "ExchangeRate"("toCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRate_organizationId_idx" ON "ExchangeRate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_key" ON "ExchangeRate"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "EmailAccount_userId_idx" ON "EmailAccount"("userId");

-- CreateIndex
CREATE INDEX "EmailAccount_isActive_idx" ON "EmailAccount"("isActive");

-- CreateIndex
CREATE INDEX "EmailAccount_organizationId_idx" ON "EmailAccount"("organizationId");

-- CreateIndex
CREATE INDEX "Email_userId_idx" ON "Email"("userId");

-- CreateIndex
CREATE INDEX "Email_emailAccountId_idx" ON "Email"("emailAccountId");

-- CreateIndex
CREATE INDEX "Email_folder_idx" ON "Email"("folder");

-- CreateIndex
CREATE INDEX "Email_isDeleted_idx" ON "Email"("isDeleted");

-- CreateIndex
CREATE INDEX "Email_sentAt_idx" ON "Email"("sentAt");

-- CreateIndex
CREATE INDEX "Email_userId_folder_isDeleted_isRead_idx" ON "Email"("userId", "folder", "isDeleted", "isRead");

-- CreateIndex
CREATE INDEX "Email_organizationId_idx" ON "Email"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Email_emailAccountId_rfcMessageId_key" ON "Email"("emailAccountId", "rfcMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailEmbedding_emailId_key" ON "EmailEmbedding"("emailId");

-- CreateIndex
CREATE INDEX "EmailEmbedding_organizationId_idx" ON "EmailEmbedding"("organizationId");

-- CreateIndex
CREATE INDEX "EmailsToContacts_emailId_idx" ON "EmailsToContacts"("emailId");

-- CreateIndex
CREATE INDEX "EmailsToContacts_contactId_idx" ON "EmailsToContacts"("contactId");

-- CreateIndex
CREATE INDEX "EmailsToContacts_organizationId_idx" ON "EmailsToContacts"("organizationId");

-- CreateIndex
CREATE INDEX "EmailsToAccounts_emailId_idx" ON "EmailsToAccounts"("emailId");

-- CreateIndex
CREATE INDEX "EmailsToAccounts_accountId_idx" ON "EmailsToAccounts"("accountId");

-- CreateIndex
CREATE INDEX "EmailsToAccounts_organizationId_idx" ON "EmailsToAccounts"("organizationId");

-- CreateIndex
CREATE INDEX "CalendarConnection_userId_idx" ON "CalendarConnection"("userId");

-- CreateIndex
CREATE INDEX "CalendarConnection_isActive_idx" ON "CalendarConnection"("isActive");

-- CreateIndex
CREATE INDEX "CalendarConnection_organizationId_idx" ON "CalendarConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConnection_userId_provider_accountEmail_key" ON "CalendarConnection"("userId", "provider", "accountEmail");

-- CreateIndex
CREATE INDEX "crm_CalendarEvents_iCalUID_idx" ON "crm_CalendarEvents"("iCalUID");

-- CreateIndex
CREATE INDEX "crm_CalendarEvents_activityId_idx" ON "crm_CalendarEvents"("activityId");

-- CreateIndex
CREATE INDEX "crm_CalendarEvents_startAt_idx" ON "crm_CalendarEvents"("startAt");

-- CreateIndex
CREATE INDEX "crm_CalendarEvents_organizationId_idx" ON "crm_CalendarEvents"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_CalendarEvents_source_externalId_key" ON "crm_CalendarEvents"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");

-- CreateIndex
CREATE INDEX "ApiToken_organizationId_idx" ON "ApiToken"("organizationId");

-- CreateIndex
CREATE INDEX "ApiKeys_scope_provider_idx" ON "ApiKeys"("scope", "provider");

-- CreateIndex
CREATE INDEX "ApiKeys_userId_provider_idx" ON "ApiKeys"("userId", "provider");

-- CreateIndex
CREATE INDEX "ApiKeys_organizationId_idx" ON "ApiKeys"("organizationId");

-- CreateIndex
CREATE INDEX "systemServices_organizationId_idx" ON "systemServices"("organizationId");

-- CreateIndex
CREATE INDEX "crm_AuditLog_entityType_entityId_createdAt_idx" ON "crm_AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "crm_AuditLog_userId_idx" ON "crm_AuditLog"("userId");

-- CreateIndex
CREATE INDEX "crm_AuditLog_createdAt_idx" ON "crm_AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "crm_AuditLog_entityType_createdAt_idx" ON "crm_AuditLog"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "crm_AuditLog_organizationId_idx" ON "crm_AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "crm_Report_Config_createdBy_idx" ON "crm_Report_Config"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Report_Config_category_idx" ON "crm_Report_Config"("category");

-- CreateIndex
CREATE INDEX "crm_Report_Config_isShared_idx" ON "crm_Report_Config"("isShared");

-- CreateIndex
CREATE INDEX "crm_Report_Config_organizationId_idx" ON "crm_Report_Config"("organizationId");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_reportConfigId_idx" ON "crm_Report_Schedule"("reportConfigId");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_createdBy_idx" ON "crm_Report_Schedule"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_isActive_idx" ON "crm_Report_Schedule"("isActive");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_lastSentAt_idx" ON "crm_Report_Schedule"("lastSentAt");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_organizationId_idx" ON "crm_Report_Schedule"("organizationId");

-- CreateIndex
CREATE INDEX "crm_SystemSettings_organizationId_idx" ON "crm_SystemSettings"("organizationId");

-- CreateIndex
CREATE INDEX "crm_ActivityLinks_activityId_idx" ON "crm_ActivityLinks"("activityId");

-- CreateIndex
CREATE INDEX "crm_ActivityLinks_entityType_entityId_activityId_idx" ON "crm_ActivityLinks"("entityType", "entityId", "activityId");

-- CreateIndex
CREATE INDEX "crm_ActivityLinks_organizationId_idx" ON "crm_ActivityLinks"("organizationId");

-- CreateIndex
CREATE INDEX "crm_Activities_date_idx" ON "crm_Activities"("date");

-- CreateIndex
CREATE INDEX "crm_Activities_type_idx" ON "crm_Activities"("type");

-- CreateIndex
CREATE INDEX "crm_Activities_status_idx" ON "crm_Activities"("status");

-- CreateIndex
CREATE INDEX "crm_Activities_createdBy_idx" ON "crm_Activities"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Activities_createdAt_idx" ON "crm_Activities"("createdAt");

-- CreateIndex
CREATE INDEX "crm_Activities_deletedAt_idx" ON "crm_Activities"("deletedAt");

-- CreateIndex
CREATE INDEX "crm_Activities_organizationId_idx" ON "crm_Activities"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_Embeddings_Documents_document_id_key" ON "crm_Embeddings_Documents"("document_id");

-- CreateIndex
CREATE INDEX "crm_Embeddings_Documents_organizationId_idx" ON "crm_Embeddings_Documents"("organizationId");

-- CreateIndex
CREATE INDEX "crm_Document_Chunks_document_id_idx" ON "crm_Document_Chunks"("document_id");

-- CreateIndex
CREATE INDEX "crm_Document_Chunks_organizationId_idx" ON "crm_Document_Chunks"("organizationId");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_user_idx" ON "crm_Accounts_Tasks"("user");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_account_idx" ON "crm_Accounts_Tasks"("account");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_createdBy_idx" ON "crm_Accounts_Tasks"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_updatedBy_idx" ON "crm_Accounts_Tasks"("updatedBy");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_priority_idx" ON "crm_Accounts_Tasks"("priority");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_taskStatus_idx" ON "crm_Accounts_Tasks"("taskStatus");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_dueDateAt_idx" ON "crm_Accounts_Tasks"("dueDateAt");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_createdAt_idx" ON "crm_Accounts_Tasks"("createdAt");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_account_taskStatus_idx" ON "crm_Accounts_Tasks"("account", "taskStatus");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_opportunity_id_idx" ON "crm_Accounts_Tasks"("opportunity_id");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_organizationId_idx" ON "crm_Accounts_Tasks"("organizationId");

-- AddForeignKey
ALTER TABLE "Boards" ADD CONSTRAINT "Boards_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boards" ADD CONSTRAINT "Boards_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sections" ADD CONSTRAINT "Sections_board_fkey" FOREIGN KEY ("board") REFERENCES "Boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sections" ADD CONSTRAINT "Sections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_section_fkey" FOREIGN KEY ("section") REFERENCES "Sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasksComments" ADD CONSTRAINT "tasksComments_assigned_crm_account_task_fkey" FOREIGN KEY ("assigned_crm_account_task") REFERENCES "crm_Accounts_Tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasksComments" ADD CONSTRAINT "tasksComments_task_fkey" FOREIGN KEY ("task") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasksComments" ADD CONSTRAINT "tasksComments_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasksComments" ADD CONSTRAINT "tasksComments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardWatchers" ADD CONSTRAINT "BoardWatchers_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "Boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardWatchers" ADD CONSTRAINT "BoardWatchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardWatchers" ADD CONSTRAINT "BoardWatchers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoList" ADD CONSTRAINT "TodoList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employees" ADD CONSTRAINT "Employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageUpload" ADD CONSTRAINT "ImageUpload_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_created_by_user_fkey" FOREIGN KEY ("created_by_user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_assigned_user_fkey" FOREIGN KEY ("assigned_user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_document_type_fkey" FOREIGN KEY ("document_type") REFERENCES "Documents_Types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_parent_document_id_fkey" FOREIGN KEY ("parent_document_id") REFERENCES "Documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents_Types" ADD CONSTRAINT "Documents_Types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToOpportunities" ADD CONSTRAINT "DocumentsToOpportunities_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToOpportunities" ADD CONSTRAINT "DocumentsToOpportunities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToContacts" ADD CONSTRAINT "DocumentsToContacts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToContacts" ADD CONSTRAINT "DocumentsToContacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToTasks" ADD CONSTRAINT "DocumentsToTasks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToTasks" ADD CONSTRAINT "DocumentsToTasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToTasks" ADD CONSTRAINT "DocumentsToTasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToCrmAccountsTasks" ADD CONSTRAINT "DocumentsToCrmAccountsTasks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToCrmAccountsTasks" ADD CONSTRAINT "DocumentsToCrmAccountsTasks_crm_accounts_task_id_fkey" FOREIGN KEY ("crm_accounts_task_id") REFERENCES "crm_Accounts_Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToCrmAccountsTasks" ADD CONSTRAINT "DocumentsToCrmAccountsTasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToLeads" ADD CONSTRAINT "DocumentsToLeads_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToLeads" ADD CONSTRAINT "DocumentsToLeads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToAccounts" ADD CONSTRAINT "DocumentsToAccounts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToAccounts" ADD CONSTRAINT "DocumentsToAccounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountWatchers" ADD CONSTRAINT "AccountWatchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountWatchers" ADD CONSTRAINT "AccountWatchers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Invoice_Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_LineItems" ADD CONSTRAINT "Invoice_LineItems_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_LineItems" ADD CONSTRAINT "Invoice_LineItems_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "Invoice_TaxRates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_LineItems" ADD CONSTRAINT "Invoice_LineItems_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Payments" ADD CONSTRAINT "Invoice_Payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Payments" ADD CONSTRAINT "Invoice_Payments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Payments" ADD CONSTRAINT "Invoice_Payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Attachments" ADD CONSTRAINT "Invoice_Attachments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Attachments" ADD CONSTRAINT "Invoice_Attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Attachments" ADD CONSTRAINT "Invoice_Attachments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Activity" ADD CONSTRAINT "Invoice_Activity_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Activity" ADD CONSTRAINT "Invoice_Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Activity" ADD CONSTRAINT "Invoice_Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_TaxRates" ADD CONSTRAINT "Invoice_TaxRates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Series" ADD CONSTRAINT "Invoice_Series_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Settings" ADD CONSTRAINT "Invoice_Settings_defaultSeriesId_fkey" FOREIGN KEY ("defaultSeriesId") REFERENCES "Invoice_Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Settings" ADD CONSTRAINT "Invoice_Settings_defaultTaxRateId_fkey" FOREIGN KEY ("defaultTaxRateId") REFERENCES "Invoice_TaxRates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Settings" ADD CONSTRAINT "Invoice_Settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrency_fkey" FOREIGN KEY ("fromCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrency_fkey" FOREIGN KEY ("toCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEmbedding" ADD CONSTRAINT "EmailEmbedding_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEmbedding" ADD CONSTRAINT "EmailEmbedding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailsToContacts" ADD CONSTRAINT "EmailsToContacts_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailsToContacts" ADD CONSTRAINT "EmailsToContacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailsToAccounts" ADD CONSTRAINT "EmailsToAccounts_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailsToAccounts" ADD CONSTRAINT "EmailsToAccounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_CalendarEvents" ADD CONSTRAINT "crm_CalendarEvents_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CalendarConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_CalendarEvents" ADD CONSTRAINT "crm_CalendarEvents_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm_Activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_CalendarEvents" ADD CONSTRAINT "crm_CalendarEvents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKeys" ADD CONSTRAINT "ApiKeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKeys" ADD CONSTRAINT "ApiKeys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systemServices" ADD CONSTRAINT "systemServices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_AuditLog" ADD CONSTRAINT "crm_AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_AuditLog" ADD CONSTRAINT "crm_AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Report_Config" ADD CONSTRAINT "crm_Report_Config_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Report_Config" ADD CONSTRAINT "crm_Report_Config_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Report_Schedule" ADD CONSTRAINT "crm_Report_Schedule_reportConfigId_fkey" FOREIGN KEY ("reportConfigId") REFERENCES "crm_Report_Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Report_Schedule" ADD CONSTRAINT "crm_Report_Schedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Report_Schedule" ADD CONSTRAINT "crm_Report_Schedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_SystemSettings" ADD CONSTRAINT "crm_SystemSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ActivityLinks" ADD CONSTRAINT "crm_ActivityLinks_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm_Activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ActivityLinks" ADD CONSTRAINT "crm_ActivityLinks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Activities" ADD CONSTRAINT "crm_Activities_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Activities" ADD CONSTRAINT "crm_Activities_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Activities" ADD CONSTRAINT "crm_Activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Embeddings_Documents" ADD CONSTRAINT "crm_Embeddings_Documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Embeddings_Documents" ADD CONSTRAINT "crm_Embeddings_Documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Document_Chunks" ADD CONSTRAINT "crm_Document_Chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Document_Chunks" ADD CONSTRAINT "crm_Document_Chunks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

