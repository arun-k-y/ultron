// import React from "react";
// import { Stack } from "expo-router";
// import { AuthProvider } from "./context/AuthContext";

// export default function RootLayout() {
//   return (
//     <AuthProvider>
//       <Stack
//         screenOptions={{
//           headerShown: false,
//         }}
//       >
//         <Stack.Screen name="index" />
//         <Stack.Screen name="(tabs)" />
//         <Stack.Screen name="login" />
//         <Stack.Screen name="signup" />
//       </Stack>
//     </AuthProvider>
//   );
// }


import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
          </Stack>
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // optional: matches your app's theme
  },
});
