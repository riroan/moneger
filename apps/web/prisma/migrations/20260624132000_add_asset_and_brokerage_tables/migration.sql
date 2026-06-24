-- CreateTable
CREATE TABLE `AssetItem` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `AssetItem_userId_deletedAt_idx`(`userId`, `deletedAt`),
    UNIQUE INDEX `AssetItem_userId_name_deletedAt_key`(`userId`, `name`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `assetItemId` VARCHAR(191) NOT NULL,
    `month` DATE NOT NULL,
    `amount` DOUBLE NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AssetSnapshot_userId_month_idx`(`userId`, `month`),
    UNIQUE INDEX `AssetSnapshot_assetItemId_month_key`(`assetItemId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrokerageConnection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `broker` ENUM('KIS', 'TOSS') NOT NULL,
    `label` VARCHAR(191) NULL,
    `ciphertext` LONGBLOB NOT NULL,
    `iv` LONGBLOB NOT NULL,
    `authTag` LONGBLOB NOT NULL,
    `keyVersion` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('ACTIVE', 'ERROR', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `lastSuccessAt` DATETIME(3) NULL,
    `lastFailureAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `BrokerageConnection_userId_deletedAt_idx`(`userId`, `deletedAt`),
    INDEX `BrokerageConnection_status_idx`(`status`),
    UNIQUE INDEX `BrokerageConnection_userId_broker_label_key`(`userId`, `broker`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrokerageAccount` (
    `id` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `externalAccountId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `accountType` VARCHAR(191) NOT NULL,
    `baseCurrency` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BrokerageAccount_connectionId_idx`(`connectionId`),
    UNIQUE INDEX `BrokerageAccount_connectionId_externalAccountId_key`(`connectionId`, `externalAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrokerageSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `cashKrw` DECIMAL(20, 2) NOT NULL,
    `totalEquityKrw` DECIMAL(20, 2) NOT NULL,
    `positionsValueKrw` DECIMAL(20, 2) NOT NULL,
    `asOf` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BrokerageSnapshot_accountId_date_idx`(`accountId`, `date`),
    UNIQUE INDEX `BrokerageSnapshot_accountId_date_key`(`accountId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrokeragePosition` (
    `id` VARCHAR(191) NOT NULL,
    `snapshotId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `market` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(28, 8) NOT NULL,
    `avgCost` DECIMAL(20, 4) NULL,
    `lastPrice` DECIMAL(20, 4) NULL,
    `marketValue` DECIMAL(20, 4) NOT NULL,
    `marketValueKrw` DECIMAL(20, 2) NOT NULL,
    `unrealizedPnl` DECIMAL(20, 4) NULL,
    `fxRateToKrw` DECIMAL(18, 6) NULL,

    INDEX `BrokeragePosition_snapshotId_idx`(`snapshotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AssetItem` ADD CONSTRAINT `AssetItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetSnapshot` ADD CONSTRAINT `AssetSnapshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetSnapshot` ADD CONSTRAINT `AssetSnapshot_assetItemId_fkey` FOREIGN KEY (`assetItemId`) REFERENCES `AssetItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrokerageConnection` ADD CONSTRAINT `BrokerageConnection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrokerageAccount` ADD CONSTRAINT `BrokerageAccount_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `BrokerageConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrokerageSnapshot` ADD CONSTRAINT `BrokerageSnapshot_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `BrokerageAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrokeragePosition` ADD CONSTRAINT `BrokeragePosition_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `BrokerageSnapshot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
