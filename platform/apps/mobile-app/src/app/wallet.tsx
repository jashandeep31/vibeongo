import { useGetWallet, useUserCreditGrants } from "@repo/api-hooks";
import { formatInternalMoney } from "@repo/shared/money";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { useTheme } from "@/hooks/use-theme";

const PAGE_LIMIT = 10;
type WalletTab = "transactions" | "credit-grants";

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function WalletScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const [activeTab, setActiveTab] = useState<WalletTab>("transactions");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [creditGrantsPage, setCreditGrantsPage] = useState(1);
  const walletQuery = useGetWallet({
    page: transactionsPage,
    limit: PAGE_LIMIT,
    transactions: true,
  });
  const creditGrantsQuery = useUserCreditGrants(
    { page: creditGrantsPage, limit: PAGE_LIMIT },
    activeTab === "credit-grants",
  );
  const wallet = walletQuery.data?.data.wallet;
  const transactions = walletQuery.data?.data.transactions ?? [];
  const grants = creditGrantsQuery.data?.grants.slice(0, PAGE_LIMIT) ?? [];
  const currentTransactionsPage = walletQuery.data?.page ?? transactionsPage;
  const currentCreditGrantsPage =
    creditGrantsQuery.data?.page ?? creditGrantsPage;
  const isRefreshing =
    activeTab === "transactions"
      ? walletQuery.isRefetching
      : creditGrantsQuery.isRefetching;

  const refresh = () => {
    if (activeTab === "transactions") void walletQuery.refetch();
    else void creditGrantsQuery.refetch();
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={() => router.back()}
            title="Wallet"
            titleOpacity={titleOpacity}
          />
        }
      >
        {({ topInset }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: topInset }]}
            onScroll={onTitleScroll}
            refreshControl={
              <RefreshControl
                onRefresh={refresh}
                refreshing={isRefreshing}
                tintColor={theme.textSecondary}
              />
            }
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            <View
              style={[
                styles.balanceCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <View style={styles.balanceLabelRow}>
                <SymbolView
                  name={{
                    ios: "wallet.bifold",
                    android: "account_balance_wallet",
                  }}
                  size={18}
                  tintColor={theme.textSecondary}
                />
                <ThemedText
                  style={styles.balanceLabel}
                  themeColor="textSecondary"
                >
                  Available balance
                </ThemedText>
              </View>
              {walletQuery.isPending ? (
                <ActivityIndicator
                  color={theme.textSecondary}
                  style={styles.balanceLoader}
                />
              ) : walletQuery.isError ? (
                <ThemedText style={styles.errorText}>
                  Failed to load wallet balance.
                </ThemedText>
              ) : (
                <View style={styles.balanceRow}>
                  <ThemedText
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={styles.balance}
                  >
                    ${formatInternalMoney(wallet?.balance ?? 0, 2)}
                  </ThemedText>
                  <ThemedText
                    style={styles.creditsLabel}
                    themeColor="textSecondary"
                  >
                    credits
                  </ThemedText>
                </View>
              )}
            </View>

            <View
              accessibilityRole="tablist"
              style={[
                styles.tabs,
                { borderBottomColor: theme.backgroundSelected },
              ]}
            >
              <WalletTabButton
                active={activeTab === "transactions"}
                label="Transactions"
                onPress={() => setActiveTab("transactions")}
              />
              <WalletTabButton
                active={activeTab === "credit-grants"}
                label="Credit grants"
                onPress={() => setActiveTab("credit-grants")}
              />
            </View>

            {activeTab === "transactions" ? (
              <>
                {walletQuery.isPending ? (
                  <LoadingRows />
                ) : walletQuery.isError ? (
                  <ErrorState
                    label="Failed to load transactions."
                    onRetry={() => void walletQuery.refetch()}
                  />
                ) : transactions.length ? (
                  <View style={styles.list}>
                    {transactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                      />
                    ))}
                  </View>
                ) : (
                  <EmptyState icon="card" label="No transactions found." />
                )}
                <PageControls
                  hasNext={walletQuery.data?.hasNext ?? false}
                  isLoading={walletQuery.isFetching}
                  onChange={setTransactionsPage}
                  page={currentTransactionsPage}
                />
              </>
            ) : (
              <>
                {creditGrantsQuery.isPending ? (
                  <LoadingRows />
                ) : creditGrantsQuery.isError ? (
                  <ErrorState
                    label="Failed to load credit grants."
                    onRetry={() => void creditGrantsQuery.refetch()}
                  />
                ) : grants.length ? (
                  <View style={styles.list}>
                    {grants.map((grant) => (
                      <CreditGrantRow grant={grant} key={grant.id} />
                    ))}
                  </View>
                ) : (
                  <EmptyState icon="gift" label="No credit grants found." />
                )}
                <PageControls
                  hasNext={creditGrantsQuery.data?.hasNext ?? false}
                  isLoading={creditGrantsQuery.isFetching}
                  onChange={setCreditGrantsPage}
                  page={currentCreditGrantsPage}
                />
              </>
            )}
          </ScrollView>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

function WalletTabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <ThemedText
        style={[styles.tabLabel, !active && { color: theme.textSecondary }]}
      >
        {label}
      </ThemedText>
      {active ? (
        <View style={[styles.tabIndicator, { backgroundColor: theme.text }]} />
      ) : null}
    </Pressable>
  );
}

type WalletTransaction = NonNullable<
  ReturnType<typeof useGetWallet>["data"]
