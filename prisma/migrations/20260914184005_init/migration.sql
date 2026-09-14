-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('admin', 'standard');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('USER', 'QUEUE');

-- CreateEnum
CREATE TYPE "PrincipalType" AS ENUM ('USER', 'GROUP');

-- CreateEnum
CREATE TYPE "ShareAccessLevel" AS ENUM ('READ', 'EDIT', 'DELETE');

-- CreateEnum
CREATE TYPE "AssignmentTargetType" AS ENUM ('USER', 'QUEUE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('QUEUE_ASSIGNMENT', 'USER_ASSIGNMENT', 'COMMENT_MENTION');

-- CreateEnum
CREATE TYPE "ListViewPrincipalType" AS ENUM ('GROUP', 'PERMISSION_SET');

-- CreateEnum
CREATE TYPE "ListViewMode" AS ENUM ('table', 'kanban');

-- CreateEnum
CREATE TYPE "MetadataDependencySourceType" AS ENUM ('FIELD_DEFINITION', 'ASSIGNMENT_RULE', 'SHARING_RULE', 'DUPLICATE_RULE', 'VALIDATION_RULE', 'LIST_VIEW', 'DASHBOARD_WIDGET', 'RECORD_PAGE_LAYOUT', 'APP');

-- CreateEnum
CREATE TYPE "DuplicateRuleAction" AS ENUM ('NONE', 'WARN', 'BLOCK');

-- CreateEnum
CREATE TYPE "MetadataDependencyReferenceKind" AS ENUM ('LOOKUP_TARGET_OBJECT', 'TRIGGER_OBJECT', 'CRITERIA_FIELD', 'CONDITION_FIELD', 'COMPARE_FIELD', 'ERROR_FIELD', 'COLUMN_FIELD', 'SORT_FIELD', 'KANBAN_FIELD', 'VALUE_FIELD', 'GROUP_BY_FIELD', 'LAYOUT_FIELD', 'VISIBILITY_FIELD', 'HIGHLIGHT_FIELD', 'NAV_OBJECT');

-- CreateEnum
CREATE TYPE "PermissionSetAssignmentSourceType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportJobMode" AS ENUM ('INSERT', 'UPDATE', 'UPSERT');

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "userType" "UserType" NOT NULL DEFAULT 'admin',
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionSet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" INTEGER NOT NULL,
    "allowDataLoading" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PermissionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionSetGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "PermissionSetGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionSetGroupAssignment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionSetGroupId" INTEGER NOT NULL,

    CONSTRAINT "PermissionSetGroupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionSetGroupMember" (
    "id" SERIAL NOT NULL,
    "permissionSetGroupId" INTEGER NOT NULL,
    "permissionSetId" INTEGER NOT NULL,

    CONSTRAINT "PermissionSetGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionSetAssignment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionSetId" INTEGER NOT NULL,

    CONSTRAINT "PermissionSetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "mode" "ImportJobMode" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "errors" JSONB,
    "warnings" JSONB,
    "recordId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionSetAssignmentSource" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "sourceType" "PermissionSetAssignmentSourceType" NOT NULL,
    "permissionSetGroupId" INTEGER,

    CONSTRAINT "PermissionSetAssignmentSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectPermission" (
    "id" SERIAL NOT NULL,
    "permissionSetId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "allowRead" BOOLEAN NOT NULL DEFAULT false,
    "allowCreate" BOOLEAN NOT NULL DEFAULT false,
    "allowEdit" BOOLEAN NOT NULL DEFAULT false,
    "allowDelete" BOOLEAN NOT NULL DEFAULT false,
    "allowViewAll" BOOLEAN NOT NULL DEFAULT false,
    "allowModifyAll" BOOLEAN NOT NULL DEFAULT false,
    "allowModifyListViews" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ObjectPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppPermission" (
    "id" SERIAL NOT NULL,
    "permissionSetId" INTEGER NOT NULL,
    "appId" INTEGER NOT NULL,

    CONSTRAINT "AppPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueMember" (
    "id" SERIAL NOT NULL,
    "queueId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordShare" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "principalType" "PrincipalType" NOT NULL,
    "principalId" INTEGER NOT NULL,
    "accessLevel" "ShareAccessLevel" NOT NULL DEFAULT 'READ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRule" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "targetType" "AssignmentTargetType" NOT NULL,
    "targetUserId" INTEGER,
    "targetQueueId" INTEGER,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharingRule" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "targetGroupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "criteria" JSONB NOT NULL,
    "accessLevel" "ShareAccessLevel" NOT NULL DEFAULT 'READ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectDefinition" (
    "id" SERIAL NOT NULL,
    "apiName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pluralLabel" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notifyOnAssignment" BOOLEAN NOT NULL DEFAULT false,
    "enableChatter" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ObjectDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldDefinition" (
    "id" SERIAL NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "apiName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isExternalId" BOOLEAN NOT NULL DEFAULT false,
    "isUnique" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "lookupTargetId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PicklistOption" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "fieldDefId" INTEGER NOT NULL,
    "apiName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PicklistOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(191),
    "organizationId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "ownerId" INTEGER,
    "ownerType" "OwnerType" NOT NULL DEFAULT 'USER',
    "ownerQueueId" INTEGER,
    "backingUserId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "lastModifiedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "recordId" INTEGER,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordComment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "recordId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "bodyText" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordCommentMention" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordCommentMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAttachment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "recordId" INTEGER NOT NULL,
    "fieldDefId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldData" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "fieldDefId" INTEGER NOT NULL,
    "valueText" TEXT,
    "valueSearch" VARCHAR(191),
    "valueNumber" DECIMAL(18,4),
    "valueDate" TIMESTAMP(3),
    "valueBoolean" BOOLEAN,
    "valueLookup" INTEGER,
    "valuePicklistId" INTEGER,

    CONSTRAINT "FieldData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldHistory" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "recordId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "fieldDefId" INTEGER NOT NULL,
    "fieldApiNameSnapshot" VARCHAR(191) NOT NULL,
    "fieldLabelSnapshot" VARCHAR(191) NOT NULL,
    "oldValueText" TEXT,
    "oldValueNumber" DECIMAL(18,4),
    "oldValueDate" TIMESTAMP(3),
    "oldValueBoolean" BOOLEAN,
    "oldValueLookup" INTEGER,
    "newValueText" TEXT,
    "newValueNumber" DECIMAL(18,4),
    "newValueDate" TIMESTAMP(3),
    "newValueBoolean" BOOLEAN,
    "newValueLookup" INTEGER,
    "changedById" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordOwnerHistory" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "recordId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "oldOwnerType" "OwnerType" NOT NULL,
    "oldOwnerId" INTEGER,
    "oldOwnerQueueId" INTEGER,
    "newOwnerType" "OwnerType" NOT NULL,
    "newOwnerId" INTEGER,
    "newOwnerQueueId" INTEGER,
    "changedById" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordOwnerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordPageLayout" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordPageLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordPageAssignment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "appId" INTEGER NOT NULL,
    "permissionSetId" INTEGER,
    "layoutId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordPageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListView" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB,
    "sortField" TEXT,
    "sortDirection" TEXT NOT NULL DEFAULT 'asc',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "viewMode" "ListViewMode" NOT NULL DEFAULT 'table',
    "kanbanGroupByFieldDefId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListViewColumn" (
    "id" SERIAL NOT NULL,
    "listViewId" INTEGER NOT NULL,
    "fieldDefId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListViewColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListViewShare" (
    "id" SERIAL NOT NULL,
    "listViewId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "principalType" "ListViewPrincipalType" NOT NULL,
    "principalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListViewShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserListViewPreference" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "defaultListViewId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserListViewPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListViewPin" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "listViewId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListViewPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationRule" (
    "id" SERIAL NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "errorMessage" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logicOperator" TEXT NOT NULL DEFAULT 'ALL',
    "logicExpression" TEXT,
    "errorPlacement" TEXT NOT NULL DEFAULT 'toast',
    "errorFieldId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationCondition" (
    "id" SERIAL NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "fieldDefId" INTEGER,
    "compareFieldId" INTEGER,
    "systemField" TEXT,
    "permissionSetId" INTEGER,
    "operator" TEXT NOT NULL,
    "compareValue" TEXT,
    "compareSource" TEXT NOT NULL DEFAULT 'value',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateRule" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createAction" "DuplicateRuleAction" NOT NULL DEFAULT 'WARN',
    "editAction" "DuplicateRuleAction" NOT NULL DEFAULT 'WARN',
    "logicOperator" TEXT NOT NULL DEFAULT 'ALL',
    "logicExpression" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicateRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateRuleCondition" (
    "id" SERIAL NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "fieldDefId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicateRuleCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataDependency" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "sourceType" "MetadataDependencySourceType" NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourcePath" TEXT,
    "sourceObjectDefId" INTEGER,
    "sourceAppId" INTEGER,
    "objectDefId" INTEGER,
    "fieldDefId" INTEGER,
    "referenceKind" "MetadataDependencyReferenceKind" NOT NULL,
    "isBlockingDelete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetadataDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppDefinition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "apiName" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "AppDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" SERIAL NOT NULL,
    "appId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "layout" JSONB,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppNavItem" (
    "id" SERIAL NOT NULL,
    "appId" INTEGER NOT NULL,
    "objectDefId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AppNavItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_groupId_idx" ON "User"("groupId");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_organizationId_email_key" ON "User"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionSet_organizationId_name_key" ON "PermissionSet"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionSetGroup_organizationId_name_key" ON "PermissionSetGroup"("organizationId", "name");

-- CreateIndex
CREATE INDEX "PermissionSetGroupAssignment_permissionSetGroupId_idx" ON "PermissionSetGroupAssignment"("permissionSetGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionSetGroupAssignment_userId_permissionSetGroupId_key" ON "PermissionSetGroupAssignment"("userId", "permissionSetGroupId");

-- CreateIndex
CREATE INDEX "PermissionSetGroupMember_permissionSetId_idx" ON "PermissionSetGroupMember"("permissionSetId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionSetGroupMember_permissionSetGroupId_permissionSet_key" ON "PermissionSetGroupMember"("permissionSetGroupId", "permissionSetId");

-- CreateIndex
CREATE INDEX "PermissionSetAssignment_permissionSetId_idx" ON "PermissionSetAssignment"("permissionSetId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionSetAssignment_userId_permissionSetId_key" ON "PermissionSetAssignment"("userId", "permissionSetId");

-- CreateIndex
CREATE INDEX "ImportJob_organizationId_objectDefId_createdAt_idx" ON "ImportJob"("organizationId", "objectDefId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_createdById_idx" ON "ImportJob"("createdById");

-- CreateIndex
CREATE INDEX "ImportRow_jobId_rowIndex_idx" ON "ImportRow"("jobId", "rowIndex");

-- CreateIndex
CREATE INDEX "ImportRow_recordId_idx" ON "ImportRow"("recordId");

-- CreateIndex
CREATE INDEX "PermissionSetAssignmentSource_permissionSetGroupId_idx" ON "PermissionSetAssignmentSource"("permissionSetGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionSetAssignmentSource_assignmentId_sourceType_permi_key" ON "PermissionSetAssignmentSource"("assignmentId", "sourceType", "permissionSetGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectPermission_permissionSetId_objectDefId_key" ON "ObjectPermission"("permissionSetId", "objectDefId");

-- CreateIndex
CREATE INDEX "AppPermission_appId_idx" ON "AppPermission"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "AppPermission_permissionSetId_appId_key" ON "AppPermission"("permissionSetId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_organizationId_name_key" ON "Queue"("organizationId", "name");

-- CreateIndex
CREATE INDEX "QueueMember_userId_idx" ON "QueueMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueMember_queueId_userId_key" ON "QueueMember"("queueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_organizationId_name_key" ON "Group"("organizationId", "name");

-- CreateIndex
CREATE INDEX "RecordShare_recordId_idx" ON "RecordShare"("recordId");

-- CreateIndex
CREATE INDEX "RecordShare_principalType_principalId_idx" ON "RecordShare"("principalType", "principalId");

-- CreateIndex
CREATE INDEX "RecordShare_organizationId_principalType_principalId_idx" ON "RecordShare"("organizationId", "principalType", "principalId");

-- CreateIndex
CREATE INDEX "RecordShare_organizationId_idx" ON "RecordShare"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordShare_recordId_principalType_principalId_key" ON "RecordShare"("recordId", "principalType", "principalId");

-- CreateIndex
CREATE INDEX "AssignmentRule_organizationId_objectDefId_idx" ON "AssignmentRule"("organizationId", "objectDefId");

-- CreateIndex
CREATE INDEX "AssignmentRule_objectDefId_sortOrder_idx" ON "AssignmentRule"("objectDefId", "sortOrder");

-- CreateIndex
CREATE INDEX "SharingRule_organizationId_objectDefId_idx" ON "SharingRule"("organizationId", "objectDefId");

-- CreateIndex
CREATE INDEX "SharingRule_objectDefId_sortOrder_idx" ON "SharingRule"("objectDefId", "sortOrder");

-- CreateIndex
CREATE INDEX "SharingRule_targetGroupId_idx" ON "SharingRule"("targetGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectDefinition_organizationId_apiName_key" ON "ObjectDefinition"("organizationId", "apiName");

-- CreateIndex
CREATE INDEX "FieldDefinition_lookupTargetId_idx" ON "FieldDefinition"("lookupTargetId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldDefinition_objectDefId_apiName_key" ON "FieldDefinition"("objectDefId", "apiName");

-- CreateIndex
CREATE INDEX "PicklistOption_fieldDefId_isActive_sortOrder_idx" ON "PicklistOption"("fieldDefId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "PicklistOption_organizationId_idx" ON "PicklistOption"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PicklistOption_fieldDefId_apiName_key" ON "PicklistOption"("fieldDefId", "apiName");

-- CreateIndex
CREATE UNIQUE INDEX "PicklistOption_fieldDefId_label_key" ON "PicklistOption"("fieldDefId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Record_backingUserId_key" ON "Record"("backingUserId");

-- CreateIndex
CREATE INDEX "Record_organizationId_objectDefId_createdAt_idx" ON "Record"("organizationId", "objectDefId", "createdAt");

-- CreateIndex
CREATE INDEX "Record_organizationId_objectDefId_ownerId_idx" ON "Record"("organizationId", "objectDefId", "ownerId");

-- CreateIndex
CREATE INDEX "Record_organizationId_objectDefId_ownerQueueId_idx" ON "Record"("organizationId", "objectDefId", "ownerQueueId");

-- CreateIndex
CREATE INDEX "Record_organizationId_objectDefId_name_idx" ON "Record"("organizationId", "objectDefId", "name");

-- CreateIndex
CREATE INDEX "Record_organizationId_name_idx" ON "Record"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Record_backingUserId_idx" ON "Record"("backingUserId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_idx" ON "Notification"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_recordId_idx" ON "Notification"("recordId");

-- CreateIndex
CREATE INDEX "RecordComment_organizationId_recordId_createdAt_idx" ON "RecordComment"("organizationId", "recordId", "createdAt");

-- CreateIndex
CREATE INDEX "RecordComment_recordId_createdAt_idx" ON "RecordComment"("recordId", "createdAt");

-- CreateIndex
CREATE INDEX "RecordComment_authorId_idx" ON "RecordComment"("authorId");

-- CreateIndex
CREATE INDEX "RecordCommentMention_userId_idx" ON "RecordCommentMention"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordCommentMention_commentId_userId_key" ON "RecordCommentMention"("commentId", "userId");

-- CreateIndex
CREATE INDEX "FileAttachment_organizationId_recordId_idx" ON "FileAttachment"("organizationId", "recordId");

-- CreateIndex
CREATE INDEX "FileAttachment_recordId_fieldDefId_idx" ON "FileAttachment"("recordId", "fieldDefId");

-- CreateIndex
CREATE INDEX "FileAttachment_fieldDefId_idx" ON "FileAttachment"("fieldDefId");

-- CreateIndex
CREATE INDEX "FileAttachment_organizationId_idx" ON "FileAttachment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FileAttachment_recordId_fieldDefId_key" ON "FileAttachment"("recordId", "fieldDefId");

-- CreateIndex
CREATE INDEX "FieldData_recordId_idx" ON "FieldData"("recordId");

-- CreateIndex
CREATE INDEX "FieldData_fieldDefId_valueSearch_idx" ON "FieldData"("fieldDefId", "valueSearch");

-- CreateIndex
CREATE INDEX "FieldData_fieldDefId_valueNumber_idx" ON "FieldData"("fieldDefId", "valueNumber");

-- CreateIndex
CREATE INDEX "FieldData_fieldDefId_valueDate_idx" ON "FieldData"("fieldDefId", "valueDate");

-- CreateIndex
CREATE INDEX "FieldData_fieldDefId_valueLookup_idx" ON "FieldData"("fieldDefId", "valueLookup");

-- CreateIndex
CREATE INDEX "FieldData_fieldDefId_valuePicklistId_idx" ON "FieldData"("fieldDefId", "valuePicklistId");

-- CreateIndex
CREATE INDEX "FieldData_valuePicklistId_idx" ON "FieldData"("valuePicklistId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldData_recordId_fieldDefId_key" ON "FieldData"("recordId", "fieldDefId");

-- CreateIndex
CREATE INDEX "FieldHistory_organizationId_recordId_changedAt_idx" ON "FieldHistory"("organizationId", "recordId", "changedAt");

-- CreateIndex
CREATE INDEX "FieldHistory_recordId_changedAt_idx" ON "FieldHistory"("recordId", "changedAt");

-- CreateIndex
CREATE INDEX "FieldHistory_fieldDefId_changedAt_idx" ON "FieldHistory"("fieldDefId", "changedAt");

-- CreateIndex
CREATE INDEX "FieldHistory_objectDefId_changedAt_idx" ON "FieldHistory"("objectDefId", "changedAt");

-- CreateIndex
CREATE INDEX "RecordOwnerHistory_organizationId_recordId_changedAt_idx" ON "RecordOwnerHistory"("organizationId", "recordId", "changedAt");

-- CreateIndex
CREATE INDEX "RecordOwnerHistory_recordId_changedAt_idx" ON "RecordOwnerHistory"("recordId", "changedAt");

-- CreateIndex
CREATE INDEX "RecordOwnerHistory_objectDefId_changedAt_idx" ON "RecordOwnerHistory"("objectDefId", "changedAt");

-- CreateIndex
CREATE INDEX "RecordPageLayout_organizationId_objectDefId_idx" ON "RecordPageLayout"("organizationId", "objectDefId");

-- CreateIndex
CREATE INDEX "RecordPageLayout_objectDefId_isDefault_idx" ON "RecordPageLayout"("objectDefId", "isDefault");

-- CreateIndex
CREATE INDEX "RecordPageAssignment_organizationId_objectDefId_appId_idx" ON "RecordPageAssignment"("organizationId", "objectDefId", "appId");

-- CreateIndex
CREATE INDEX "RecordPageAssignment_layoutId_idx" ON "RecordPageAssignment"("layoutId");

-- CreateIndex
CREATE INDEX "RecordPageAssignment_permissionSetId_idx" ON "RecordPageAssignment"("permissionSetId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordPageAssignment_objectDefId_appId_permissionSetId_key" ON "RecordPageAssignment"("objectDefId", "appId", "permissionSetId");

-- CreateIndex
CREATE INDEX "ListView_organizationId_objectDefId_idx" ON "ListView"("organizationId", "objectDefId");

-- CreateIndex
CREATE UNIQUE INDEX "ListView_organizationId_objectDefId_name_key" ON "ListView"("organizationId", "objectDefId", "name");

-- CreateIndex
CREATE INDEX "ListViewColumn_listViewId_sortOrder_idx" ON "ListViewColumn"("listViewId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ListViewColumn_listViewId_fieldDefId_key" ON "ListViewColumn"("listViewId", "fieldDefId");

-- CreateIndex
CREATE INDEX "ListViewShare_principalType_principalId_idx" ON "ListViewShare"("principalType", "principalId");

-- CreateIndex
CREATE INDEX "ListViewShare_organizationId_principalType_principalId_idx" ON "ListViewShare"("organizationId", "principalType", "principalId");

-- CreateIndex
CREATE UNIQUE INDEX "ListViewShare_listViewId_principalType_principalId_key" ON "ListViewShare"("listViewId", "principalType", "principalId");

-- CreateIndex
CREATE INDEX "UserListViewPreference_organizationId_idx" ON "UserListViewPreference"("organizationId");

-- CreateIndex
CREATE INDEX "UserListViewPreference_objectDefId_idx" ON "UserListViewPreference"("objectDefId");

-- CreateIndex
CREATE UNIQUE INDEX "UserListViewPreference_userId_objectDefId_key" ON "UserListViewPreference"("userId", "objectDefId");

-- CreateIndex
CREATE INDEX "ListViewPin_organizationId_idx" ON "ListViewPin"("organizationId");

-- CreateIndex
CREATE INDEX "ListViewPin_userId_idx" ON "ListViewPin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ListViewPin_userId_listViewId_key" ON "ListViewPin"("userId", "listViewId");

-- CreateIndex
CREATE INDEX "ValidationRule_objectDefId_idx" ON "ValidationRule"("objectDefId");

-- CreateIndex
CREATE INDEX "ValidationRule_errorFieldId_idx" ON "ValidationRule"("errorFieldId");

-- CreateIndex
CREATE INDEX "ValidationCondition_ruleId_idx" ON "ValidationCondition"("ruleId");

-- CreateIndex
CREATE INDEX "ValidationCondition_fieldDefId_idx" ON "ValidationCondition"("fieldDefId");

-- CreateIndex
CREATE INDEX "ValidationCondition_compareFieldId_idx" ON "ValidationCondition"("compareFieldId");

-- CreateIndex
CREATE INDEX "ValidationCondition_permissionSetId_idx" ON "ValidationCondition"("permissionSetId");

-- CreateIndex
CREATE INDEX "DuplicateRule_organizationId_objectDefId_idx" ON "DuplicateRule"("organizationId", "objectDefId");

-- CreateIndex
CREATE INDEX "DuplicateRule_objectDefId_sortOrder_idx" ON "DuplicateRule"("objectDefId", "sortOrder");

-- CreateIndex
CREATE INDEX "DuplicateRuleCondition_ruleId_sortOrder_idx" ON "DuplicateRuleCondition"("ruleId", "sortOrder");

-- CreateIndex
CREATE INDEX "DuplicateRuleCondition_fieldDefId_idx" ON "DuplicateRuleCondition"("fieldDefId");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateRuleCondition_ruleId_fieldDefId_key" ON "DuplicateRuleCondition"("ruleId", "fieldDefId");

-- CreateIndex
CREATE INDEX "MetadataDependency_organizationId_objectDefId_idx" ON "MetadataDependency"("organizationId", "objectDefId");

-- CreateIndex
CREATE INDEX "MetadataDependency_organizationId_fieldDefId_idx" ON "MetadataDependency"("organizationId", "fieldDefId");

-- CreateIndex
CREATE INDEX "MetadataDependency_organizationId_sourceType_sourceId_idx" ON "MetadataDependency"("organizationId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AppDefinition_organizationId_apiName_idx" ON "AppDefinition"("organizationId", "apiName");

-- CreateIndex
CREATE UNIQUE INDEX "AppDefinition_organizationId_name_key" ON "AppDefinition"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AppDefinition_organizationId_apiName_key" ON "AppDefinition"("organizationId", "apiName");

-- CreateIndex
CREATE INDEX "DashboardWidget_appId_sortOrder_idx" ON "DashboardWidget"("appId", "sortOrder");

-- CreateIndex
CREATE INDEX "DashboardWidget_objectDefId_idx" ON "DashboardWidget"("objectDefId");

-- CreateIndex
CREATE INDEX "AppNavItem_appId_sortOrder_idx" ON "AppNavItem"("appId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSet" ADD CONSTRAINT "PermissionSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetGroup" ADD CONSTRAINT "PermissionSetGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetGroupAssignment" ADD CONSTRAINT "PermissionSetGroupAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetGroupAssignment" ADD CONSTRAINT "PermissionSetGroupAssignment_permissionSetGroupId_fkey" FOREIGN KEY ("permissionSetGroupId") REFERENCES "PermissionSetGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetGroupMember" ADD CONSTRAINT "PermissionSetGroupMember_permissionSetGroupId_fkey" FOREIGN KEY ("permissionSetGroupId") REFERENCES "PermissionSetGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetGroupMember" ADD CONSTRAINT "PermissionSetGroupMember_permissionSetId_fkey" FOREIGN KEY ("permissionSetId") REFERENCES "PermissionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetAssignment" ADD CONSTRAINT "PermissionSetAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetAssignment" ADD CONSTRAINT "PermissionSetAssignment_permissionSetId_fkey" FOREIGN KEY ("permissionSetId") REFERENCES "PermissionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetAssignmentSource" ADD CONSTRAINT "PermissionSetAssignmentSource_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PermissionSetAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSetAssignmentSource" ADD CONSTRAINT "PermissionSetAssignmentSource_permissionSetGroupId_fkey" FOREIGN KEY ("permissionSetGroupId") REFERENCES "PermissionSetGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectPermission" ADD CONSTRAINT "ObjectPermission_permissionSetId_fkey" FOREIGN KEY ("permissionSetId") REFERENCES "PermissionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectPermission" ADD CONSTRAINT "ObjectPermission_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppPermission" ADD CONSTRAINT "AppPermission_permissionSetId_fkey" FOREIGN KEY ("permissionSetId") REFERENCES "PermissionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppPermission" ADD CONSTRAINT "AppPermission_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueMember" ADD CONSTRAINT "QueueMember_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueMember" ADD CONSTRAINT "QueueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordShare" ADD CONSTRAINT "RecordShare_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordShare" ADD CONSTRAINT "RecordShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_targetQueueId_fkey" FOREIGN KEY ("targetQueueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharingRule" ADD CONSTRAINT "SharingRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharingRule" ADD CONSTRAINT "SharingRule_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharingRule" ADD CONSTRAINT "SharingRule_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectDefinition" ADD CONSTRAINT "ObjectDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDefinition" ADD CONSTRAINT "FieldDefinition_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PicklistOption" ADD CONSTRAINT "PicklistOption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PicklistOption" ADD CONSTRAINT "PicklistOption_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "FieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_ownerQueueId_fkey" FOREIGN KEY ("ownerQueueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_backingUserId_fkey" FOREIGN KEY ("backingUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordComment" ADD CONSTRAINT "RecordComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordComment" ADD CONSTRAINT "RecordComment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordComment" ADD CONSTRAINT "RecordComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordCommentMention" ADD CONSTRAINT "RecordCommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "RecordComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordCommentMention" ADD CONSTRAINT "RecordCommentMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "FieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldData" ADD CONSTRAINT "FieldData_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldData" ADD CONSTRAINT "FieldData_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "FieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldData" ADD CONSTRAINT "FieldData_valuePicklistId_fkey" FOREIGN KEY ("valuePicklistId") REFERENCES "PicklistOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldHistory" ADD CONSTRAINT "FieldHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldHistory" ADD CONSTRAINT "FieldHistory_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldHistory" ADD CONSTRAINT "FieldHistory_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldHistory" ADD CONSTRAINT "FieldHistory_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "FieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldHistory" ADD CONSTRAINT "FieldHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordOwnerHistory" ADD CONSTRAINT "RecordOwnerHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordOwnerHistory" ADD CONSTRAINT "RecordOwnerHistory_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordOwnerHistory" ADD CONSTRAINT "RecordOwnerHistory_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordOwnerHistory" ADD CONSTRAINT "RecordOwnerHistory_oldOwnerId_fkey" FOREIGN KEY ("oldOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordOwnerHistory" ADD CONSTRAINT "RecordOwnerHistory_oldOwnerQueueId_fkey" FOREIGN KEY ("oldOwnerQueueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordOwnerHistory" ADD CONSTRAINT "RecordOwnerHistory_newOwnerId_fkey" FOREIGN KEY ("newOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordOwnerHistory" ADD CONSTRAINT "RecordOwnerHistory_newOwnerQueueId_fkey" FOREIGN KEY ("newOwnerQueueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordOwnerHistory" ADD CONSTRAINT "RecordOwnerHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordPageLayout" ADD CONSTRAINT "RecordPageLayout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordPageLayout" ADD CONSTRAINT "RecordPageLayout_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordPageAssignment" ADD CONSTRAINT "RecordPageAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordPageAssignment" ADD CONSTRAINT "RecordPageAssignment_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordPageAssignment" ADD CONSTRAINT "RecordPageAssignment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordPageAssignment" ADD CONSTRAINT "RecordPageAssignment_permissionSetId_fkey" FOREIGN KEY ("permissionSetId") REFERENCES "PermissionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordPageAssignment" ADD CONSTRAINT "RecordPageAssignment_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "RecordPageLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListView" ADD CONSTRAINT "ListView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListView" ADD CONSTRAINT "ListView_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListView" ADD CONSTRAINT "ListView_kanbanGroupByFieldDefId_fkey" FOREIGN KEY ("kanbanGroupByFieldDefId") REFERENCES "FieldDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListViewColumn" ADD CONSTRAINT "ListViewColumn_listViewId_fkey" FOREIGN KEY ("listViewId") REFERENCES "ListView"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListViewColumn" ADD CONSTRAINT "ListViewColumn_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "FieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListViewShare" ADD CONSTRAINT "ListViewShare_listViewId_fkey" FOREIGN KEY ("listViewId") REFERENCES "ListView"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListViewShare" ADD CONSTRAINT "ListViewShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListViewPreference" ADD CONSTRAINT "UserListViewPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListViewPreference" ADD CONSTRAINT "UserListViewPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListViewPreference" ADD CONSTRAINT "UserListViewPreference_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListViewPreference" ADD CONSTRAINT "UserListViewPreference_defaultListViewId_fkey" FOREIGN KEY ("defaultListViewId") REFERENCES "ListView"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListViewPin" ADD CONSTRAINT "ListViewPin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListViewPin" ADD CONSTRAINT "ListViewPin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListViewPin" ADD CONSTRAINT "ListViewPin_listViewId_fkey" FOREIGN KEY ("listViewId") REFERENCES "ListView"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationRule" ADD CONSTRAINT "ValidationRule_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationRule" ADD CONSTRAINT "ValidationRule_errorFieldId_fkey" FOREIGN KEY ("errorFieldId") REFERENCES "FieldDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCondition" ADD CONSTRAINT "ValidationCondition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ValidationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCondition" ADD CONSTRAINT "ValidationCondition_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "FieldDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCondition" ADD CONSTRAINT "ValidationCondition_compareFieldId_fkey" FOREIGN KEY ("compareFieldId") REFERENCES "FieldDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCondition" ADD CONSTRAINT "ValidationCondition_permissionSetId_fkey" FOREIGN KEY ("permissionSetId") REFERENCES "PermissionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateRule" ADD CONSTRAINT "DuplicateRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateRule" ADD CONSTRAINT "DuplicateRule_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateRuleCondition" ADD CONSTRAINT "DuplicateRuleCondition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "DuplicateRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateRuleCondition" ADD CONSTRAINT "DuplicateRuleCondition_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "FieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataDependency" ADD CONSTRAINT "MetadataDependency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppDefinition" ADD CONSTRAINT "AppDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNavItem" ADD CONSTRAINT "AppNavItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNavItem" ADD CONSTRAINT "AppNavItem_objectDefId_fkey" FOREIGN KEY ("objectDefId") REFERENCES "ObjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
