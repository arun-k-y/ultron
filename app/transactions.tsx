import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import AuthService from "./AuthService";
import { useAuth } from "./context/AuthContext";

const authService = new AuthService();

type Transaction = {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const fetchTransactions = async () => {
    try {
      const response = await authService.getPaymentHistory();
      if (response.success) {
        console.log("response.payments", response.payments);
        setTransactions(response.payments || []);
      } else {
        throw new Error(response.message || "Failed to fetch transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      Alert.alert("Error", "Failed to load transactions. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "paid":
      case "completed":
        return "#34C759";
      case "failed":
      case "declined":
      case "cancelled":
        return "#FF3B30";
      case "pending":
      case "processing":
        return "#FF9500";
      case "created":
        return "#007AFF";
      default:
        return "#8E8E93";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "paid":
      case "completed":
        return "Success";
      case "failed":
      case "declined":
      case "cancelled":
        return "Failed";
      case "pending":
      case "processing":
        return "Pending";
      case "created":
        return "Created";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "paid":
      case "completed":
        return "checkmark-circle";
      case "failed":
      case "declined":
      case "cancelled":
        return "close-circle";
      case "pending":
      case "processing":
        return "time";
      case "created":
        return "ellipse";
      default:
        return "help-circle";
    }
  };

  const getStatusSummary = () => {
    const summary = {
      total: transactions.length,
      success: 0,
      failed: 0,
      pending: 0,
      other: 0,
    };

    transactions.forEach(transaction => {
      const status = transaction.status.toLowerCase();
      if (status === "success" || status === "paid" || status === "completed") {
        summary.success++;
      } else if (status === "failed" || status === "declined" || status === "cancelled") {
        summary.failed++;
      } else if (status === "pending" || status === "processing") {
        summary.pending++;
      } else {
        summary.other++;
      }
    });

    return summary;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Transactions</Text>
              <Text style={styles.emptySubtitle}>
                You haven&apos;t made any transactions yet.
              </Text>
            </View>
          ) : (
            <>
              {/* Summary Section */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Transaction Summary</Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>{getStatusSummary().total}</Text>
                    <Text style={styles.summaryLabel}>Total</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: "#34C759" }]}>
                      {getStatusSummary().success}
                    </Text>
                    <Text style={styles.summaryLabel}>Success</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: "#FF3B30" }]}>
                      {getStatusSummary().failed}
                    </Text>
                    <Text style={styles.summaryLabel}>Failed</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: "#FF9500" }]}>
                      {getStatusSummary().pending}
                    </Text>
                    <Text style={styles.summaryLabel}>Pending</Text>
                  </View>
                </View>
              </View>

              {/* Transaction List */}
              {transactions.map((transaction, index) => (
                <View key={transaction.orderId} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionAmount}>
                        {formatAmount(transaction.amount, transaction.currency)}
                      </Text>
                      <Text style={styles.transactionDescription}>
                        {transaction.description || "Payment"}
                      </Text>
                    </View>
                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(transaction.status) + '20' }
                      ]}>
                        <Ionicons 
                          name={getStatusIcon(transaction.status) as any} 
                          size={16} 
                          color={getStatusColor(transaction.status)} 
                          style={styles.statusIcon}
                        />
                        <Text 
                          style={[
                            styles.statusText,
                            { color: getStatusColor(transaction.status) }
                          ]}
                        >
                          {getStatusText(transaction.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.transactionFooter}>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.createdAt)}
                    </Text>
                    <Text style={styles.transactionId}>
                      ID: {transaction.orderId.slice(-8)}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: "#8E8E93",
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  transactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  transactionDate: {
    fontSize: 12,
    color: "#8E8E93",
  },
  transactionId: {
    fontSize: 12,
    color: "#8E8E93",
  },
}); 