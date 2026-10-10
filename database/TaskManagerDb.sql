/* =====================================================================================
   TASK MANAGEMENT SYSTEM - MS SQL Server database script
   ------------------------------------------------------------------------------------
   Target   : SQL Server 2016 or later (tested on SQL Server 2019 Developer Edition)
   Database : TaskManagerDb

   HOW TO IMPORT
     Option A (SSMS)   : open this file and press Execute (F5)
     Option B (cmd)    : sqlcmd -S localhost -E -i TaskManagerDb.sql
     Option C (PS)     : Invoke-Sqlcmd -InputFile TaskManagerDb.sql -ServerInstance localhost

   The script is idempotent: objects are only created when missing and seed rows are
   only inserted when the table is empty, so it is safe to run more than once.
   It never drops an existing database or deletes data.

   ENUM CONVENTIONS (stored as TINYINT, mirrored by C# enums)
     Users.Role          0 = User, 1 = Admin
     Tasks.Status        0 = NotStarted, 1 = InProgress, 2 = UnderReview,
                         3 = Completed, 4 = Blocked, 5 = Cancelled
     Tasks.Priority      0 = Low, 1 = Medium, 2 = High, 3 = Urgent
   ===================================================================================== */

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* --------------------------------------------------------------- 1. Database */
IF DB_ID(N'TaskManagerDb') IS NULL
BEGIN
    PRINT 'Creating database [TaskManagerDb]...';
    CREATE DATABASE [TaskManagerDb];
END
ELSE
    PRINT 'Database [TaskManagerDb] already exists.';
GO

USE [TaskManagerDb];
GO

/* ---------------------------------------------------------------- 2. Tables */

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    PRINT 'Creating table dbo.Users';
    CREATE TABLE dbo.[Users]
    (
        Id            INT             IDENTITY(1,1)   NOT NULL,
        UserName      NVARCHAR(50)                    NOT NULL,
        Email         NVARCHAR(256)                   NOT NULL,
        PasswordHash  NVARCHAR(500)                   NOT NULL,
        FullName      NVARCHAR(150)                   NOT NULL,
        [Role]        TINYINT                         NOT NULL CONSTRAINT DF_Users_Role     DEFAULT (0),
        IsActive      BIT                             NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        CreatedAt     DATETIME2(0)                    NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt     DATETIME2(0)                    NULL,
        CONSTRAINT PK_Users        PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Users_Name   UNIQUE (UserName),
        CONSTRAINT UQ_Users_Email  UNIQUE (Email),
        CONSTRAINT CK_Users_Role   CHECK ([Role] IN (0, 1)),
        CONSTRAINT CK_Users_Email  CHECK (Email LIKE '%_@_%.__%')
    );
END
GO

