import {
  getFinanceLabel,
  SYSTEM_PURPOSE_LABELS,
  USER_ROLE_LABELS,
  WALLET_TYPE_LABELS,
} from "./financePresentation";

const getPartyName = (party) => {
  if (!party) return "—";
  if (party.username) return party.username;
  if (party.systemPurpose !== null && party.systemPurpose !== undefined) {
    return getFinanceLabel(SYSTEM_PURPOSE_LABELS, party.systemPurpose);
  }
  return getFinanceLabel(WALLET_TYPE_LABELS, party.walletType);
};

export default function FinancialPartyDisplay({ party, detailed = false }) {
  if (!party) return <span className="text-textLight">—</span>;

  const walletType = getFinanceLabel(WALLET_TYPE_LABELS, party.walletType);
  const role = party.role
    ? getFinanceLabel(USER_ROLE_LABELS, party.role)
    : "";
  const purpose =
    party.systemPurpose !== null && party.systemPurpose !== undefined
      ? getFinanceLabel(SYSTEM_PURPOSE_LABELS, party.systemPurpose)
      : "";

  return (
    <div>
      <p className="font-bold text-text">{getPartyName(party)}</p>
      <p className="mt-0.5 text-xs text-textLight">
        {[role, walletType, purpose].filter(Boolean).join(" · ")}
      </p>
      {detailed && party.userId && (
        <p className="mt-1 break-all font-mono text-[11px] text-textLight">
          {party.userId}
        </p>
      )}
    </div>
  );
}
