import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  IRtcEngineEventHandler,
  RtcSurfaceView,
  RenderModeType,
  VideoSourceType,
} from 'react-native-agora';

import { supabase } from '@/lib/supabase';

type CallParams = {
  appointmentId?: string;
  roomId?: string;
  role?: string;
  vetName?: string;
  petName?: string;
};

type AgoraCredentials = {
  appId: string;
  token: string | null;
  uid: number;
};

const requestCallPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    PermissionsAndroid.PERMISSIONS.CAMERA,
  ]);

  return (
    result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED &&
    result[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED
  );
};

const parseParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function CallScreen() {
  const params = useLocalSearchParams<CallParams>();
  const router = useRouter();

  const appointmentId = parseParam(params.appointmentId);
  const roomId = (parseParam(params.roomId) || '').trim();
  const role = parseParam(params.role) === 'vet' ? 'vet' : 'owner';
  const vetName = parseParam(params.vetName) || 'Veterinarian';
  const petName = parseParam(params.petName) || 'your pet';

  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const cleanedUpRef = useRef(false);

  const resolveAgoraCredentials = useCallback(async () => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_API_URL;
    const fallbackAppId = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
    const fallbackToken = process.env.EXPO_PUBLIC_AGORA_TEMP_TOKEN || null;

    if (!backendUrl) {
      return {
        appId: fallbackAppId,
        token: fallbackToken,
        uid: 0,
      } satisfies AgoraCredentials;
    }

    try {
      // Deterministic UID per participant.
      // Same appointment + different roles must not share the same UID.
      let uid = 1; // Default to 1 (0 is reserved)
      if (appointmentId) {
        const identitySeed = `${appointmentId}:${role}`;
        // Simple hash: sum character codes modulo a large prime
        let hash = 0;
        for (let i = 0; i < identitySeed.length; i++) {
          hash = ((hash << 5) - hash) + identitySeed.charCodeAt(i);
          hash |= 0; // Convert to 32bit integer
        }
        uid = Math.abs(hash) % 2147483646 + 1; // Range 1-2147483646
      }

      const response = await fetch(`${backendUrl}/agora-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_name: roomId,
          uid: uid,
          role: 'broadcaster',
          expire_seconds: 3600,
        }),
      });

      if (!response.ok) {
        throw new Error('Call credentials request failed');
      }

      const payload = await response.json();
      const returnedUid = Number(payload?.uid) || uid;

      return {
        appId: String(payload?.app_id || fallbackAppId),
        token: payload?.token ? String(payload.token) : fallbackToken,
        uid: returnedUid,
      };
    } catch {
      setError('Unable to connect to consultation. Please try again.');
      return {
        appId: fallbackAppId,
        token: fallbackToken,
        uid: 0,
      };
    }
  }, [roomId, appointmentId, role]);

  const cleanupEngine = useCallback(async () => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    const engine = engineRef.current;
    const handler = handlerRef.current;

    if (!engine) return;

    try {
      // Stop local capture/publishing first so camera/mic shut down immediately.
      engine.stopPreview();
      engine.muteLocalAudioStream(true);
      engine.muteLocalVideoStream(true);
      engine.enableLocalVideo(false);

      if (handler) {
        engine.unregisterEventHandler(handler);
      }
      engine.leaveChannel();
      engine.release();
      engineRef.current = null;
      handlerRef.current = null;
    } catch {
      // Ignore cleanup errors while navigating away.
    }
  }, []);

  const markCompletedIfVet = useCallback(async () => {
    if (role !== 'vet' || !appointmentId) return;

    await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId)
      .eq('status', 'in_progress');
  }, [appointmentId, role]);

  const leaveCall = useCallback(
    async (markComplete: boolean) => {
      // Always teardown media immediately when leaving call.
      await cleanupEngine();

      // Do not block call teardown/navigation on DB updates.
      if (markComplete) {
        void markCompletedIfVet();
      }

      router.back();
    },
    [cleanupEngine, markCompletedIfVet, router],
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!roomId) {
        setError('Missing room ID for this call.');
        setLoading(false);
        return;
      }

      const granted = await requestCallPermissions();
      if (!granted) {
        setError('Camera and microphone permissions are required for video consultations.');
        setLoading(false);
        return;
      }

      const { appId, token, uid } = await resolveAgoraCredentials();

      if (!appId) {
        setError('Call service is currently unavailable.');
        setLoading(false);
        return;
      }

      if (!token) {
        setError('Call service is currently unavailable.');
        setLoading(false);
        return;
      }

      try {
        const engine = createAgoraRtcEngine();
        engineRef.current = engine;

        engine.initialize({ appId });

        engine.enableAudio();
        engine.enableVideo();
        engine.startPreview();

        const handler: IRtcEngineEventHandler = {
          onJoinChannelSuccess: () => {
            if (!cancelled) {
              setJoined(true);
              setLoading(false);
            }
          },
          onUserJoined: (_, remoteUid) => {
            if (!cancelled) {
              setRemoteUid(remoteUid);
            }
          },
          onUserOffline: (_, remoteUid) => {
            if (!cancelled) {
              setRemoteUid((current) => (current === remoteUid ? null : current));
            }
          },
          onError: (code, message) => {
            if (!cancelled) {
              setError('Connection issue detected. Please rejoin the call.');
            }
          },
        };

        handlerRef.current = handler;
        engine.registerEventHandler(handler);

        engine.joinChannel(token, roomId, uid, {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
          publishCameraTrack: true,
          publishMicrophoneTrack: true,
        });
      } catch {
        if (!cancelled) {
          setError('Unable to start the consultation call. Please try again.');
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
      void cleanupEngine();
    };
  }, [cleanupEngine, resolveAgoraCredentials, roomId, appointmentId, role]);

  const toggleMute = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const next = !muted;
    engine.muteLocalAudioStream(next);
    setMuted(next);
  };

  const toggleCamera = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const next = !cameraEnabled;
    engine.enableLocalVideo(next);
    setCameraEnabled(next);
  };

  const remoteStatusText = remoteUid
    ? 'Connected'
    : role === 'owner'
      ? `${vetName} has not joined yet`
      : `Owner of ${petName} has not joined yet`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{role === 'vet' ? `Consulting ${petName}` : `Call with ${vetName}`}</Text>
          <Text style={styles.subtitle}>Room: {roomId || 'Unavailable'}</Text>
        </View>
        <TouchableOpacity
          style={styles.endButton}
          onPress={() => {
            Alert.alert('End consultation', 'Do you want to leave this call?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Leave call',
                style: 'destructive',
                onPress: () => {
                  void leaveCall(role === 'vet');
                },
              },
            ]);
          }}
        >
          <Ionicons name="call" size={18} color="#FFF" />
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.stage}>
        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.stateText}>Connecting to consultation...</Text>
          </View>
        ) : remoteUid ? (
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{
              uid: remoteUid,
              renderMode: RenderModeType.RenderModeFit,
            }}
          />
        ) : (
          <View style={styles.centeredState}>
            <Ionicons name="person-circle-outline" size={72} color="#E5D6C5" />
            <Text style={styles.stateText}>{remoteStatusText}</Text>
          </View>
        )}

        <View style={styles.localPreviewWrap}>
          <RtcSurfaceView
            style={styles.localPreview}
            canvas={{
              uid: 0,
              sourceType: VideoSourceType.VideoSourceCamera,
              renderMode: RenderModeType.RenderModeHidden,
            }}
          />
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, muted && styles.controlButtonActive]} onPress={toggleMute}>
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, !cameraEnabled && styles.controlButtonActive]} onPress={toggleCamera}>
          <Ionicons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.livePill}>
          <View style={[styles.dot, joined ? styles.dotLive : null]} />
          <Text style={styles.liveText}>{joined ? 'Live' : 'Connecting'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B1713',
    paddingTop: 56,
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF8F0',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#CBB7A1',
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#A93D2F',
  },
  endButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: '#FFD7CF',
    backgroundColor: '#4A2622',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  stage: {
    flex: 1,
    backgroundColor: '#0D0B09',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    color: '#CBB7A1',
    fontSize: 14,
    fontWeight: '500',
  },
  remoteVideo: {
    flex: 1,
  },
  localPreviewWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 120,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#E5D6C5',
  },
  localPreview: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A261F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#A93D2F',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#2A261F',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  dotLive: {
    backgroundColor: '#4CAF50',
  },
  liveText: {
    color: '#CBB7A1',
    fontSize: 12,
    fontWeight: '600',
  },
});
