// RazorpayService.ts
import { BASE_URL } from "@/config/config";
import { Platform } from "react-native";

// Dynamic import to handle module availability
let RazorpayCheckout: any = null;

const loadRazorpayModule = () => {
  if (RazorpayCheckout) return RazorpayCheckout;

  try {
    const module = require("react-native-razorpay");
    RazorpayCheckout = module.default || module;
    console.log("✅ RazorpayCheckout loaded successfully");
    return RazorpayCheckout;
  } catch (error) {
    console.warn("⚠️ react-native-razorpay module not available:", error);
    return null;
  }
};

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

class RazorpayService {
  private keyId = "rzp_test_6ITP2WNiZs5MNO";
  // Use appropriate URL based on your setup
  private backendURL = `${BASE_URL}/api`; // Android emulator
  // private backendURL = 'http://192.168.1.XXX:2001/api'; // Physical device - replace XXX with your IP

  // Method to update backend URL for production
  setBackendURL(url: string): void {
    this.backendURL = url;
  }

  // Method to update key ID
  setKeyId(keyId: string): void {
    this.keyId = keyId;
  }

  // Check if Razorpay is available
  isRazorpayAvailable(): boolean {
    try {
      const module = loadRazorpayModule();
      const isAvailable = !!(module && typeof module.open === "function");
      console.log("🔍 Razorpay availability check:", {
        moduleExists: !!module,
        hasOpenMethod: module ? typeof module.open === "function" : false,
        isAvailable,
      });
      return isAvailable;
    } catch (error) {
      console.error("Error checking Razorpay availability:", error);
      return false;
    }
  }

