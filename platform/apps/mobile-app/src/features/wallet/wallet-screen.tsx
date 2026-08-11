import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";
import { useToast } from "@/contexts/toast-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import {
  createCheckout,
  formatInternalMoney,
  getCreditGrants,
  getWallet,
  type CreditGrantPage,
  type WalletPage,
  type WalletTransaction,
} from "./wallet-api";

type WalletTab = "transactions" | "credit-grants";

export function WalletScreen() {
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<WalletTab>("transactions");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [creditGrantsPage, setCreditGrantsPage] = useState(1);
  const [wallet, setWallet] = useState<WalletPage | null>(null);
  const [creditGrants, setCreditGrants] = useState<CreditGrantPage | null>(
    null,
  );
  const [walletError, setWalletError] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [areGrantsLoading, setAreGrantsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [buyCreditsVisible, setBuyCreditsVisible] = useState(false);

  const loadWallet = useCallback(async (page: number, signal?: AbortSignal) => {
    setIsWalletLoading(true);
    setWalletError(null);
    try {
      setWallet(await getWallet(page, signal));
    } catch (error) {
      if (signal?.aborted) return;
      setWalletError(
        error instanceof Error ? error.message : "Failed to load wallet.",
      );
    } finally {
      if (!signal?.aborted) setIsWalletLoading(false);
    }
  }, []);

  const loadCreditGrants = useCallback(
    async (page: number, signal?: AbortSignal) => {
      setAreGrantsLoading(true);
      setGrantError(null);
      try {
        const result = await getCreditGrants(page, signal);
        setCreditGrants({ ...result, grants: result.grants.slice(0, 10) });
      } catch (error) {
        if (signal?.aborted) return;
        setGrantError(
          error instanceof Error
            ? error.message
            : "Failed to load credit grants.",
        );
      } finally {
        if (!signal?.aborted) setAreGrantsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadWallet(transactionsPage, controller.signal);
    return () => controller.abort();
  }, [loadWallet, transactionsPage]);

  useEffect(() => {
    if (activeTab !== "credit-grants") return;
    const controller = new AbortController();
    void loadCreditGrants(creditGrantsPage, controller.signal);
    return () => controller.abort();
  }, [activeTab, creditGrantsPage, loadCreditGrants]);

  const refresh = async () => {
    setIsRefreshing(true);
    const requests: Promise<void>[] = [loadWallet(transactionsPage)];
    if (activeTab === "credit-grants")
      requests.push(loadCreditGrants(creditGrantsPage));
    await Promise.all(requests);
    setIsRefreshing(false);
  };

  const refreshAfterCheckout = () => {
    if (transactionsPage !== 1) setTransactionsPage(1);
    else void loadWallet(1);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityLabel="Back to home"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            size={20}
            tintColor={colors.text}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Wallet</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={isRefreshing}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.titleBlock}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Wallet</Text>
          <Text
            style={[styles.pageDescription, { color: colors.textSecondary }]}
          >
            Track your credit balance and account activity.
          </Text>
        </View>

        <BalanceCard
          balance={wallet?.wallet?.balance}
          colors={colors}
          error={
            walletError && !wallet ? "Failed to load wallet balance." : null
          }
          isLoading={isWalletLoading && !wallet}
          onBuy={() => setBuyCreditsVisible(true)}
        />

        <View
          accessibilityRole="tablist"
          style={[styles.tabs, { borderBottomColor: colors.border }]}
        >
          <Tab
            colors={colors}
            label="Transactions"
            onPress={() => setActiveTab("transactions")}
            selected={activeTab === "transactions"}
          />
          <Tab
            colors={colors}
            label="Credit grants"
            onPress={() => setActiveTab("credit-grants")}
            selected={activeTab === "credit-grants"}
          />
        </View>

        {activeTab === "transactions" ? (
          <TransactionTable
            colors={colors}
            error={walletError}
            hasNext={wallet?.hasNext ?? false}
            isLoading={isWalletLoading}
            onPageChange={setTransactionsPage}
            onRetry={() => void loadWallet(transactionsPage)}
            page={wallet?.page ?? transactionsPage}
            transactions={wallet?.transactions ?? []}
          />
        ) : (
          <LedgerSection
            colors={colors}
            emptyDescription="Promotional and granted credits will appear here."
            emptyTitle="No credit grants found"
            error={grantError}
            isLoading={areGrantsLoading}
            onRetry={() => void loadCreditGrants(creditGrantsPage)}
          >
            {creditGrants?.grants.map((grant) => {
              const expired =
                grant.expired ||
                new Date(grant.expires_at).getTime() <= Date.now();
              const status = expired
                ? "Expired"
                : grant.balance > 0
                  ? "Active"
                  : "Used";
              return (
                <View
                  key={grant.id}
                  style={[
                    styles.ledgerCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeading}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {grant.description ?? "Credit grant"}
                    </Text>
                    <StatusBadge colors={colors} status={status} />
                  </View>
                  <View style={styles.grantAmounts}>
                    <MoneyMetric
                      colors={colors}
                      label="Remaining"
                      value={grant.balance}
                    />
                    <MoneyMetric
                      colors={colors}
                      label="Total"
                      value={grant.total_balance}
                    />
                  </View>
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                  <Text
                    style={[styles.metadata, { color: colors.textSecondary }]}
                  >
                    Issued {formatDate(grant.created_at)}
                  </Text>
                  <Text
                    style={[styles.metadata, { color: colors.textSecondary }]}
                  >
                    Expires {formatDate(grant.expires_at)}
                  </Text>
                </View>
              );
            })}
            {!areGrantsLoading &&
            !grantError &&
            creditGrants?.grants.length === 0 ? (
              <EmptyLedger
                colors={colors}
                description="Promotional and granted credits will appear here."
                title="No credit grants found"
              />
            ) : null}
            <PageControls
              colors={colors}
              hasNext={creditGrants?.hasNext ?? false}
              isLoading={areGrantsLoading}
              onChange={setCreditGrantsPage}
              page={creditGrants?.page ?? creditGrantsPage}
            />
          </LedgerSection>
        )}
      </ScrollView>

      <BuyCreditsModal
        colors={colors}
        onCheckoutReturned={refreshAfterCheckout}
        onClose={() => setBuyCreditsVisible(false)}
        showToast={showToast}
        visible={buyCreditsVisible}
      />
    </SafeAreaView>
  );
}

function BalanceCard({
  balance,
  colors,
  error,
  isLoading,
  onBuy,
}: {
  balance?: number;
  colors: AppColors;
  error: string | null;
  isLoading: boolean;
  onBuy: () => void;
}) {
  return (
    <View
      style={[
        styles.balanceCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.balanceLabelRow}>
        <AppIcon
          name={{
            ios: "wallet.bifold",
            android: "account_balance_wallet",
            web: "account_balance_wallet",
          }}
          size={18}
          tintColor={colors.textSecondary}
        />
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
          Available balance
        </Text>
      </View>
      {isLoading ? (
        <View
          style={[
            styles.balanceSkeleton,
            { backgroundColor: colors.backgroundElement },
          ]}
        />
      ) : error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.balanceError, { color: colors.destructive }]}
        >
          {error}
        </Text>
      ) : (
        <View style={styles.balanceValueRow}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.balanceValue, { color: colors.text }]}
          >
            ${formatInternalMoney(balance ?? 0, 2)}
          </Text>
          <Text style={[styles.creditsLabel, { color: colors.textSecondary }]}>
            credits
          </Text>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onBuy}
        style={({ pressed }) => [
          styles.buyButton,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}
      >
        <AppIcon
          name={{ ios: "plus", android: "add", web: "add" }}
          size={18}
          tintColor={colors.primaryForeground}
        />
        <Text
          style={[styles.buyButtonText, { color: colors.primaryForeground }]}
        >
          Buy credits
        </Text>
      </Pressable>
    </View>
  );
}

