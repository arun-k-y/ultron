import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import RazorpayService from "../app/RazorpayService";
import AuthService from "../app/AuthService";
import { useAuth } from "../app/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const razorpayService = new RazorpayService();
const authService = new AuthService();

const STORAGE_KEY = "@payment_history";

type Payment = {
  id: string;
  amount: number;
  description: string;
  status: "Success" | "Failed" | "Pending";
  date: string;
  paymentId: string | null;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
};

export default function PaymentScreen() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedHistory) {
        setPaymentHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Error loading payment history:", error);
    }
  };

  const savePaymentHistory = async (history: Payment[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Error saving payment history:", error);
    }
  };

  const validateInputs = (): boolean => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return false;
    }
    if (!amount.trim()) {
      Alert.alert("Error", "Please enter the amount");
      return false;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount greater than 0");
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateInputs()) {
      return;
    }
    const parsedAmount = parseFloat(amount);
    setLoading(true);
    try {
      // Test backend connection first
      const isConnected = await authService.testConnection();
      if (!isConnected) {
        throw new Error(
          "Cannot connect to payment server. Please check your internet connection and try again."
        );
      }
      // Create order using authenticated service
      const orderResponse = await authService.createOrder(
        parsedAmount,
        description.trim() || "Payment for services"
      );
      const order = orderResponse.order;
      if (!order || !order.id) {
        throw new Error("Failed to create order: Invalid order response");
      }
      // Open Razorpay checkout
      const paymentResult = await razorpayService.openCheckout(order, {
        name: user?.name || "Customer",
        email: user?.email || "",
        phone: user?.phone || "",
      });
      // Verify payment
      const verifyRes = await authService.verifyPayment(
        paymentResult.razorpay_payment_id,
        paymentResult.razorpay_order_id,
        paymentResult.razorpay_signature
      );
      const isVerified = verifyRes.success && verifyRes.verified;
      const newPayment: Payment = {
        id: Date.now().toString(),
        amount: parsedAmount,
        description: description.trim() || "Payment for services",
        status: isVerified ? "Success" : "Failed",
        date: new Date().toISOString().split("T")[0],
        paymentId: isVerified ? paymentResult.razorpay_payment_id : null,
        orderId: paymentResult.razorpay_order_id,
        customerName: user?.name || "Customer",
        customerEmail: user?.email || "",
      };
      const updatedHistory = [newPayment, ...paymentHistory];
      setPaymentHistory(updatedHistory);
      await savePaymentHistory(updatedHistory);
      Alert.alert(
        isVerified ? "Payment Successful!" : "Payment Failed",
        isVerified
          ? `Payment completed successfully!\nPayment ID: ${paymentResult.razorpay_payment_id}`
          : "Payment verification failed. Please contact support if amount was debited.",
        [
          {
            text: "OK",
            onPress: () => {
              if (isVerified) {
                setAmount("");
                setDescription("");
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Payment Error",
        error.message || "An unexpected error occurred during payment.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formBox}>
            <Text style={styles.title}>Make a Payment</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              editable={!loading}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.payButton, loading && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.payButtonText}>Pay Now</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>Payment History</Text>
            {paymentHistory.length === 0 ? (
              <Text style={styles.emptyHistory}>No payment history yet.</Text>
            ) : (
              paymentHistory.map((payment) => (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <Text style={styles.paymentAmount}>
                      {formatAmount(payment.amount)}
                    </Text>
                    <Text
                      style={[
                        styles.status,
                        payment.status === "Success"
                          ? styles.success
                          : styles.failed,
                      ]}
                    >
                      {payment.status}
                    </Text>
                  </View>
                  <Text style={styles.paymentDescription}>
                    {payment.description}
                  </Text>
                  <View style={styles.paymentFooter}>
                    <Text style={styles.paymentDate}>
                      {formatDate(payment.date)}
                    </Text>
                    {payment.paymentId && (
                      <Text style={styles.paymentId}>
                        ID: {payment.paymentId.slice(-8)}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 40,
  },
  formBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 32,
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F8F9FA",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  payButton: {
    backgroundColor: "#00FF00",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  payButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  payButtonText: {
    color: "#111",
    fontSize: 18,
    fontWeight: "bold",
  },
  historyBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 12,
  },
  emptyHistory: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginVertical: 16,
  },
  paymentCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
  },
  success: {
    color: "#0a0",
  },
  failed: {
    color: "#c00",
  },
  paymentDescription: {
    color: "#444",
    fontSize: 15,
    marginBottom: 6,
  },
  paymentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentDate: {
    color: "#888",
    fontSize: 13,
  },
  paymentId: {
    color: "#888",
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
