import React, { useRef, useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PermissionsAndroid,
} from "react-native";
import {
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
  ChannelProfileType,
  RtcConnection,
} from "react-native-agora";

const appId = "9929c39069d449f09ee336c44a087347";

export default function Index() {
  const agoraEngineRef = useRef<IRtcEngine>();
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [channelName, setChannelName] = useState("");

  // Request Android permissions
  const getPermission = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
    }
  };

  // Initialize Agora engine
  useEffect(() => {
    setupVideoSDKEngine();

    return () => {
      // Cleanup on unmount
      agoraEngineRef.current?.unregisterEventHandler({
        onJoinChannelSuccess: () => {},
        onUserJoined: () => {},
        onUserOffline: () => {},
      });
      agoraEngineRef.current?.release();
    };
  }, []);

  const setupVideoSDKEngine = async () => {
    try {
      if (Platform.OS === "android") {
        await getPermission();
      }

      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      // Register event handlers
      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: () => {
          setMessage("Successfully joined channel: " + channelName);
          setIsJoined(true);
        },
        onUserJoined: (_connection: RtcConnection, uid: number) => {
          setMessage("Remote user " + uid + " joined");
          setRemoteUsers((prev) => [...prev, uid]);
        },
        onUserOffline: (_connection: RtcConnection, uid: number) => {
          setMessage("Remote user " + uid + " left the channel");
          setRemoteUsers((prev) => prev.filter((id) => id !== uid));
        },
      });

      // Initialize the engine
      agoraEngine.initialize({
        appId: appId,
      });

      // Enable video
      agoraEngine.enableVideo();
    } catch (e) {
      console.log(e);
    }
  };

  const join = async () => {
    if (isJoined) {
      return;
    }
    if (!channelName) {
      setMessage("Please enter a channel name");
      return;
    }

    try {
      // Start preview
      agoraEngineRef.current?.startPreview();

      // Join channel
      agoraEngineRef.current?.joinChannel("", channelName, 0, {
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const leave = () => {
    try {
      agoraEngineRef.current?.leaveChannel();
      setRemoteUsers([]);
      setIsJoined(false);
      setMessage("Left the channel");
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pawsitive Video Call</Text>
        {isJoined && (
          <Text style={styles.userCount}>
            👥 {remoteUsers.length + 1} user{remoteUsers.length !== 0 ? 's' : ''} in call
          </Text>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContainer}
      >
        {isJoined ? (
          <>
            <View style={styles.videoContainer}>
              {/* Remote Users */}
              {remoteUsers.length > 0 ? (
                <View style={styles.remoteUsersContainer}>
                  {remoteUsers.map((uid) => (
                    <View key={uid} style={styles.remoteUserItem}>
                      <RtcSurfaceView
                        canvas={{ uid }}
                        style={styles.remoteVideo}
                      />
                      <Text style={styles.videoLabel}>User {uid}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.waitingContainer}>
                  <Text style={styles.waitingText}>
                    Waiting for others to join...
                  </Text>
                  <Text style={styles.waitingSubText}>
                    {remoteUsers.length} user(s) in channel
                  </Text>
                </View>
              )}

              {/* Local Video */}
              <View style={styles.localVideoContainer}>
                <React.Fragment key={0}>
                  <RtcSurfaceView canvas={{ uid: 0 }} style={styles.localVideo} />
                </React.Fragment>
                <Text style={styles.localVideoLabel}>You</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.leaveButton} onPress={leave}>
              <Text style={styles.buttonText}>Leave Channel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.joinContainer}>
            <TextInput
              style={styles.input}
              onChangeText={(text) => setChannelName(text)}
              placeholder="Enter Channel Name (e.g., test123)"
              value={channelName}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[
                styles.joinButton,
                !channelName && styles.buttonDisabled,
              ]}
              onPress={join}
              disabled={!channelName}
            >
              <Text style={styles.buttonText}>Join Channel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  userCount: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    marginBottom: 5,
  },
  message: {
    fontSize: 14,
    color: "#666",
  },
  scroll: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  joinContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  joinButton: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  videoContainer: {
    flex: 1,
    minHeight: 500,
  },
  remoteUsersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  remoteUserItem: {
    width: "48%",
    minWidth: 150,
    marginBottom: 10,
  },
  remoteVideo: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    backgroundColor: "#000",
  },
  videoLabel: {
    textAlign: "center",
    marginTop: 5,
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  waitingContainer: {
    width: "100%",
    height: 400,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  waitingText: {
    color: "#fff",
    fontSize: 16,
  },
  waitingSubText: {
    color: "#888",
    fontSize: 14,
    marginTop: 10,
  },
  localVideoContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  localVideo: {
    width: 120,
    height: 160,
    borderRadius: 10,
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  localVideoLabel: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  leaveButton: {
    backgroundColor: "#FF3B30",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
});