function TransactionTable({
  colors,
  error,
  hasNext,
  isLoading,
  onPageChange,
  onRetry,
  page,
  transactions,
}: {
  colors: AppColors;
  error: string | null;
  hasNext: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  page: number;
  transactions: WalletTransaction[];
}) {
  if (error) {
    return (
      <EmptyLedger
        colors={colors}
        description={error}
        title="Could not load transactions"
      >
        <OutlineButton colors={colors} label="Try again" onPress={onRetry} />
      </EmptyLedger>
    );
  }

  return (
    <View style={styles.ledger}>
      <ScrollView
        accessibilityLabel="Wallet transactions table"
        horizontal
        showsHorizontalScrollIndicator
      >
        <View
          style={[
            styles.transactionTable,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.transactionRow,
              styles.transactionHeader,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <TableHeaderCell colors={colors} style={styles.typeCell}>
              Type
            </TableHeaderCell>
            <TableHeaderCell colors={colors} style={styles.descriptionCell}>
              Description
            </TableHeaderCell>
            <TableHeaderCell
              align="right"
              colors={colors}
              style={styles.amountCell}
            >
              Amount
            </TableHeaderCell>
            <TableHeaderCell colors={colors} style={styles.dateCell}>
              Date
            </TableHeaderCell>
          </View>

          {isLoading ? (
            <TransactionTableSkeleton colors={colors} />
          ) : transactions.length ? (
            transactions.map((transaction, index) => {
              const isDeposit = transaction.transaction_type === "deposit";
              return (
                <View
                  key={transaction.id}
                  style={[
                    styles.transactionRow,
                    index < transactions.length - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={[styles.tableCell, styles.typeCell]}>
                    <TransactionBadge
                      colors={colors}
                      type={transaction.transaction_type}
                    />
                  </View>
                  <View style={[styles.tableCell, styles.descriptionCell]}>
                    <Text
                      style={[styles.tableBodyText, { color: colors.text }]}
                    >
                      {transaction.description || "—"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.tableCell,
                      styles.amountCell,
                      styles.rightCell,
                    ]}
                  >
                    <Text
                      style={[
                        styles.transactionAmount,
                        { color: isDeposit ? colors.success : colors.text },
                      ]}
                    >
                      {isDeposit ? "+" : "−"}$
                      {formatInternalMoney(transaction.amount)}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, styles.dateCell]}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tableBodyText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatDate(transaction.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.tableEmptyRow}>
              <AppIcon
                name={{
                  ios: "creditcard",
                  android: "credit_card",
                  web: "credit_card",
                }}
                size={24}
                tintColor={colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No transactions found
              </Text>
              <Text
                style={[
                  styles.emptyDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Deposits and usage charges will appear here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      <PageControls
        colors={colors}
        hasNext={hasNext}
        isLoading={isLoading}
        onChange={onPageChange}
        page={page}
      />
    </View>
  );
}

function TableHeaderCell({
  align = "left",
  children,
  colors,
  style,
}: {
  align?: "left" | "right";
  children: string;
  colors: AppColors;
  style: object;
}) {
  return (
    <View
      style={[styles.tableCell, style, align === "right" && styles.rightCell]}
    >
      <Text
        style={[
          styles.tableHeaderText,
          { color: colors.textSecondary, textAlign: align },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function TransactionTableSkeleton({ colors }: { colors: AppColors }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((item) => (
        <View
          key={item}
          style={[
            styles.transactionRow,
            item < 4 && {
              borderBottomColor: colors.border,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <View style={[styles.tableCell, styles.typeCell]}>
            <View
              style={[
                styles.tableSkeletonBadge,
                { backgroundColor: colors.backgroundElement },
              ]}
            />
          </View>
          <View style={[styles.tableCell, styles.descriptionCell]}>
            <View
              style={[
                styles.tableSkeletonDescription,
                { backgroundColor: colors.backgroundElement },
              ]}
            />
          </View>
          <View style={[styles.tableCell, styles.amountCell, styles.rightCell]}>
            <View
              style={[
                styles.tableSkeletonAmount,
                { backgroundColor: colors.backgroundElement },
              ]}
            />
          </View>
          <View style={[styles.tableCell, styles.dateCell]}>
            <View
              style={[
                styles.tableSkeletonDate,
                { backgroundColor: colors.backgroundElement },
              ]}
            />
          </View>
        </View>
      ))}
    </>
  );
}

function LedgerSection({
  children,
  colors,
  emptyDescription,
  emptyTitle,
  error,
  isLoading,
  onRetry,
}: {
  children: ReactNode;
  colors: AppColors;
  emptyDescription: string;
  emptyTitle: string;
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
}) {
  if (isLoading) return <LedgerSkeleton colors={colors} />;
  if (error) {
    return (
      <EmptyLedger
        colors={colors}
        description={error}
        title={`Could not load ${emptyTitle.toLowerCase().replace("no ", "")}`}
      >
        <OutlineButton colors={colors} label="Try again" onPress={onRetry} />
      </EmptyLedger>
    );
  }
  return <View style={styles.ledger}>{children}</View>;
}

function LedgerSkeleton({ colors }: { colors: AppColors }) {
  return (
    <View accessibilityLabel="Loading wallet activity" style={styles.ledger}>
      {[0, 1, 2, 3].map((item) => (
        <View
          key={item}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.skeletonShort,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
          <View
            style={[
              styles.skeletonMedium,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function EmptyLedger({
  children,
  colors,
  description,
  title,
}: {
  children?: ReactNode;
  colors: AppColors;
  description: string;
  title: string;
}) {
  return (
    <View
      style={[
        styles.empty,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.backgroundElement },
        ]}
      >
        <AppIcon
          name={{
            ios: "creditcard",
            android: "credit_card",
            web: "credit_card",
          }}
          size={24}
          tintColor={colors.textSecondary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {children}
    </View>
  );
}

function PageControls({
  colors,
  hasNext,
  isLoading,
  onChange,
  page,
}: {
  colors: AppColors;
  hasNext: boolean;
  isLoading: boolean;
  onChange: (page: number) => void;
  page: number;
}) {
  return (
    <View style={styles.pageControls}>
      <PageButton
        colors={colors}
        disabled={isLoading || page <= 1}
        direction="previous"
        onPress={() => onChange(Math.max(1, page - 1))}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.pageLabel, { color: colors.textSecondary }]}
      >
        Page {page}
      </Text>
      <PageButton
        colors={colors}
        disabled={isLoading || !hasNext}
        direction="next"
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}

function PageButton({
  colors,
  direction,
  disabled,
  onPress,
}: {
  colors: AppColors;
  direction: "next" | "previous";
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${direction === "next" ? "Next" : "Previous"} page`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pageButton,
        { borderColor: colors.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <AppIcon
        name={
          direction === "next"
            ? {
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }
            : {
                ios: "chevron.left",
                android: "chevron_left",
                web: "chevron_left",
              }
        }
        size={18}
        tintColor={colors.text}
      />
    </Pressable>
  );
}

function Tab({
  colors,
  label,
  onPress,
  selected,
}: {
  colors: AppColors;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        selected && { borderBottomColor: colors.text },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.tabText,
          { color: selected ? colors.text : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionBadge({
  colors,
  type,
}: {
  colors: AppColors;
  type: WalletTransaction["transaction_type"];
}) {
  const isDeposit = type === "deposit";
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isDeposit
            ? colors.successSurface
            : colors.backgroundElement,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: isDeposit ? colors.success : colors.textSecondary },
        ]}
      >
        {titleCase(type)}
      </Text>
    </View>
  );
}

function StatusBadge({
  colors,
  status,
}: {
  colors: AppColors;
  status: "Active" | "Expired" | "Used";
}) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor:
            status === "Active"
              ? colors.successSurface
              : colors.backgroundElement,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: status === "Active" ? colors.success : colors.textSecondary,
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function MoneyMetric({
  colors,
  label,
  value,
}: {
  colors: AppColors;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>
        ${formatInternalMoney(value)}
      </Text>
    </View>
  );
}

function OutlineButton({
  colors,
  label,
  onPress,
}: {
  colors: AppColors;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        { borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.outlineButtonText, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BuyCreditsModal({
  colors,
  onCheckoutReturned,
  onClose,
  showToast,
  visible,
}: {
  colors: AppColors;
  onCheckoutReturned: () => void;
  onClose: () => void;
  showToast: ReturnType<typeof useToast>["showToast"];
  visible: boolean;
}) {
  const [amount, setAmount] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parsedAmount = Number(amount);
  const isValid =
    Number.isInteger(parsedAmount) && parsedAmount >= 5 && parsedAmount <= 300;

  const close = () => {
    if (isSubmitting) return;
    setAmount("5");
    onClose();
  };

  const submit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const checkoutUrl = await createCheckout(parsedAmount);
      const parsedUrl = new URL(checkoutUrl);
      if (parsedUrl.protocol !== "https:")
        throw new Error("The checkout URL is invalid.");
      showToast({ message: "Opening secure checkout…", variant: "success" });
      await WebBrowser.openBrowserAsync(parsedUrl.toString());
      setAmount("5");
      onClose();
      onCheckoutReturned();
      showToast({
        message: "Wallet activity is being refreshed.",
        title: "Checkout closed",
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Could not open checkout",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView
        style={[styles.modalRoot, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <View style={styles.modalCopy}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Buy credits
              </Text>
              <Text
                style={[
                  styles.modalDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Add between $5 and $300 to your wallet.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close buy credits"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={close}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <AppIcon
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={19}
                tintColor={colors.textSecondary}
              />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Amount
            </Text>
            <View
              style={[
                styles.amountInput,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.currency, { color: colors.textSecondary }]}>
                $
              </Text>
              <TextInput
                accessibilityLabel="Credit amount"
                editable={!isSubmitting}
                inputMode="numeric"
                onChangeText={(value) =>
                  /^\d*$/.test(value) && setAmount(value)
                }
                selectionColor={colors.brand}
                style={[styles.amountTextInput, { color: colors.text }]}
                value={amount}
              />
            </View>
            {!isValid ? (
              <Text style={[styles.validation, { color: colors.destructive }]}>
                Enter a whole amount from $5 to $300.
              </Text>
            ) : null}
          </View>
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <OutlineButton colors={colors} label="Cancel" onPress={close} />
            <Pressable
              accessibilityRole="button"
              disabled={!isValid || isSubmitting}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.checkoutButton,
                { backgroundColor: colors.primary },
                (!isValid || isSubmitting) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  color={colors.primaryForeground}
                  size="small"
                />
              ) : null}
              <Text
                style={[
                  styles.checkoutButtonText,
                  { color: colors.primaryForeground },
                ]}
              >
                {isSubmitting ? "Creating checkout…" : "Continue"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function titleCase(value: string) {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

const styles = StyleSheet.create({
  amountInput: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
  },
  amountTextInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.three },
  amountCell: { width: 150 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  balanceCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.four,
    padding: Spacing.five,
  },
  balanceError: { fontSize: 13 },
  balanceLabel: { fontSize: 13, fontWeight: "600" },
  balanceLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  balanceSkeleton: { borderRadius: Radius.small, height: 46, width: 210 },
  balanceValue: {
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1.2,
    maxWidth: "75%",
  },
  balanceValueRow: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  buyButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.medium,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
  },
  buyButtonText: { fontSize: 14, fontWeight: "700" },
  cardHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  checkoutButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
  },
  checkoutButtonText: { fontSize: 14, fontWeight: "700" },
  content: {
    gap: Spacing.six,
    padding: Spacing.five,
    paddingBottom: Spacing.ten,
  },
  creditsLabel: { fontSize: 14 },
  currency: { fontSize: 16, marginRight: Spacing.two },
  disabled: { opacity: 0.42 },
  dateCell: { width: 190 },
  descriptionCell: { width: 310 },
  divider: { height: StyleSheet.hairlineWidth },
  empty: {
    alignItems: "center",
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 230,
    padding: Spacing.seven,
  },
  emptyDescription: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  emptyIcon: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: 50,
    justifyContent: "center",
    marginBottom: Spacing.two,
    width: 50,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  fieldLabel: { fontSize: 13, fontWeight: "700" },
  flex: { flex: 1 },
  grantAmounts: { flexDirection: "row", gap: Spacing.four },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.two,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  iconButton: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  ledger: { gap: Spacing.four },
  ledgerCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.five,
  },
  metadata: { fontSize: 12, lineHeight: 18 },
  metric: { flex: 1, gap: Spacing.one },
  metricLabel: { fontSize: 11, fontWeight: "600" },
  metricValue: { fontSize: 15, fontWeight: "700" },
  modalBody: { flex: 1, gap: Spacing.two, padding: Spacing.five },
  modalCopy: { flex: 1, gap: Spacing.one },
  modalDescription: { fontSize: 13, lineHeight: 19 },
  modalFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  modalHeader: {
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.three,
    padding: Spacing.five,
  },
  modalRoot: { flex: 1 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  outlineButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
  },
  outlineButtonText: { fontSize: 13, fontWeight: "700" },
  pageButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  pageControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "flex-end",
    marginTop: Spacing.one,
  },
  pageDescription: { fontSize: 14, lineHeight: 21 },
  pageLabel: { fontSize: 13, minWidth: 62, textAlign: "center" },
  pageTitle: { fontSize: 30, fontWeight: "700", letterSpacing: -0.8 },
  pressed: { opacity: 0.58 },
  rightCell: { alignItems: "flex-end" },
  safeArea: { flex: 1 },
  skeletonCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.four,
    minHeight: 120,
    padding: Spacing.five,
  },
  skeletonLine: { borderRadius: Radius.pill, height: 12, width: "100%" },
  skeletonMedium: { borderRadius: Radius.pill, height: 10, width: "58%" },
  skeletonShort: { borderRadius: Radius.pill, height: 18, width: "28%" },
  tab: {
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.three,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  tableBodyText: { fontSize: 13, lineHeight: 19 },
  tableCell: {
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  tableEmptyRow: {
    alignItems: "center",
    height: 150,
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tableSkeletonAmount: { borderRadius: Radius.pill, height: 11, width: 90 },
  tableSkeletonBadge: { borderRadius: Radius.pill, height: 24, width: 72 },
  tableSkeletonDate: { borderRadius: Radius.pill, height: 11, width: 135 },
  tableSkeletonDescription: {
    borderRadius: Radius.pill,
    height: 11,
    width: 235,
  },
  tabs: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.six,
  },
  titleBlock: { gap: Spacing.two },
  transactionHeader: { minHeight: 46 },
  transactionAmount: { fontSize: 14, fontWeight: "700", textAlign: "right" },
  transactionRow: { flexDirection: "row", minHeight: 64 },
  transactionTable: {
    borderRadius: Radius.large,
    borderWidth: 1,
    minWidth: 760,
    overflow: "hidden",
  },
  typeCell: { width: 110 },
  validation: { fontSize: 12 },
});
