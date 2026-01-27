-- CreateIndex
CREATE INDEX "Category_userId_deletedAt_idx" ON "Category"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

-- CreateIndex
CREATE INDEX "Transaction_userId_deletedAt_date_idx" ON "Transaction"("userId", "deletedAt", "date");