  // Test backend connectivity
  async testConnection(): Promise<boolean> {
    try {
      console.log("🔄 Testing backend connection...");
      const response = await fetch(
        `${this.backendURL.replace("/api", "")}/health`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Backend connection successful:", data);
        return true;
      } else {
        console.error("❌ Backend connection failed:", response.status);
        return false;
      }
    } catch (error) {
      console.error("❌ Backend connection error:", error);
      return false;
    }
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
      console.log("🌐 Backend URL:", this.backendURL);

      const requestBody = {
        amount,
        email,
        phone: phone || "",
        name,
        description: description || "Payment for services",
        currency: "INR",
      };

      console.log("📤 Request body:", requestBody);

      const response = await fetch(`${this.backendURL}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response status:", response.status);
      console.log("📥 Response headers:", response.headers);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        console.error("❌ Server error response:", errorData);
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("📥 Response data:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to create order");
      }

      console.log("✅ Order created successfully:", data.order);
      return data.order;
    } catch (error) {
      console.error("❌ Error creating order:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(
        `Failed to create order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async openCheckout(order: Order, customer: Customer): Promise<PaymentResult> {
    try {
      console.log("🔄 Opening checkout with order:", order);
      console.log("🔄 Customer info:", customer);
      console.log("📱 Platform:", Platform.OS);

      // Check if RazorpayCheckout is available
      const razorpayModule = loadRazorpayModule();
      if (!razorpayModule || typeof razorpayModule.open !== "function") {
        throw new Error(
          "RazorpayCheckout is not properly initialized. Please check if the module is correctly installed and linked. You may need to rebuild your app."
        );
      }

      // Validate order data
      if (!order.id) {
        throw new Error("Order ID is required for payment");
      }

      const options = {
        key: this.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        order_id: order.id,
        name: "Razorpay Test App", // Change this to your app name
        description: "Payment for services",
        prefill: {
          name: customer.name,
          email: customer.email,
          ...(customer.phone && { contact: customer.phone }),
        },
        theme: {
          color: "#3399cc",
        },
      };

      console.log("💳 Razorpay options:", options);
      console.log("🔄 Calling RazorpayCheckout.open...");

      const paymentResult = await razorpayModule.open(options);
      console.log("✅ Payment result:", paymentResult);

      if (
        !paymentResult.razorpay_payment_id ||
        !paymentResult.razorpay_order_id ||
        !paymentResult.razorpay_signature
      ) {
        console.error("❌ Incomplete payment response:", paymentResult);
        throw new Error("Incomplete payment response from Razorpay");
      }

      return paymentResult;
    } catch (error) {
      console.error("❌ Error opening checkout:", error);

      // Check if it's a network error vs Razorpay error
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "NETWORK_ERROR") {
          throw new Error(
            "Network error. Please check your internet connection."
          );
        } else if (error.code === "PAYMENT_CANCELLED") {
          throw new Error("Payment was cancelled by user");
        }
      }

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

  // Additional method to get payment details
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

  // Method to get payment history
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

  // Method to request refund
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

export default RazorpayService;
export const razorpayService = new RazorpayService();


// // RazorpayService.ts
// import { BASE_URL } from "@/config/config";
// import { Platform } from "react-native";

// // Dynamic import to handle module availability
// let RazorpayCheckout: any = null;

// const loadRazorpayModule = () => {
//   if (RazorpayCheckout) return RazorpayCheckout;

//   try {
//     const module = require("react-native-razorpay");
//     RazorpayCheckout = module.default || module;
//     console.log("✅ RazorpayCheckout loaded successfully");
//     return RazorpayCheckout;
//   } catch (error) {
//     console.warn("⚠️ react-native-razorpay module not available:", error);
//     return null;
//   }
// };

// interface OrderData {
//   amount: number;
//   email: string;
//   phone?: string;
//   name: string;
//   description?: string;
// }

// interface Order {
//   id: string;
//   amount: number;
//   currency: string;
//   receipt: string;
// }

// interface Customer {
//   name: string;
//   email: string;
//   phone?: string;
// }

// interface PaymentResult {
//   razorpay_payment_id: string;
//   razorpay_order_id: string;
//   razorpay_signature: string;
// }

// interface VerificationResponse {
//   success: boolean;
//   verified: boolean;
//   payment?: any;
//   message?: string;
// }

// interface FundingData {
//   totalAmount: number;
//   goal: number;
//   progress: number;
//   contributorsCount: number;
//   recentPayments?: Array<{
//     amount: number;
//     date: string;
//     contributor: string;
//   }>;
// }

// interface FundingResponse {
//   success: boolean;
//   data: FundingData;
//   message?: string;
// }

// class RazorpayService {
//   private keyId = "rzp_test_6ITP2WNiZs5MNO";
//   // Use appropriate URL based on your setup
//   private backendURL = `${BASE_URL}/api`; // Android emulator
//   // private backendURL = 'http://192.168.1.XXX:2001/api'; // Physical device - replace XXX with your IP

//   // Method to update backend URL for production
//   setBackendURL(url: string): void {
//     this.backendURL = url;
//   }

//   // Method to update key ID
//   setKeyId(keyId: string): void {
//     this.keyId = keyId;
//   }

//   // Check if Razorpay is available
//   isRazorpayAvailable(): boolean {
//     try {
//       const module = loadRazorpayModule();
//       const isAvailable = !!(module && typeof module.open === "function");
//       console.log("🔍 Razorpay availability check:", {
//         moduleExists: !!module,
//         hasOpenMethod: module ? typeof module.open === "function" : false,
//         isAvailable,
//       });
//       return isAvailable;
//     } catch (error) {
//       console.error("Error checking Razorpay availability:", error);
//       return false;
//     }
//   }

//   // Test backend connectivity
//   async testConnection(): Promise<boolean> {
//     try {
//       console.log("🔄 Testing backend connection...");
//       const response = await fetch(
//         `${this.backendURL.replace("/api", "")}/health`,
//         {
//           method: "GET",
//           headers: {
//             Accept: "application/json",
//           },
//         }
//       );

//       if (response.ok) {
//         const data = await response.json();
//         console.log("✅ Backend connection successful:", data);
//         return true;
//       } else {
//         console.error("❌ Backend connection failed:", response.status);
//         return false;
//       }
//     } catch (error) {
//       console.error("❌ Backend connection error:", error);
//       return false;
//     }
//   }

//   // NEW: Get current funding information
//   async getCurrentFunding(): Promise<FundingData> {
//     try {
//       console.log("🔄 Fetching current funding data...");
      
//       const response = await fetch(`${this.backendURL}/funding/current`, {
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//         },
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
//         console.error("❌ Server error response:", errorData);
//         throw new Error(
//           errorData.message || `HTTP error! status: ${response.status}`
//         );
//       }

//       const data: FundingResponse = await response.json();
//       console.log("📥 Funding response data:", data);

//       if (!data.success) {
//         throw new Error(data.message || "Failed to fetch funding data");
//       }

//       console.log("✅ Funding data fetched successfully:", data.data);
//       return data.data;
//     } catch (error) {
//       console.error("❌ Error fetching funding data:", error);
//       throw new Error(
//         `Failed to fetch funding data: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }

//   // NEW: Get funding statistics
//   async getFundingStats(): Promise<any> {
//     try {
//       console.log("🔄 Fetching funding statistics...");
      
//       const response = await fetch(`${this.backendURL}/funding/stats`, {
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//         },
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
//         throw new Error(
//           errorData.message || `HTTP error! status: ${response.status}`
//         );
//       }

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message || "Failed to fetch funding statistics");
//       }

//       return data.data;
//     } catch (error) {
//       console.error("❌ Error fetching funding statistics:", error);
//       throw new Error(
//         `Failed to fetch funding statistics: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }

//   // NEW: Update funding after successful payment
//   async updateFundingAfterPayment(paymentId: string, amount: number): Promise<any> {
//     try {
//       console.log("🔄 Updating funding after payment:", { paymentId, amount });
      
//       const response = await fetch(`${this.backendURL}/funding/update`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({
//           payment_id: paymentId,
//           amount: amount,
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
//         throw new Error(
//           errorData.message || `HTTP error! status: ${response.status}`
//         );
//       }

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message || "Failed to update funding");
//       }

//       console.log("✅ Funding updated successfully:", data);
//       return data;
//     } catch (error) {
//       console.error("❌ Error updating funding:", error);
//       throw new Error(
//         `Failed to update funding: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }

//   async createOrder(
//     amount: number,
//     email: string,
//     phone: string | undefined,
//     name: string,
//     description?: string
//   ): Promise<Order> {
//     try {
//       console.log("🔄 Creating order with data:", {
//         amount,
//         email,
//         phone,
//         name,
//         description,
//       });
//       console.log("🌐 Backend URL:", this.backendURL);

//       const requestBody = {
//         amount,
//         email,
//         phone: phone || "",
//         name,
//         description: description || "Payment for services",
//         currency: "INR",
//       };

//       console.log("📤 Request body:", requestBody);

//       const response = await fetch(`${this.backendURL}/create-order`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify(requestBody),
//       });

//       console.log("📥 Response status:", response.status);
//       console.log("📥 Response headers:", response.headers);

//       if (!response.ok) {
//         const errorData = await response
//           .json()
//           .catch(() => ({ message: "Unknown error" }));
//         console.error("❌ Server error response:", errorData);
//         throw new Error(
//           errorData.message || `HTTP error! status: ${response.status}`
//         );
//       }

//       const data = await response.json();
//       console.log("📥 Response data:", data);

//       if (!data.success) {
//         throw new Error(data.message || "Failed to create order");
//       }

//       console.log("✅ Order created successfully:", data.order);
//       return data.order;
//     } catch (error) {
//       console.error("❌ Error creating order:", error);
//       console.error("❌ Error details:", {
//         message: error instanceof Error ? error.message : "Unknown error",
//         stack: error instanceof Error ? error.stack : undefined,
//       });
//       throw new Error(
//         `Failed to create order: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }

//   async openCheckout(order: Order, customer: Customer): Promise<PaymentResult> {
//     try {
//       console.log("🔄 Opening checkout with order:", order);
//       console.log("🔄 Customer info:", customer);
//       console.log("📱 Platform:", Platform.OS);

//       // Check if RazorpayCheckout is available
//       const razorpayModule = loadRazorpayModule();
//       if (!razorpayModule || typeof razorpayModule.open !== "function") {
//         throw new Error(
//           "RazorpayCheckout is not properly initialized. Please check if the module is correctly installed and linked. You may need to rebuild your app."
//         );
//       }

//       // Validate order data
//       if (!order.id) {
//         throw new Error("Order ID is required for payment");
//       }

//       const options = {
//         key: this.keyId,
//         amount: order.amount,
//         currency: order.currency || "INR",
//         order_id: order.id,
//         name: "Razorpay Test App", // Change this to your app name
//         description: "Payment for services",
//         prefill: {
//           name: customer.name,
//           email: customer.email,
//           ...(customer.phone && { contact: customer.phone }),
//         },
//         theme: {
//           color: "#3399cc",
//         },
//         modal: {
//           ondismiss: () => {
//             console.log("⚠️ Payment modal dismissed by user");
//             throw new Error("Payment cancelled by user");
//           },
//         },
//       };

//       console.log("💳 Razorpay options:", options);
//       console.log("🔄 Calling RazorpayCheckout.open...");

//       const paymentResult = await razorpayModule.open(options);
//       console.log("✅ Payment result:", paymentResult);

//       if (
//         !paymentResult.razorpay_payment_id ||
//         !paymentResult.razorpay_order_id ||
//         !paymentResult.razorpay_signature
//       ) {
//         console.error("❌ Incomplete payment response:", paymentResult);
//         throw new Error("Incomplete payment response from Razorpay");
//       }

//       return paymentResult;
//     } catch (error) {
//       console.error("❌ Error opening checkout:", error);

//       // Check if it's a network error vs Razorpay error
//       if (error && typeof error === "object" && "code" in error) {
//         if (error.code === "NETWORK_ERROR") {
//           throw new Error(
//             "Network error. Please check your internet connection."
//           );
//         } else if (error.code === "PAYMENT_CANCELLED") {
//           throw new Error("Payment was cancelled by user");
//         }
//       }

//       throw new Error(
//         `Payment failed: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }

//   async verifyPayment(
//     payment_id: string,
//     order_id: string,
//     signature: string
//   ): Promise<VerificationResponse> {
//     try {
//       console.log("🔄 Verifying payment:", { payment_id, order_id, signature });

//       const response = await fetch(`${this.backendURL}/verify-payment`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({
//           payment_id,
//           order_id,
//           signature,
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(
//           errorData.message || `HTTP error! status: ${response.status}`
//         );
//       }

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message || "Payment verification failed");
//       }

//       console.log("✅ Payment verification response:", data);
//       return data;
//     } catch (error) {
//       console.error("❌ Error verifying payment:", error);
//       throw new Error(
//         `Payment verification failed: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }

//   // Additional method to get payment details
//   async getPaymentDetails(paymentId: string): Promise<any> {
//     try {
//       const response = await fetch(`${this.backendURL}/payment/${paymentId}`, {
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//         },
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message || "Failed to fetch payment details");
//       }