>["data"]["transactions"][number];

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const theme = useTheme();
  const isDeposit = transaction.transaction_type === "deposit";
  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.rowTop}>
        <View
          style={[styles.badge, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText style={styles.badgeLabel}>
            {transaction.transaction_type}
          </ThemedText>
        </View>
        <ThemedText style={[styles.amount, isDeposit && styles.deposit]}>
          {isDeposit ? "+" : "−"}${formatInternalMoney(transaction.amount)}
        </ThemedText>
      </View>
      <ThemedText style={styles.description}>
        {transaction.description || "—"}
      </ThemedText>
      <ThemedText style={styles.date} themeColor="textSecondary">
        {formatDate(transaction.created_at)}
      </ThemedText>
    </View>
  );
}

type CreditGrant = NonNullable<
  ReturnType<typeof useUserCreditGrants>["data"]
>["grants"][number];

function CreditGrantRow({ grant }: { grant: CreditGrant }) {
  const theme = useTheme();
  const expired =
    grant.expired || new Date(grant.expires_at).getTime() <= Date.now();
  const status = expired ? "Expired" : grant.balance > 0 ? "Active" : "Used";
  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.rowTop}>
        <ThemedText numberOfLines={2} style={styles.grantDescription}>
          {grant.description || "—"}
        </ThemedText>
        <View
          style={[styles.badge, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText style={styles.badgeLabel}>{status}</ThemedText>
        </View>
      </View>
      <View style={styles.grantAmounts}>
        <Value
          label="Remaining"
          value={`$${formatInternalMoney(grant.balance)}`}
        />
        <Value
          label="Total"
          value={`$${formatInternalMoney(grant.total_balance)}`}
        />
      </View>
      <ThemedText style={styles.date} themeColor="textSecondary">
        Issued {formatDate(grant.created_at)}
      </ThemedText>
      <ThemedText style={styles.date} themeColor="textSecondary">
        Expires {formatDate(grant.expires_at)}
      </ThemedText>
    </View>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.value}>
      <ThemedText style={styles.valueLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.valueText}>{value}</ThemedText>
    </View>
  );
}

function PageControls({
  page,
  hasNext,
  isLoading,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  isLoading: boolean;
  onChange: (page: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.pagination}>
      <PageButton
        disabled={isLoading || page <= 1}
        direction="back"
        onPress={() => onChange(Math.max(1, page - 1))}
      />
      <ThemedText style={styles.pageLabel} themeColor="textSecondary">
        Page {page}
      </ThemedText>
      <PageButton
        disabled={isLoading || !hasNext}
        direction="forward"
        onPress={() => onChange(page + 1)}
      />
      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} size="small" />
      ) : null}
    </View>
  );
}

function PageButton({
  disabled,
  direction,
  onPress,
}: {
  disabled: boolean;
  direction: "back" | "forward";
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={`${direction === "back" ? "Previous" : "Next"} page`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pageButton,
        { borderColor: theme.backgroundSelected },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={
          direction === "back"
            ? { ios: "chevron.left", android: "chevron_left" }
            : { ios: "chevron.right", android: "chevron_right" }
        }
        size={18}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

function LoadingRows() {
  const theme = useTheme();
  return (
    <View style={styles.loadingRows}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.loadingRow,
            { backgroundColor: theme.backgroundElement },
          ]}
        />
      ))}
    </View>
  );
}

function ErrorState({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.state}>
      <ThemedText style={styles.errorText}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.retryLabel}>Try again</ThemedText>
      </Pressable>
    </View>
  );
}

function EmptyState({ icon, label }: { icon: "card" | "gift"; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.state}>
      <SymbolView
        name={
          icon === "gift"
            ? { ios: "gift", android: "redeem" }
            : { ios: "creditcard", android: "credit_card" }
        }
        size={28}
        tintColor={theme.textSecondary}
      />
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 58,
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  content: { paddingBottom: 30, paddingHorizontal: 20 },
  balanceCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 24,
    padding: 20,
  },
  balanceLabelRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  balanceLabel: { fontSize: 14 },
  balanceLoader: { alignSelf: "flex-start", marginVertical: 20 },
  balanceRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
  },
  balance: {
    flexShrink: 1,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1,
    lineHeight: 42,
  },
  creditsLabel: { fontSize: 14 },
  tabs: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 24,
    marginTop: 30,
  },
  tab: { paddingBottom: 12, paddingTop: 6, position: "relative" },
  tabLabel: { fontSize: 14, fontWeight: "600" },
  tabIndicator: {
    bottom: -1,
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
  },
  list: { marginTop: 4 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 7,
    paddingVertical: 17,
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  badgeLabel: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  amount: { fontSize: 14, fontWeight: "700" },
  deposit: { color: "#16a34a" },
  description: { fontSize: 14, lineHeight: 20 },
  grantDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  date: { fontSize: 12, lineHeight: 17 },
  grantAmounts: { flexDirection: "row", gap: 28, paddingVertical: 4 },
  value: { gap: 2 },
  valueLabel: { fontSize: 11, lineHeight: 15 },
  valueText: { fontSize: 13, fontWeight: "600" },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 20,
  },
  pageButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pageLabel: { fontSize: 13, minWidth: 56, textAlign: "center" },
  disabled: { opacity: 0.38 },
  loadingRows: { gap: 12, paddingTop: 18 },
  loadingRow: { borderRadius: 14, height: 104 },
  state: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    minHeight: 210,
  },
  errorText: { color: "#ef4444", fontSize: 14, marginTop: 10 },
  retryButton: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryLabel: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.68 },
});
