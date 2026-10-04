import {
  getFinanceLabel,
  PAYMENT_METHOD_LABELS,
  SYSTEM_PURPOSE_LABELS,
  USER_ROLE_LABELS,
  WALLET_TYPE_LABELS,
} from "./financePresentation";

const hasValue = (value) =>
  value !== null && value !== undefined && value !== "";

const getPartyName = (party) => {
  if (party.username) return party.username;
  if (hasValue(party.systemPurpose)) {
    return getFinanceLabel(SYSTEM_PURPOSE_LABELS, party.systemPurpose);
  }
  return getFinanceLabel(WALLET_TYPE_LABELS, party.walletType);
};

/*
 * Tiền từ PayOS không đi ra từ ví HomeCycle nào nên phía "Từ" có thể không có
 * walletId; khi đó hiển thị người trả kèm nguồn thanh toán thay vì "Chưa xác định".
 */
export default function FinancialPartyDisplay({
  party,
  detailed = false,
  externalSource,
}) {
  const sourceLabel = hasValue(externalSource)
    ? getFinanceLabel(PAYMENT_METHOD_LABELS, externalSource)
    : "";

  if (!party || (!party.username && !hasValue(party.systemPurpose) && !hasValue(party.walletType))) {
    return sourceLabel ? (
      <div>
        <p className="font-bold text-text">{sourceLabel}</p>
        <p className="mt-0.5 text-xs text-textLight">Nguồn bên ngoài</p>
      </div>
    ) : (
      <span className="text-textLight">—</span>
    );
  }

  const isExternalPayer = !hasValue(party.walletId) && sourceLabel;
  const walletType = hasValue(party.walletType)
    ? getFinanceLabel(WALLET_TYPE_LABELS, party.walletType)
    : "";
  const role = party.role
    ? getFinanceLabel(USER_ROLE_LABELS, party.role)
    : "";
  const purpose = hasValue(party.systemPurpose)
    ? getFinanceLabel(SYSTEM_PURPOSE_LABELS, party.systemPurpose)
    : "";

  return (
    <div>
      <p className="font-bold text-text">{getPartyName(party)}</p>
      <p className="mt-0.5 text-xs text-textLight">
        {(isExternalPayer
          ? [role, `Nguồn: ${sourceLabel}`]
          : [role, walletType, purpose]
        )
          .filter(Boolean)
          .join(" · ")}
      </p>
      {detailed && party.userId && (
        <p className="mt-1 break-all font-mono text-[11px] text-textLight">
          {party.userId}
        </p>
      )}
    </div>
  );
}
