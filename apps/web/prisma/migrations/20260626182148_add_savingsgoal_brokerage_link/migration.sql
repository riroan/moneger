-- AlterTable
ALTER TABLE `BrokerageAccount` ADD COLUMN `savingsGoalId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `BrokerageAccount_savingsGoalId_idx` ON `BrokerageAccount`(`savingsGoalId`);

-- AddForeignKey
ALTER TABLE `BrokerageAccount` ADD CONSTRAINT `BrokerageAccount_savingsGoalId_fkey` FOREIGN KEY (`savingsGoalId`) REFERENCES `SavingsGoal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