IF OBJECT_ID(N'dbo.Projects', N'U') IS NULL
BEGIN
    PRINT 'Creating table dbo.Projects';
    CREATE TABLE dbo.Projects
    (
        Id          INT             IDENTITY(1,1)   NOT NULL,
        Name        NVARCHAR(120)                   NOT NULL,
        Description NVARCHAR(1000)                  NULL,
        Color       NVARCHAR(9)                     NOT NULL CONSTRAINT DF_Projects_Color DEFAULT ('#3B82F6'),
        OwnerId     INT                             NOT NULL,
        IsArchived  BIT                             NOT NULL CONSTRAINT DF_Projects_IsArchived DEFAULT (0),
        CreatedAt   DATETIME2(0)                    NOT NULL CONSTRAINT DF_Projects_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt   DATETIME2(0)                    NULL,
        CONSTRAINT PK_Projects           PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Projects_OwnerName UNIQUE (OwnerId, Name),
        CONSTRAINT FK_Projects_Users     FOREIGN KEY (OwnerId) REFERENCES dbo.[Users](Id),
        CONSTRAINT CK_Projects_Color     CHECK (Color LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
    );

    CREATE INDEX IX_Projects_OwnerId ON dbo.Projects (OwnerId);
END
GO

IF OBJECT_ID(N'dbo.Tasks', N'U') IS NULL
BEGIN
    PRINT 'Creating table dbo.Tasks';
    CREATE TABLE dbo.Tasks
    (
        Id          INT             IDENTITY(1,1)   NOT NULL,
        Title       NVARCHAR(200)                   NOT NULL,
        Description NVARCHAR(MAX)                   NULL,
        [Status]    TINYINT                         NOT NULL CONSTRAINT DF_Tasks_Status   DEFAULT (0),
        Priority    TINYINT                         NOT NULL CONSTRAINT DF_Tasks_Priority DEFAULT (1),
        DueDate     DATETIME2(0)                    NULL,
        CompletedAt DATETIME2(0)                    NULL,
        ProjectId   INT                             NULL,
        AssigneeId  INT                             NULL,
        CreatedById INT                             NOT NULL,
        CreatedAt   DATETIME2(0)                    NOT NULL CONSTRAINT DF_Tasks_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt   DATETIME2(0)                    NULL,
        CONSTRAINT PK_Tasks            PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Tasks_Projects   FOREIGN KEY (ProjectId)  REFERENCES dbo.Projects (Id) ON DELETE SET NULL,
        CONSTRAINT FK_Tasks_Assignee   FOREIGN KEY (AssigneeId) REFERENCES dbo.[Users]  (Id),
        CONSTRAINT FK_Tasks_Creator    FOREIGN KEY (CreatedById) REFERENCES dbo.[Users] (Id),
        CONSTRAINT CK_Tasks_Status     CHECK ([Status] BETWEEN 0 AND 5),
        CONSTRAINT CK_Tasks_Priority   CHECK (Priority  BETWEEN 0 AND 3)
    );

    CREATE INDEX IX_Tasks_ProjectId   ON dbo.Tasks (ProjectId);
    CREATE INDEX IX_Tasks_AssigneeId  ON dbo.Tasks (AssigneeId);
    CREATE INDEX IX_Tasks_CreatedById ON dbo.Tasks (CreatedById);
    CREATE INDEX IX_Tasks_Status      ON dbo.Tasks ([Status]);
    CREATE INDEX IX_Tasks_DueDate     ON dbo.Tasks (DueDate);
END
GO

IF OBJECT_ID(N'dbo.Comments', N'U') IS NULL
BEGIN
    PRINT 'Creating table dbo.Comments';
    CREATE TABLE dbo.Comments
    (
        Id        INT             IDENTITY(1,1)   NOT NULL,
        TaskId    INT                             NOT NULL,
        AuthorId  INT                             NOT NULL,
        Body      NVARCHAR(2000)                  NOT NULL,
        CreatedAt DATETIME2(0)                    NOT NULL CONSTRAINT DF_Comments_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0)                    NULL,
        CONSTRAINT PK_Comments         PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Comments_Tasks   FOREIGN KEY (TaskId)   REFERENCES dbo.Tasks  (Id) ON DELETE CASCADE,
        CONSTRAINT FK_Comments_Users   FOREIGN KEY (AuthorId) REFERENCES dbo.[Users](Id),
        CONSTRAINT CK_Comments_Body    CHECK (LEN(Body) > 0)
    );

    CREATE INDEX IX_Comments_TaskId   ON dbo.Comments (TaskId);
    CREATE INDEX IX_Comments_AuthorId ON dbo.Comments (AuthorId);
END
GO

IF OBJECT_ID(N'dbo.Attachments', N'U') IS NULL
BEGIN
    PRINT 'Creating table dbo.Attachments';
    CREATE TABLE dbo.Attachments
    (
        Id             INT             IDENTITY(1,1)   NOT NULL,
        TaskId         INT                             NOT NULL,
        UploadedById   INT                             NOT NULL,
        FileName       NVARCHAR(260)                   NOT NULL,
        StoredFileName NVARCHAR(300)                   NOT NULL,
        ContentType    NVARCHAR(150)                   NOT NULL,
        SizeBytes      BIGINT                          NOT NULL,
        CreatedAt      DATETIME2(0)                    NOT NULL CONSTRAINT DF_Attachments_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Attachments         PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Attachments_Stored  UNIQUE (StoredFileName),
        CONSTRAINT FK_Attachments_Tasks   FOREIGN KEY (TaskId)       REFERENCES dbo.Tasks  (Id) ON DELETE CASCADE,
        CONSTRAINT FK_Attachments_Users   FOREIGN KEY (UploadedById) REFERENCES dbo.[Users](Id),
        CONSTRAINT CK_Attachments_Size    CHECK (SizeBytes >= 0)
    );

    CREATE INDEX IX_Attachments_TaskId ON dbo.Attachments (TaskId);
END
GO

/* -------------------------------------------------------------- 3. Seed data */

/* Passwords for the seeded accounts (ASP.NET Core Identity V3 hashes:
     format marker 0x01, PBKDF2-HMACSHA256, 10 000 iterations, 128-bit salt):
     admin@taskmanager.local  ->  Admin@123
     sarah@taskmanager.local  ->  User@123
     james@taskmanager.local  ->  User@123
     priya@taskmanager.local  ->  User@123                                                     */

