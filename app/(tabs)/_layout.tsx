// import { Ionicons } from "@expo/vector-icons";
// import { Tabs } from "expo-router";
// import React from "react";
// import { Platform } from "react-native";

// export default function TabLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: "#00FF00",
//         tabBarInactiveTintColor: "#666",
//         tabBarStyle: {
//           backgroundColor: "#111",
//           borderTopWidth: 1,
//           borderTopColor: "#333",
//           paddingBottom: Platform.OS === 'android' ? 10 : 5,
//           paddingTop: 5,
//           height: Platform.OS === 'android' ? 70 : 60,
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           fontWeight: "500",
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="home"
//         options={{
//           title: "Home",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="home" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="info"
//         options={{
//           title: "Info",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="information-circle" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="chat"
//         options={{
//           title: "Chat",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="chatbubbles" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: "Profile",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="person" size={size} color={color} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// } 


import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, SafeAreaView, StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <SafeAreaView style={styles.safeArea}>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#00FF00",
          tabBarInactiveTintColor: "#666",
          tabBarStyle: {
            backgroundColor: "#111",
            borderTopWidth: 1,
            borderTopColor: "#333",
            paddingBottom: Platform.OS === 'android' ? 10 : 5,
            paddingTop: 5,
            height: Platform.OS === 'android' ? 70 : 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="info"
          options={{
            title: "Info",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="information-circle" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#111", // Match tab bar background to avoid white flicker
  },
});
