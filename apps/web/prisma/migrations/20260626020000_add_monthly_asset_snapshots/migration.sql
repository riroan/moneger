-- CreateTable
CREATE TABLE `MonthlyAssetSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `month` DATE NOT NULL,
    `totalAssetKrw` DOUBLE NOT NULL,
    `cashKrw` DOUBLE NOT NULL,
    `investmentKrw` DOUBLE NOT NULL,
    `savingsKrw` DOUBLE NOT NULL,
    `otherKrw` DOUBLE NOT NULL DEFAULT 0,
    `cashRatio` DOUBLE NOT NULL,
    `investmentRatio` DOUBLE NOT NULL,
    `savingsRatio` DOUBLE NOT NULL,
    `otherRatio` DOUBLE NOT NULL DEFAULT 0,
    `monthlyIncomeKrw` DOUBLE NOT NULL,
    `monthlyExpenseKrw` DOUBLE NOT NULL,
    `monthlySavingsKrw` DOUBLE NOT NULL,
    `investmentPnlKrw` DOUBLE NOT NULL,
    `investmentChangeKrw` DOUBLE NULL,
    `sourceStatus` VARCHAR(191) NOT NULL DEFAULT 'computed',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MonthlyAssetSnapshot_userId_month_idx`(`userId`, `month`),
    UNIQUE INDEX `MonthlyAssetSnapshot_userId_month_key`(`userId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MonthlyAssetSnapshot` ADD CONSTRAINT `MonthlyAssetSnapshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
