UPDATE `Category` AS c
LEFT JOIN `Category` AS existing
  ON existing.`userId` = c.`userId`
  AND existing.`type` = 'EXPENSE'
  AND existing.`name` = '저축 납입'
SET c.`name` = '저축 납입',
    c.`categoryGroup` = 'ASSET_FORMATION',
    c.`defaultBudget` = NULL
WHERE c.`type` = 'EXPENSE'
  AND c.`name` = '저축'
  AND existing.`id` IS NULL;

UPDATE `Category`
SET `categoryGroup` = 'ASSET_FORMATION',
    `defaultBudget` = NULL
WHERE `type` = 'EXPENSE'
  AND `name` IN ('저축', '저축 납입', '투자 납입');

INSERT INTO `Category` (`id`, `name`, `type`, `color`, `icon`, `defaultBudget`, `categoryGroup`, `userId`, `createdAt`, `updatedAt`)
SELECT
  UUID(),
  '저축 납입',
  'EXPENSE',
  '#06B6D4',
  'money',
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
    AND `Category`.`name` = '저축 납입'
    AND `Category`.`type` = 'EXPENSE'
);
