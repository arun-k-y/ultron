// RazorpayWebService.ts - Alternative web-based implementation
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { BASE_URL } from "@/config/config";

interface OrderData {
  amount: number;
  email: string;
  phone?: string;
  name: string;
  description?: string;
}

interface Order {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

interface Customer {
  name: string;
  email: string;
  phone?: string;
}

interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface VerificationResponse {
  success: boolean;
  verified: boolean;
  payment?: any;
  message?: string;
}

class RazorpayWebService {
  private keyId = "rzp_test_6ITP2WNiZs5MNO";
  private backendURL = `http://${BASE_URL}/api`;

  setBackendURL(url: string): void {
    this.backendURL = url;
  }

  setKeyId(keyId: string): void {
    this.keyId = keyId;
  }

  async createOrder(
    amount: number,
    email: string,
    phone: string | undefined,
    name: string,
    description?: string
  ): Promise<Order> {
    try {
      console.log("🔄 Creating order with data:", {
        amount,
        email,
        phone,
        name,
        description,
      });

      const requestBody = {
        amount,
        email,
        phone: phone || "",
        name,
        description: description || "Payment for services",
        currency: "INR",
      };

      const response = await fetch(`${this.backendURL}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to create order");
      }

      console.log("✅ Order created successfully:", data.order);
      return data.order;
    } catch (error) {
      console.error("❌ Error creating order:", error);
      throw new Error(
        `Failed to create order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async openCheckout(order: Order, customer: Customer): Promise<PaymentResult> {
    try {
      console.log("🔄 Opening web checkout with order:", order);
      console.log("🔄 Customer info:", customer);

      if (!order.id) {
        throw new Error("Order ID is required for payment");
      }

      // Create a web-based payment URL
      const paymentUrl =
        `${this.backendURL}/web-payment?` +
        new URLSearchParams({
          key: this.keyId,
          amount: order.amount.toString(),
          currency: order.currency || "INR",
          order_id: order.id,
          name: "Razorpay Test App",
          description: "Payment for services",
          prefill_name: customer.name,
          prefill_email: customer.email,
          ...(customer.phone && { prefill_contact: customer.phone }),
          theme_color: "#3399cc",
        });

      console.log("🌐 Payment URL:", paymentUrl);

      // Open in web browser
      const result = await WebBrowser.openBrowserAsync(paymentUrl);

      if (result.type === "cancel") {
        throw new Error("Payment was cancelled by user");
      }

      // For web implementation, you might need to handle the redirect differently
      // This is a simplified version - you'll need to implement proper redirect handling
      throw new Error(
        "Web payment implementation requires additional setup for redirect handling"
      );
    } catch (error) {
      console.error("❌ Error opening web checkout:", error);
      throw new Error(
        `Payment failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async verifyPayment(
    payment_id: string,
    order_id: string,
    signature: string
  ): Promise<VerificationResponse> {
    try {
      console.log("🔄 Verifying payment:", { payment_id, order_id, signature });

      const response = await fetch(`${this.backendURL}/verify-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          payment_id,
          order_id,
          signature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Payment verification failed");
      }

      console.log("✅ Payment verification response:", data);
      return data;
    } catch (error) {
      console.error("❌ Error verifying payment:", error);
      throw new Error(
        `Payment verification failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Additional methods remain the same
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.backendURL}/payment/${paymentId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch payment details");
      }

      return data.payment;
    } catch (error) {
      console.error("Error fetching payment details:", error);
      throw new Error(
        `Failed to fetch payment details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getPaymentHistory(
    email?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (email) params.append("email", email);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const response = await fetch(`${this.backendURL}/payments?${params}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch payment history");
      }

      return data;
    } catch (error) {
      console.error("Error fetching payment history:", error);
      throw new Error(
        `Failed to fetch payment history: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async requestRefund(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.backendURL}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          payment_id: paymentId,
          amount: amount,
          reason: reason || "Customer request",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Refund request failed");
      }

      return data;
    } catch (error) {
      console.error("Error requesting refund:", error);
      throw new Error(
        `Refund request failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export default RazorpayWebService;
