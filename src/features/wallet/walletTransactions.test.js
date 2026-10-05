import assert from "node:assert/strict";
import test from "node:test";
import {
  getAmountSign,
  getBalanceTypeLabel,
  getImpactFlow,
  getTransactionStatusLabel,
  getTransactionTitle,
  getTransactionTypeInfo,
  isDirectionIn,
} from "./walletTransactions.js";

test("maps transaction types by name or number to the wallet flow", () => {
  assert.equal(getTransactionTypeInfo("Payout_Release").flow, "in");
  assert.equal(getTransactionTypeInfo(2).flow, "out");
  assert.equal(getTransactionTypeInfo("Withdrawal_Lock").flow, "lock");
  assert.equal(getTransactionTypeInfo("Something_New").flow, "none");
  assert.equal(getAmountSign("in"), "+");
  assert.equal(getAmountSign("lock"), "");
});

test("titles money that does not touch the wallet with the backend text", () => {
  assert.equal(
    getTransactionTitle({
      transactionType: "Escrow_Deposit",
      description: "Tạm giữ tiền - Đơn HC-1",
    }),
    "Tạm giữ tiền - Đơn HC-1",
  );
  assert.equal(
    getTransactionTitle({
      transactionType: "Payout_Release",
      description: "Nhận tiền giải ngân - Đơn HC-1",
    }),
    "Nhận tiền bán hàng",
  );
});

test("labels statuses, directions and balance types", () => {
  assert.equal(getTransactionStatusLabel("Completed"), "");
  assert.equal(getTransactionStatusLabel("Failed"), "Thất bại");
  assert.equal(isDirectionIn("In"), true);
  assert.equal(isDirectionIn(1), false);
  assert.equal(getBalanceTypeLabel("Hold"), "Tiền tạm giữ");
  assert.equal(getBalanceTypeLabel("Available"), "Số dư khả dụng");
});

test("impact flow follows the ledger entries on the user's wallet", () => {
  assert.equal(
    getImpactFlow([{ direction: "Out", amount: 50000, balanceType: "Hold" }]),
    "out",
  );
  assert.equal(
    getImpactFlow([
      { direction: "In", amount: 50000 },
      { direction: "Out", amount: 10000 },
    ]),
    "in",
  );
  assert.equal(getImpactFlow([]), "none");
});
