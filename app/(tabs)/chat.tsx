import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { chatService } from "../../ChatService";
import {
  ChatUser,
  webSocketService
} from "../../WebSocketService";
import { useAuth } from "../context/AuthContext";

interface Message {
  id: string;
  text: string;
  sender: string;
  senderName: string;
  timestamp: Date;
  type: "message" | "system";
}

interface User {
  id: string;
  name: string;
  email: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState("general"); // Default room
  const { user, tokens } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (user && tokens?.accessToken) {
      connectWebSocket();
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [user, tokens]);

  const connectWebSocket = async () => {
    try {
      setIsLoading(true);
      await webSocketService.connect(tokens!.accessToken);
      setIsConnected(true);

      // Set up message handlers
      setupMessageHandlers();

      // Join the default room
      joinRoom(currentRoomId);

      // Load existing messages
      await loadMessages();
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      Alert.alert("Connection Error", "Failed to connect to chat server");
    } finally {
      setIsLoading(false);
    }
  };

  const setupMessageHandlers = () => {
    // Handle new messages
    webSocketService.on("new_message", (data: any) => {
      console.log("Received new message:", data);
      const newMessage: Message = {
        id: data.id,
        text: data.text,
        sender: data.sender,
        senderName: data.senderName,
        timestamp: new Date(data.timestamp),
        type: "message",
      };

      console.log("Adding message to state:", newMessage);
      setMessages((prev) => [...prev, newMessage]);
    });

    // Handle room users update
    webSocketService.on("room_users", (data: any) => {
      if (data.roomId === currentRoomId) {
        setUsers(data.users || []);
      }
    });

    // Handle user joined
    webSocketService.on("user_joined", (data: any) => {
      if (data.roomId === currentRoomId) {
        const systemMessage: Message = {
          id: `join_${Date.now()}`,
          text: `${data.userName} joined the room`,
          sender: "system",
          senderName: "System",
          timestamp: new Date(),
          type: "system",
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    });

    // Handle user left
    webSocketService.on("user_left", (data: any) => {
      if (data.roomId === currentRoomId) {
        const systemMessage: Message = {
          id: `leave_${Date.now()}`,
          text: `${data.userName} left the room`,
          sender: "system",
          senderName: "System",
          timestamp: new Date(),
          type: "system",
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    });

    // Handle authentication success
    webSocketService.on("auth_success", (data: any) => {
      console.log("WebSocket authenticated successfully");
    });
  };

  const joinRoom = (roomId: string) => {
    if (isConnected) {
      webSocketService.joinRoom(roomId);
      setCurrentRoomId(roomId);
    }
  };

  const loadMessages = async () => {
    try {
      console.log("Loading messages for room:", currentRoomId);
      const response = await chatService.getMessages(
        tokens!.accessToken,
        currentRoomId
      );
      console.log("Loaded messages:", response.messages.length);

      const formattedMessages: Message[] = response.messages.map(
        (msg: any) => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          senderName: msg.senderName,
          timestamp: new Date(msg.timestamp),
          type: msg.type || "message",
        })
      );

      setMessages(formattedMessages);

      // If no messages, add a welcome message
      if (formattedMessages.length === 0) {
        setMessages([
          {
            id: "welcome",
            text: "Welcome to the chat! Start a conversation.",
            sender: "system",
            senderName: "System",
            timestamp: new Date(),
            type: "system",
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      // Add a welcome message if no messages loaded
      setMessages([
        {
          id: "welcome",
          text: "Welcome to the chat! Start a conversation.",
          sender: "system",
          senderName: "System",
          timestamp: new Date(),
          type: "system",
        },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !user || isSending || !isConnected) return;

    const messageText = inputText.trim();
    console.log("Sending message:", {
      messageText,
      roomId: currentRoomId,
      isConnected,
    });

    setInputText("");
    setIsSending(true);

    try {
      // Send via WebSocket for real-time
      webSocketService.sendMessage(currentRoomId, messageText);
      console.log("Message sent via WebSocket");

      // Also send via API for persistence
      await chatService.sendMessage(
        tokens!.accessToken,
        currentRoomId,
        messageText
      );
      console.log("Message sent via API");
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message");
      // Restore the input text
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser =
      item.sender === user?._id || item.senderName === user?.name;

    if (item.type === "system") {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessage}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}
      >
        {!isCurrentUser && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}

        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isCurrentUser ? { color: "#000" } : { color: "#00FF00" },
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00FF00" />
          <Text style={styles.loadingText}>Connecting to chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.roomName}>Chat</Text>
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? "#00FF00" : "#F44336" },
              ]}
            />
            <Text style={styles.onlineCount}>
              {isConnected ? `${users.length} online` : "Disconnected"}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            keyboardShouldPersistTaps="handled"
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={1000}
              editable={isConnected}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending || !isConnected) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isSending || !isConnected}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() && isConnected ? "#000" : "#C7C7CC"}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#fff",
  },
  header: {
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  roomName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#00FF00",
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineCount: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.8,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'space-between',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  currentUserMessage: {
    alignItems: "flex-end",
  },
  otherUserMessage: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    color: "#00FF00",
    marginBottom: 2,
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  currentUserBubble: {
    backgroundColor: "#00FF00",
  },
  otherUserBubble: {
    backgroundColor: "#333",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: "#000",
  },
  otherUserText: {
    color: "#fff",
  },
  timestamp: {
    // color: "#00FF00",
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  systemMessageContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  systemMessage: {
    fontSize: 12,
    color: "#00FF00",
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#00FF00",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#111",
    borderTopWidth: 1,
    borderTopColor: "#333",
    minHeight: 60,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#222",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    textAlignVertical: "center",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00FF00",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#333",
  },
});
