import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/config/config";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: "@auth_access_token",
  REFRESH_TOKEN: "@auth_refresh_token",
  USER: "@auth_user",
};

class AuthService {
  public baseUrl = `${BASE_URL}/api`;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  // Get stored tokens
  public async getTokens(): Promise<AuthTokens | null> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      ]);

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
      return null;
    } catch (error) {
      console.error("Error getting tokens:", error);
      return null;
    }
  }

  // Store tokens
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
      ]);
    } catch (error) {
      console.error("Error storing tokens:", error);
      throw error;
    }
  }

  // Clear tokens
  private async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);
    } catch (error) {
      console.error("Error clearing tokens:", error);
    }
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens?.refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await this.storeTokens(data.tokens);
        return true;
      } else {
        await this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      await this.clearTokens();
      return false;
    }
  }

  // Make authenticated API request
  public async makeAuthenticatedRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const tokens = await this.getTokens();
      if (!tokens) {
        throw new Error("No authentication tokens available");
      }

      // Add authorization header
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.accessToken}`,
        ...options.headers,
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      // If token expired, try to refresh
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          const newTokens = await this.getTokens();
          if (newTokens) {
            const newHeaders = {
              ...headers,
              Authorization: `Bearer ${newTokens.accessToken}`,
            };

            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              ...options,
              headers: newHeaders,
            });

            const retryData = await retryResponse.json();
            return {
              success: retryResponse.ok,
              data: retryData,
              message: retryData.message,
            };
          }
        }

        // If refresh failed, clear tokens and throw error
        await this.clearTokens();
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json();
      return {
        success: response.ok,
        data: data,
        message: data.message,
      };
    } catch (error) {
      console.error("Authenticated request error:", error);
      throw error;
    }
  }

  // Test backend connection
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl.replace("/api", "")}/health`
      );
      return response.ok;
    } catch (error) {
      console.error("Connection test error:", error);
      return false;
    }
  }

  // Create order (authenticated)
  public async createOrder(
    amount: number,
    description?: string,
    currency: string = "INR"
  ): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest("/create-order", {
        method: "POST",
        body: JSON.stringify({
          amount,
          description,
          currency,
        }),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to create order");
      }

      return response.data;
    } catch (error) {
      console.error("Create order error:", error);
      throw error;
    }
  }

  // Verify payment (authenticated)
  public async verifyPayment(
    paymentId: string,
    orderId: string,
    signature: string
  ): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest("/verify-payment", {
        method: "POST",
        body: JSON.stringify({
          payment_id: paymentId,
          order_id: orderId,
          signature: signature,
        }),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to verify payment");
      }

      return response.data;
    } catch (error) {
      console.error("Verify payment error:", error);
      throw error;
    }
  }

  // Get payment history (authenticated)
  public async getPaymentHistory(
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/payment-history`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch payment history");
      }

      return response.data;
    } catch (error) {
      console.error("Get payment history error:", error);
      throw error;
    }
  }

  // Get payment details (authenticated)
  public async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/payment/${paymentId}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch payment details");
      }

      return response.data;
    } catch (error) {
      console.error("Get payment details error:", error);
      throw error;
    }
  }

  // Process refund (authenticated)
  public async processRefund(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest("/refund", {
        method: "POST",
        body: JSON.stringify({
          payment_id: paymentId,
          amount,
          reason,
        }),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to process refund");
      }

      return response.data;
    } catch (error) {
      console.error("Process refund error:", error);
      throw error;
    }
  }

  // Get user profile (authenticated)
  public async getUserProfile(): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest("/auth/profile");

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch user profile");
      }

      return response.data;
    } catch (error) {
      console.error("Get user profile error:", error);
      throw error;
    }
  }

  // Get total funds (authenticated)
  public async getTotalFunds(): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest("/total-funds");

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch total funds");
      }

      return response.data;
    } catch (error) {
      console.error("Get total funds error:", error);
      throw error;
    }
  }
}

export default AuthService;
