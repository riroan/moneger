ALTER TABLE `Category`
  ADD COLUMN `categoryGroup` ENUM('SPENDING', 'ASSET_FORMATION') NOT NULL DEFAULT 'SPENDING' AFTER `defaultBudget`;

UPDATE `Category`
SET `categoryGroup` = 'ASSET_FORMATION',
    `defaultBudget` = NULL
WHERE `type` = 'EXPENSE'
  AND `name` = '저축';

INSERT INTO `Category` (`id`, `name`, `type`, `color`, `icon`, `defaultBudget`, `categoryGroup`, `userId`, `createdAt`, `updatedAt`)
SELECT
  UUID(),
  '투자 납입',
  'EXPENSE',
  '#8B5CF6',
  'chart',
  NULL,
  'ASSET_FORMATION',
  `User`.`id`,
  NOW(3),
  NOW(3)
FROM `User`
WHERE NOT EXISTS (
  SELECT 1
  FROM `Category`
  WHERE `Category`.`userId` = `User`.`id`
    AND `Category`.`name` = '투자 납입'
    AND `Category`.`type` = 'EXPENSE'
);