IF NOT EXISTS (SELECT 1 FROM dbo.[Users])
BEGIN
    PRINT 'Seeding dbo.Users';
    SET IDENTITY_INSERT dbo.[Users] ON;

    INSERT INTO dbo.[Users] (Id, UserName, Email, PasswordHash, FullName, [Role], IsActive, CreatedAt)
    VALUES
      (1, N'admin', N'admin@taskmanager.local',
       N'AQAAAAEAACcQAAAAEIzFPx8BghPCoVK/hhZEZE37zcDZu+HHVuhyIw3bV2Pp/gdeg9aNQJKlezby8uNhUg==',
       N'System Administrator', 1, 1, DATEADD(DAY, -60, SYSUTCDATETIME())),
      (2, N'sarah', N'sarah@taskmanager.local',
       N'AQAAAAEAACcQAAAAEFVibAv2l16nJdXvWyIJE/SMMcCNiWUQqbDaOQ13delo8ZP+yX9w4DgwBzVqauyvKg==',
       N'Sarah Connor', 0, 1, DATEADD(DAY, -55, SYSUTCDATETIME())),
      (3, N'james', N'james@taskmanager.local',
       N'AQAAAAEAACcQAAAAEFVibAv2l16nJdXvWyIJE/SMMcCNiWUQqbDaOQ13delo8ZP+yX9w4DgwBzVqauyvKg==',
       N'James Holden', 0, 1, DATEADD(DAY, -50, SYSUTCDATETIME())),
      (4, N'priya', N'priya@taskmanager.local',
       N'AQAAAAEAACcQAAAAEFVibAv2l16nJdXvWyIJE/SMMcCNiWUQqbDaOQ13delo8ZP+yX9w4DgwBzVqauyvKg==',
       N'Priya Raman', 0, 1, DATEADD(DAY, -45, SYSUTCDATETIME()));

    SET IDENTITY_INSERT dbo.[Users] OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Projects)
BEGIN
    PRINT 'Seeding dbo.Projects';
    SET IDENTITY_INSERT dbo.Projects ON;

    INSERT INTO dbo.Projects (Id, Name, Description, Color, OwnerId, IsArchived, CreatedAt)
    VALUES
      (1, N'Website Redesign',  N'Rebuild of the public marketing website.',            N'#3B82F6', 1, 0, DATEADD(DAY, -40, SYSUTCDATETIME())),
      (2, N'Mobile App',        N'Cross platform companion app for iOS and Android.',   N'#8B5CF6', 2, 0, DATEADD(DAY, -35, SYSUTCDATETIME())),
      (3, N'Internal Tooling',  N'Automation and admin utilities for the ops team.',    N'#10B981', 3, 0, DATEADD(DAY, -30, SYSUTCDATETIME())),
      (4, N'Q3 Marketing Push', N'Campaign planning and content production for Q3.',    N'#F59E0B', 1, 1, DATEADD(DAY, -90, SYSUTCDATETIME()));

    SET IDENTITY_INSERT dbo.Projects OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Tasks)
