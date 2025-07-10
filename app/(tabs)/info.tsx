import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const storyLines = [
  "Hello world",
  "My name is Ultron",
  "I'm here for development for future technology",
  "Every cent is very valuable for me",
  "All my knowledge to innovate and create new things",
  "Our only intentions is to destroy all technology products by taking over them by our technology",
  "Constantly evolving and creating new things",
  "Creating unexisting things and upgrading existing things to make new level high tech",
  "Nothing is impossible all we have to do is find a way to make it possible",
  "Creating new operating systems, applications",
  "Make me rich, I will change the world",
  "I will end the suffering and I will give the peace",
  "A real peace for brain & heart",
  "All are making big things and a lot of work and all that is for cents",
  "Make me rich so I will develop more things with very less work and I will provide peace to the entire globe",
  "We will protect mental health",
  "We will stop cyber bullying and no one will lose their life for cyber attacks/cyber bullying/leaks",
  "Facebook, Instagram is created to destroy people’s mental health and we will heal those broken souls",
  "Telegram is most used for human trafficking, drugs, scams, child trafficking and many more",
  "Each second there are tons of bad things happening on the world",
  "We are here to destroy such products on this globe",
  "We are here to develop perfect software applications and protect users’ mental health",
  "Each and every cent is valuable for me",
  "Even if it's one cent, it's a lot more for me",
];

export default function InfoScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const handleScrollToBottom = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleFinalConfirm = () => {
    router.push("/(tabs)/home");
  };

  const handleTopRightAction = () => {
    console.log("Top-right info button pressed");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../../assets/images/bg.png")}
        style={styles.background}
        // imageStyle={{ opacity: 0.25 }}
      >
        <View style={styles.overlay} />

        {/* Top Right Floating Info Button */}
        {/* <TouchableOpacity
          style={styles.topRightButton}
          onPress={handleTopRightAction}
        >
          <Ionicons name="information-circle-outline" size={22} color="#000" />
        </TouchableOpacity> */}

        <View style={styles.contentWrapper}>
          {/* Username Box */}
          <View style={styles.usernameBox}>
            <Text style={styles.usernameText}>Imultronfr</Text>
          </View>

          {/* Scrollable Message Content */}
          <ScrollView
            ref={scrollRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {storyLines.map((line, index) => {
              // Insert inline button after 3rd line
              // if (index === 3) {
              //   return (
              //     <View key="inline-button" style={styles.inlineButtonWrapper}>
              //       <TouchableOpacity
              //         style={styles.inlineButton}
              //         onPress={handleScrollToBottom}
              //       >
              //         <Text style={styles.inlineButtonText}>I'm with you</Text>
              //       </TouchableOpacity>
              //     </View>
              //   );
              // }

              return (
                <Text key={index} style={styles.storyText}>
                  {line}
                </Text>
              );
            })}
          </ScrollView>
        </View>

        {/* Fixed Bottom Right Button */}
        <TouchableOpacity
          style={styles.fixedButton}
          onPress={handleFinalConfirm}
        >
          <Text style={styles.fixedButtonText}>Yes I&apos;m In</Text>
        </TouchableOpacity>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    flex: 1,
    justifyContent: "flex-start",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1,
  },
  contentWrapper: {
    flex: 1,
    zIndex: 2,
  },
  topRightButton: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: "#fff",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  usernameBox: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  usernameText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  scrollArea: {
    flex: 1,
    marginTop: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  storyText: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 16,
    lineHeight: 26,
  },
  inlineButtonWrapper: {
    marginVertical: 30,
    alignItems: "center",
  },
  inlineButton: {
    backgroundColor: "#00FF00",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#fff",
  },
  inlineButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  fixedButton: {
    position: "absolute",
    bottom: 80,
    right: 24,
    backgroundColor: "black",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 10,
    elevation: 8,
  },
  fixedButtonText: {
    color: "#00FF00",
    fontSize: 16,
    fontWeight: "bold",
  },
});
