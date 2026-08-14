import React, { useState } from "react";

import { BrandTile } from "@/components/brand-tile";
import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { api, trpcClient } from "@/lib/trpc";

interface BankingRow {
  id: number;
  bankName: string;
  accountType: string | null;
  accountNumber: string | null;
  cardNumber: string | null;
  cvv: string | null;
  expiry: string | null;
  pin: string | null;
  accountHolder: string | null;
  branch: string | null;
  notes: string | null;
}

type BankingForm = {
  bankName: string;
  accountType: string;
  accountNumber: string;
  cardNumber: string;
  cvv: string;
  expiry: string;
  pin: string;
  accountHolder: string;
  branch: string;
  notes: string;
}

const FIELDS: FieldDef[] = [
  { name: "bankName", label: "Bank", type: "text", placeholder: "BDO", capitalize: true },
  {
    name: "accountType",
    label: "Account Type",
    type: "select",
    options: ["Checking", "Savings", "Credit", "Debit", "E-Wallet"],
    optional: true,
  },
  { name: "accountNumber", label: "Account Number", type: "text", optional: true },
  { name: "cardNumber", label: "Card Number", type: "text", placeholder: "•••• •••• ••••", optional: true },
  { name: "cvv", label: "CVV", type: "password", maxLength: 10, optional: true },
  { name: "expiry", label: "Expiry", type: "text", placeholder: "MM/YY", maxLength: 7, optional: true },
  { name: "pin", label: "PIN", type: "password", maxLength: 20, optional: true },
  { name: "accountHolder", label: "Account Holder", type: "text", optional: true },
  { name: "branch", label: "Branch", type: "text", optional: true },
  { name: "notes", label: "Notes", type: "multiline", optional: true },
];

const EMPTY: BankingForm = {
  bankName: "",
  accountType: "",
  accountNumber: "",
  cardNumber: "",
  cvv: "",
  expiry: "",
  pin: "",
  accountHolder: "",
  branch: "",
  notes: "",
};

export default function BankingScreen() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.banking.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.banking.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<BankingRow, BankingForm>
      title="Banking"
      subtitle={`${data?.total ?? 0} stored`}
      icon="card"
      hideTitle
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        bankName: item.bankName,
        accountType: item.accountType ?? "",
        accountNumber: item.accountNumber ?? "",
        cardNumber: item.cardNumber ?? "",
        cvv: item.cvv ?? "",
        expiry: item.expiry ?? "",
        pin: item.pin ?? "",
        accountHolder: item.accountHolder ?? "",
        branch: item.branch ?? "",
        notes: item.notes ?? "",
      })}
      rows={rows}
      isLoading={isLoading}
      isFetching={isFetching}
      canLoadMore={canLoadMore}
      onLoadMore={() => setPage((p) => (p < (data?.pages ?? 1) ? p + 1 : p))}
      onSearch={(v) => {
        setQ(v);
        setPage(1);
      }}
      onRefresh={() => refetch()}
      onAdd={async (form) => {
        await trpcClient.banking.create.mutate({
          bankName: form.bankName,
          accountType: form.accountType || null,
          accountNumber: form.accountNumber || null,
          cardNumber: form.cardNumber || null,
          cvv: form.cvv || null,
          expiry: form.expiry || null,
          pin: form.pin || null,
          accountHolder: form.accountHolder || null,
          branch: form.branch || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.banking.update.mutate({
          id,
          bankName: form.bankName,
          accountType: form.accountType || null,
          accountNumber: form.accountNumber || null,
          cardNumber: form.cardNumber || null,
          cvv: form.cvv || null,
          expiry: form.expiry || null,
          pin: form.pin || null,
          accountHolder: form.accountHolder || null,
          branch: form.branch || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.banking.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.bankName,
        subtitle: [item.accountType, item.accountNumber].filter(Boolean).join(" · "),
        right: item.accountNumber ? item.accountNumber.slice(-4).padStart(item.accountNumber.length, "•") : undefined,
        icon: "card",
      })}
      grid
      renderTile={(item) => (
        <BrandTile
          label={item.bankName}
          subtitle={item.accountType ?? undefined}
          match={`${item.bankName} ${item.accountType ?? ""}`}
        />
      )}
    />
  );
}