BEGIN
    PRINT 'Seeding dbo.Tasks';
    SET IDENTITY_INSERT dbo.Tasks ON;

    INSERT INTO dbo.Tasks (Id, Title, Description, [Status], Priority, DueDate, CompletedAt, ProjectId, AssigneeId, CreatedById, CreatedAt)
    VALUES
      (1,  N'Design new landing page',      N'Wireframes and high fidelity mockups for the home page hero, features and pricing sections.', 1, 2, DATEADD(DAY,  4, CAST(SYSUTCDATETIME() AS DATE)), NULL, 1, 2, 1, DATEADD(DAY, -20, SYSUTCDATETIME())),
      (2,  N'Implement authentication API', N'JWT issuing, refresh and role based authorisation endpoints.',                                3, 3, DATEADD(DAY, -6, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, -7, SYSUTCDATETIME()), 1, 3, 1, DATEADD(DAY, -25, SYSUTCDATETIME())),
      (3,  N'Write integration tests',      N'Cover the auth and task endpoints with end to end tests.',                                    1, 1, DATEADD(DAY,  9, CAST(SYSUTCDATETIME() AS DATE)), NULL, 1, 4, 3, DATEADD(DAY, -12, SYSUTCDATETIME())),
      (4,  N'Setup CI pipeline',            N'Build, test and publish on every pull request.',                                              3, 2, DATEADD(DAY, -2, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, -3, SYSUTCDATETIME()), 3, 3, 1, DATEADD(DAY, -30, SYSUTCDATETIME())),
      (5,  N'Mobile onboarding flow',       N'Three screen onboarding with skip option and permission prompts.',                            0, 2, DATEADD(DAY, 14, CAST(SYSUTCDATETIME() AS DATE)), NULL, 2, 2, 2, DATEADD(DAY, -8, SYSUTCDATETIME())),
      (6,  N'Push notification service',    N'FCM and APNs integration with topic based delivery.',                                         4, 3, DATEADD(DAY, -1, CAST(SYSUTCDATETIME() AS DATE)), NULL, 2, 3, 2, DATEADD(DAY, -15, SYSUTCDATETIME())),
      (7,  N'Offline cache strategy',       N'Decide between SQLite and Realm for the offline queue.',                                      2, 1, DATEADD(DAY,  6, CAST(SYSUTCDATETIME() AS DATE)), NULL, 2, 4, 2, DATEADD(DAY, -5, SYSUTCDATETIME())),
      (8,  N'Database backup automation',   N'Nightly full backup plus hourly log shipping to blob storage.',                               3, 3, DATEADD(DAY, -9, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, -10, SYSUTCDATETIME()), 3, 3, 1, DATEADD(DAY, -40, SYSUTCDATETIME())),
      (9,  N'Refresh API documentation',    N'Regenerate Swagger docs and publish the internal API handbook.',                              1, 0, DATEADD(DAY, 21, CAST(SYSUTCDATETIME() AS DATE)), NULL, 3, 4, 1, DATEADD(DAY, -3, SYSUTCDATETIME())),
      (10, N'Performance profiling',        N'Profile the task list query, it degrades past ten thousand rows.',                            0, 2, DATEADD(DAY,  2, CAST(SYSUTCDATETIME() AS DATE)), NULL, 1, 3, 3, DATEADD(DAY, -1, SYSUTCDATETIME())),
      (11, N'Accessibility audit',          N'Run WCAG 2.1 AA checks across the redesigned pages.',                                         0, 1, DATEADD(DAY, 30, CAST(SYSUTCDATETIME() AS DATE)), NULL, 1, 2, 1, DATEADD(DAY, -2, SYSUTCDATETIME())),
      (12, N'Q3 campaign retrospective',    N'Summarise results and capture lessons learned.',                                              5, 0, DATEADD(DAY, -40, CAST(SYSUTCDATETIME() AS DATE)), NULL, 4, 4, 1, DATEADD(DAY, -70, SYSUTCDATETIME())),
      (13, N'Security headers hardening',   N'Add CSP, HSTS and frame options to the reverse proxy.',                                       1, 3, DATEADD(DAY,  1, CAST(SYSUTCDATETIME() AS DATE)), NULL, 3, 3, 1, DATEADD(DAY, -4, SYSUTCDATETIME())),
      (14, N'User feedback survey',         N'Draft and send the in-app satisfaction survey.',                                              2, 1, DATEADD(DAY, 11, CAST(SYSUTCDATETIME() AS DATE)), NULL, 2, 2, 4, DATEADD(DAY, -6, SYSUTCDATETIME()));

    SET IDENTITY_INSERT dbo.Tasks OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Comments)
BEGIN
    PRINT 'Seeding dbo.Comments';
    SET IDENTITY_INSERT dbo.Comments ON;

    INSERT INTO dbo.Comments (Id, TaskId, AuthorId, Body, CreatedAt)
    VALUES
      (1, 1,  2, N'First draft of the hero section is ready for review.',              DATEADD(DAY, -4, SYSUTCDATETIME())),
      (2, 1,  1, N'Looks good. Please tighten the spacing above the call to action.',  DATEADD(DAY, -3, SYSUTCDATETIME())),
      (3, 2,  3, N'Token issuing is merged, refresh tokens are still pending.',        DATEADD(DAY, -8, SYSUTCDATETIME())),
      (4, 6,  3, N'Blocked: waiting on the Apple push certificate from the ops team.', DATEADD(DAY, -2, SYSUTCDATETIME())),
      (5, 10, 3, N'The N+1 on assignee is the main cost, eager loading should fix it.',DATEADD(HOUR, -20, SYSUTCDATETIME()));

    SET IDENTITY_INSERT dbo.Comments OFF;
END
GO

/* ------------------------------------------------------------ 4. Summary */
PRINT '--------------------------------------------------------------------------------';
SELECT 'Users'       AS [Table], COUNT(*) AS [Rows] FROM dbo.[Users]
UNION ALL SELECT 'Projects',    COUNT(*) FROM dbo.Projects
UNION ALL SELECT 'Tasks',       COUNT(*) FROM dbo.Tasks
UNION ALL SELECT 'Comments',    COUNT(*) FROM dbo.Comments
UNION ALL SELECT 'Attachments', COUNT(*) FROM dbo.Attachments;
GO

PRINT 'TaskManagerDb is ready.';
GO