//       return data.payment;
//     } catch (error) {
//       console.error("Error fetching payment details:", error);
//       throw new Error(
//         `Failed to fetch payment details: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }

//   // Method to get payment history
//   async getPaymentHistory(
//     email?: string,
//     page: number = 1,
//     limit: number = 10
//   ): Promise<any> {
//     try {
//       const params = new URLSearchParams();
//       if (email) params.append("email", email);
//       params.append("page", page.toString());
//       params.append("limit", limit.toString());

//       const response = await fetch(`${this.backendURL}/payments?${params}`, {
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//         },
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message || "Failed to fetch payment history");
//       }

//       return data;
//     } catch (error) {
//       console.error("Error fetching payment history:", error);
//       throw new Error(
//         `Failed to fetch payment history: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }

//   // Method to request refund
//   async requestRefund(
//     paymentId: string,
//     amount?: number,
//     reason?: string
//   ): Promise<any> {
//     try {
//       const response = await fetch(`${this.backendURL}/refund`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({
//           payment_id: paymentId,
//           amount: amount,
//           reason: reason || "Customer request",
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(
//           errorData.message || `HTTP error! status: ${response.status}`
//         );
//       }

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message || "Refund request failed");
//       }

//       return data;
//     } catch (error) {
//       console.error("Error requesting refund:", error);
//       throw new Error(
//         `Refund request failed: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   }
// }

// export default RazorpayService;
// export const razorpayService = new RazorpayService();