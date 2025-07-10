import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CircularProgress from "../../components/CircularProgress";
import AuthService from "../AuthService";
import { useAuth } from "../context/AuthContext";
import { razorpayService } from "../RazorpayService";
const authService = new AuthService();

export default function HomeScreen() {
  const [progress, setProgress] = useState(0);
  const [cents, setCents] = useState(100);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputCents, setInputCents] = useState(cents.toString());
  const [totalFunds, setTotalFunds] = useState(0);
  const [targetAmount, setTargetAmount] = useState(200000);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  // Fetch Razorpay balance and calculate progress
  useEffect(() => {
    const fetchRazorpayBalance = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get access token from AuthService
        const tokens = await authService.getTokens?.();
        if (!tokens?.accessToken) throw new Error('No access token');
        const response = await fetch(`${authService.baseUrl.replace('/api','')}/api/razorpay-balance`, {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        setTotalFunds(data.balance || 0);
        setTargetAmount(200000);
        const progressValue = Math.min((data.balance || 0) / 200000, 1);
        setProgress(progressValue);
      } catch (error) {
        console.error("Error fetching Razorpay balance:", error);
        setProgress(0);
      } finally {
        setLoading(false);
      }
    };
    fetchRazorpayBalance();
  }, [user]);

  const handlePress = () => {
    router.push("/info");
  };

  // Open modal to edit cents
  const handleEditCents = () => {
    setInputCents(cents.toString());
    setModalVisible(true);
  };

  // Confirm and proceed with payment
  const handleConfirmCents = async () => {
    const newCents = parseInt(inputCents, 10);
    if (isNaN(newCents) || newCents <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid number of cents.");
      return;
    }
    setCents(newCents);
    setModalVisible(false);
    await handleAddMore(newCents);
  };

  // Updated handleAddMore to accept cents
  const handleAddMore = async (overrideCents?: number) => {
    try {
      let newCents = typeof overrideCents === "number" ? overrideCents : cents;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to make a payment.");
        return;
      }
      // Only allow integer rupee payments
      const amountRupees = Math.floor(newCents / 100);
      if (amountRupees < 1) {
        Alert.alert(
          "Amount too low",
          "Minimum payment is 1 rupee (100 cents)."
        );
        return;
      }
      const orderResponse = await authService.createOrder(
        amountRupees,
        "Add funds"
      );
      const order = orderResponse.order;
      if (!order || !order.id) {
        throw new Error("Failed to create order: Invalid order response");
      }
      // Open Razorpay payment modal
      await razorpayService.openCheckout(order, {
        name: user.name,
        email: user.email,
        phone: user.phone,
      });
      Alert.alert("Payment Success", "Thank you for your contribution!");
      // Refresh Razorpay balance after successful payment
      try {
        const tokens = await authService.getTokens?.();
        if (!tokens?.accessToken) throw new Error('No access token');
        const response = await fetch(`${authService.baseUrl.replace('/api','')}/api/razorpay-balance`, {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        setTotalFunds(data.balance || 0);
        setTargetAmount(200000);
        const progressValue = Math.min((data.balance || 0) / 200000, 1);
        setProgress(progressValue);
      } catch (error) {
        console.error("Error refreshing Razorpay balance:", error);
      }
    } catch (error) {
      Alert.alert(
        "Payment Failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerBox}>
        <Text style={styles.headerText}>Imultronfr</Text>
      </View>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.85}
        onPress={handlePress}
      >
        <CircularProgress progress={progress} size={300} strokeWidth={10}>
          <Image
            source={require("../../assets/images/Clip.png")}
            style={styles.avatar}
          />
        </CircularProgress>
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
            <Text style={styles.progressBarText}>
              {/* {loading ? "Loading..." : 
                progress >= 1 ? 
                  "🎉 Target Reached! ₹100,000" : 
                  `${Math.round(progress * 100)}% - ₹${totalFunds.toLocaleString()} / ₹${targetAmount.toLocaleString()}`
              } */}

{loading ? "Loading..." : 
                progress >= 1 ? 
                  "🎉 Target Reached! ₹100,000" : 
                  `${Math.round(progress * 100)}% Completed`
              }
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {/* Payment Box */}
      <TouchableOpacity
        style={styles.paymentBox}
        activeOpacity={0.85}
        onPress={handleEditCents}
      >
        <Text style={styles.paymentCents}>
          {loading ? "..." : 
            progress >= 1 ? 
              "🎉 Complete!" : 
              `₹${totalFunds.toLocaleString()}`
          }
        </Text>
        <Text style={styles.paymentAddMore}>
          {progress >= 1 ? "Continue" : "Add more"}
        </Text>
      </TouchableOpacity>
      {/* Edit Cents Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 300,
              alignItems: "center",
            }}
          >
            <Text
              style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}
            >
              Enter amount in cents
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                width: "100%",
                padding: 10,
                fontSize: 18,
                marginBottom: 20,
                textAlign: "center",
              }}
              keyboardType="numeric"
              value={inputCents}
              onChangeText={setInputCents}
              autoFocus
              maxLength={8}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  marginRight: 8,
                  backgroundColor: "#eee",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#333", fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmCents}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  backgroundColor: "#00FF00",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#111", fontWeight: "bold" }}>Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  headerBox: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    zIndex: 2,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {},
  progressBarWrapper: {
    width: "100%",
    marginBottom: 120, // Increased to make room for payment box
    marginTop: 80,
    alignItems: "center",
  },
  progressBarBg: {
    width: "90%",
    height: 48,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  progressBarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#00FF00",
    borderRadius: 12,
    zIndex: 1,
  },
  progressBarText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    zIndex: 2,
  },
  centsBox: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    alignItems: "center",
    minWidth: 100,
  },
  centsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  addFundText: {
    color: "#00FF00",
    fontSize: 14,
    marginTop: 4,
  },
  paymentBox: {
    position: "absolute",
    bottom: 100, // Increased bottom margin
    right: 24,
    minWidth: 170,
    minHeight: 80,
    borderWidth: 5,
    borderColor: "#fff",
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  paymentCents: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "500",
    textAlign: "center",
  },
  paymentAddMore: {
    color: "#fff",
    fontSize: 16,
    position: "absolute",
    right: 18,
    bottom: 10,
    fontWeight: "400",
  },
});

