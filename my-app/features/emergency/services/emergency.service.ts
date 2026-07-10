// ============================================================================
// AI Voice SOS Module — Emergency Service (Fully Automatic Orchestrator)
// SafeSphere AI | Infinity Coders
// Fully Hands-Free AI Guardian Workflow
// ============================================================================

import {
  DecisionResult,
  EmergencyConfig,
  EmergencyEvent,
  EmergencyStatus,
  LocationData,
  NetworkStatus,
  OnEmergencyCallback,
  TimelineEntry,
} from '../types/emergency.types';
import { EmotionScore, SoundScore, SupportedLanguage } from '../../voice-sos/types/voice.types';
import {
  EMERGENCY_COOLDOWN_MS,
  MAX_TIMELINE_ENTRIES,
} from '../../voice-sos/utils/constants';
import { sosLogger } from '../../voice-sos/utils/logger';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { authService } from '../../../src/services/authService';

import { IEmergencyRepository } from '../interfaces/IEmergencyRepository';
import { IStorageService } from '../interfaces/IStorageService';
import { IGuardianRepository } from '../../guardian/interfaces/IGuardianRepository';
import { INotificationService } from '../../guardian/interfaces/INotificationService';
import { IWhatsAppService, ISMSService, IEmergencyCallingService } from '../../adapters/providers/IProviders';

const LOG_SOURCE = 'EmergencyService';

export interface EmergencyDependencies {
  emergencyRepo: IEmergencyRepository;
  storageService: IStorageService;
  evidenceService: any; // Using any here to avoid cyclic imports or just implement it
  guardianRepo: IGuardianRepository;
  notificationService: INotificationService;
  whatsAppService: IWhatsAppService;
  smsService: ISMSService;
  emergencyCallingService: IEmergencyCallingService;
}

/**
 * EmergencyService — Fully Automatic Hands-Free AI Workflow.
 * 
 * When confidence > 90%, it automatically executes 13 steps:
 * 1. Create Emergency Session
 * 2. Capture GPS
 * 3. Start Live Location Tracking
 * 4. Start Audio Recording
 * 5. Start Video Recording
 * 6. Capture Battery Percentage
 * 7. Capture Network Status
 * 8. Generate Emergency Timeline
 * 9. Trigger Guardian Notification Service
 * 10. Trigger Future WhatsApp Service Interface
 * 11. Trigger Future SMS Service Interface
 * 12. Trigger Future Emergency Calling Service
 * 13. Upload Evidence
 */
export class EmergencyService {
  private config: EmergencyConfig;
  private deps: EmergencyDependencies;

  private emergencyListeners: OnEmergencyCallback[] = [];
  private lastEmergencyTime: number = 0;
  private currentEmergency: EmergencyEvent | null = null;
  private emergencyCounter: number = 0;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: EmergencyDependencies, config?: Partial<EmergencyConfig>) {
    this.deps = deps;
    this.config = {
      autoDispatchTriggers: true,
      cooldownMs: EMERGENCY_COOLDOWN_MS,
      maxTimelineEntries: MAX_TIMELINE_ENTRIES,
      ...config,
    };

    sosLogger.debug(LOG_SOURCE, 'Fully Automatic EmergencyService Initialized');
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  async triggerEmergency(params: {
    decision: DecisionResult;
    emotionBreakdown: EmotionScore[];
    soundBreakdown: SoundScore[];
    location: LocationData | null;
    battery: number;
    network: NetworkStatus;
    keyword: string | null;
    speechText: string | null;
    language: SupportedLanguage;
    timeline: TimelineEntry[];
  }): Promise<EmergencyEvent> {
    if (this.currentEmergency && this.currentEmergency.status === EmergencyStatus.EMERGENCY) {
      sosLogger.info(LOG_SOURCE, 'Emergency already active. HACKATHON MODE: Allowing duplicate dispatch for testing.');
      // Proceed instead of returning early
    }
    
    if (this.isInCooldown()) {
      sosLogger.warn(LOG_SOURCE, 'Emergency trigger in cooldown period, HACKATHON MODE: Ignoring cooldown.');
      // Proceed instead of throwing error
    }

    this.emergencyCounter++;

    // Step 2, 6, 7, 8: Capture Context, GPS, Battery, Network, and Timeline
    const event = this.createEmergencyEvent(params);
    this.currentEmergency = event;
    this.lastEmergencyTime = Date.now();

    sosLogger.emergency(LOG_SOURCE, '🚨 FULLY AUTOMATIC AI EMERGENCY INITIATED', { id: event.id });

    // Step 1: Create Emergency Session
    await this.deps.emergencyRepo.createEmergencySession(event);

    // Fetch Guardians
    const guardians = await this.deps.guardianRepo.getRegisteredGuardians('current_user'); 

    // Step 3: Start Live Location Tracking
    this.startLiveLocationTracking(guardians, event.id);

    // Notify internal local listeners (e.g. UI)
    this.notifyListeners(event);

    // 🔴 NEW WORKFLOW: Build Complete Emergency Payload BEFORE dispatching WhatsApp/SMS
    this.buildAndDispatchCompletePayload(event.id, guardians, event).catch(e => 
      sosLogger.warn(LOG_SOURCE, 'Fatal error in payload building process', e)
    );

    return event;
  }

  // ─── Automated Workflow Implementations ─────────────────────────────────

  private async buildAndDispatchCompletePayload(eventId: string, guardians: any[], event: EmergencyEvent) {
    sosLogger.info(LOG_SOURCE, '🚨 IMMEDIATE DISPATCH MODE: Sending SMS first, then collecting evidence...');
    
    const phones = guardians.map(g => g.phone).filter(p => p);
    
    guardians.forEach((g, i) => {
      if (g.phone) {
        sosLogger.info(LOG_SOURCE, `Guardian ${i + 1}: ${g.phone}`);
      }
    });

    if (phones.length === 0) {
      sosLogger.warn(LOG_SOURCE, 'No guardian registered.');
      Alert.alert(
        "No Guardian Registered", 
        "Please add at least one trusted guardian in your profile before using AI SOS."
      );
      return; // Nothing to dispatch
    }

    let userName = "SafeSphere User";
    try {
      const userProfile = await authService.getUserProfile();
      if (userProfile && userProfile.fullName) {
        userName = userProfile.fullName;
      }
    } catch (e) {
      // ignore
    }

    // ─── Step 1: Get GPS quickly (5s timeout max) ─────────────────────────
    let finalLat: string | number = 'Unknown';
    let finalLng: string | number = 'Unknown';
    let finalMapLink = 'Location unavailable';
    let finalAddress = 'Location unavailable';

    try {
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        new Promise<null>(res => setTimeout(() => res(null), 5000))
      ]) as any;
      
      if (loc && loc.coords) {
        finalLat = loc.coords.latitude;
        finalLng = loc.coords.longitude;
        finalMapLink = `https://maps.google.com/?q=${finalLat},${finalLng}`;
        finalAddress = `Near ${finalLat.toFixed(5)}, ${finalLng.toFixed(5)}`;
      } else if (event.location) {
        finalLat = event.location.latitude;
        finalLng = event.location.longitude;
        finalMapLink = `https://maps.google.com/?q=${finalLat},${finalLng}`;
        finalAddress = `Near ${finalLat}, ${finalLng}`;
      }
    } catch {
      if (event.location) {
        finalLat = event.location.latitude;
        finalLng = event.location.longitude;
        finalMapLink = `https://maps.google.com/?q=${finalLat},${finalLng}`;
        finalAddress = `Near ${finalLat}, ${finalLng}`;
      }
    }

    // ─── Step 2: Build immediate message ──────────────────────────────────
    const timeStr = new Date(event.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const detectedConditions = event.keyword ? `Wake word "${event.keyword}" detected` : 'Emergency triggered';
    
    let msg = `🚨 SAFESPHERE EMERGENCY ALERT 🚨\n\n`;
    msg += `User: ${userName}\n`;
    msg += `Status: CRITICAL - DANGER DETECTED\n\n`;
    msg += `📍 Location: ${finalAddress}\n`;
    msg += `🗺️ Map: ${finalMapLink}\n`;
    msg += `🔋 Battery: ${event.battery !== undefined ? Math.round((event.battery <= 1 ? event.battery * 100 : event.battery)) + '%' : 'Unknown'}\n`;
    msg += `⏰ Time: ${timeStr}\n`;
    msg += `🧠 AI Confidence: ${event.confidenceScore}%\n`;
    msg += `⚠️ Trigger: ${detectedConditions}\n\n`;
    msg += `Please call/check on them immediately!`;

    const emergencyPayload = {
      userName,
      emergencyStatus: "CRITICAL - DANGER DETECTED",
      currentAddress: finalAddress,
      googleMapsLink: finalMapLink,
      currentTime: timeStr,
      aiConfidenceScore: event.confidenceScore.toString(),
      triggeredConditions: detectedConditions,
    };

    // ─── Step 3: DISPATCH IMMEDIATELY ─────────────────────────────────────
    sosLogger.info(LOG_SOURCE, '📤 Dispatching IMMEDIATE SMS/WhatsApp to guardians NOW...');
    
    const payloadEvent = { ...event, payload: emergencyPayload, customMessage: msg } as any;

    const results = await Promise.allSettled([
      this.deps.notificationService.sendEmergencyAlert(guardians, payloadEvent),
      this.deps.whatsAppService.sendWhatsAppAlert(phones, payloadEvent),
      this.deps.smsService.sendOfflineSMS(phones, payloadEvent),
    ]);
    
    sosLogger.info(LOG_SOURCE, '✅ IMMEDIATE Dispatch complete!', { results });

    // ─── Step 4: Collect evidence in background (non-blocking) ────────────
    this.startContinuousEvidenceLoop(eventId, guardians, phones, event, userName);
  }



  private startContinuousEvidenceLoop(eventId: string, guardians: any[], phones: string[], event: EmergencyEvent, userName: string) {
    sosLogger.info(LOG_SOURCE, 'Starting Continuous Background Evidence Loop (With 15-sec SMS Updates)...');
    
    // Detached promise, continuously records and uploads chunks while emergency is active
    (async () => {
      let chunkIndex = 1;
      while (this.currentEmergency && this.currentEmergency.status === EmergencyStatus.EMERGENCY && chunkIndex <= 5) {
        try {
          sosLogger.info(LOG_SOURCE, `Recording background evidence chunk ${chunkIndex}...`);
          
          // Record 15-second chunks in the background
          const evidencePromises = [this.deps.evidenceService.recordEvidence(15000)];
          if (this.deps.evidenceService.recordVideoEvidence) {
            evidencePromises.push(this.deps.evidenceService.recordVideoEvidence(15000));
          } else {
            evidencePromises.push(Promise.resolve(null));
          }
          
          const [audioUri, videoUri] = await Promise.all(evidencePromises);

          let audioUrl = '';
          let videoUrl = '';
          const uploadPromises = [];
          if (audioUri) uploadPromises.push(this.deps.storageService.uploadEvidence(eventId, `audio_chunk_${chunkIndex}_${Date.now()}.m4a`, audioUri, 'audio').then(url => { audioUrl = url; }));
          if (videoUri) uploadPromises.push(this.deps.storageService.uploadEvidence(eventId, `video_chunk_${chunkIndex}_${Date.now()}.mp4`, videoUri, 'video').then(url => { videoUrl = url; }));

          await Promise.all(uploadPromises);
          
          // Update Dashboard AND trigger Twilio/WhatsApp as per Hackathon request
          if (this.currentEmergency && this.currentEmergency.status === EmergencyStatus.EMERGENCY) {
             sosLogger.info(LOG_SOURCE, `Chunk ${chunkIndex} uploaded. Updating Dashboard and blasting 15-sec SMS...`);
             await this.deps.emergencyRepo.updateEmergencySession(eventId, {
                [`evidenceChunks.chunk${chunkIndex}`]: { audioUrl, videoUrl, timestamp: Date.now() },
                // Also update the main pointers to the latest chunk for convenience
                latestAudioUrl: audioUrl || null,
                latestVideoUrl: videoUrl || null,
             });

             // 🔴 SEND 15-SECOND REPEATED SMS/WHATSAPP ALERTS
             if (phones.length > 0) {
                const timeStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                let updateMsg = `🚨 *SAFESPHERE 15-SEC UPDATE* 🚨\n\n`;
                updateMsg += `*User:* ${userName}\n`;
                updateMsg += `*Status:* STILL IN DANGER\n`;
                updateMsg += `⏰ *Time:* ${timeStr}\n\n`;
                if (audioUrl) updateMsg += `🎙️ *New Audio (Last 15s):* ${audioUrl}\n`;
                if (videoUrl) updateMsg += `📹 *New Video (Last 15s):* ${videoUrl}\n`;

                const updatePayloadEvent = { ...event, customMessage: updateMsg } as any;

                // Fire SMS/WhatsApp continuously
                this.deps.whatsAppService.sendWhatsAppAlert(phones, updatePayloadEvent).catch(e => sosLogger.warn(LOG_SOURCE, '15-sec WhatsApp failed', e));
                this.deps.smsService.sendOfflineSMS(phones, updatePayloadEvent).catch(e => sosLogger.warn(LOG_SOURCE, '15-sec SMS failed', e));
             }
          }
          chunkIndex++;
        } catch (error) {
          sosLogger.warn(LOG_SOURCE, `Background evidence chunk ${chunkIndex} failed, retrying...`, { error });
          await new Promise(res => setTimeout(res, 3000));
        }
      }
      sosLogger.info(LOG_SOURCE, 'Continuous Background Evidence Loop Terminated.');
    })();
  }

  private startLiveLocationTracking(guardians: any[], eventId: string) {
    if (this.trackingInterval) clearInterval(this.trackingInterval);

    sosLogger.info(LOG_SOURCE, 'Starting Live Location Tracking...');

    // Simulate updating location every 5 seconds
    this.trackingInterval = setInterval(async () => {
      // Step 3: Poll location and send
      const simulatedLat = 22.123 + (Math.random() * 0.01);
      const simulatedLng = 73.123 + (Math.random() * 0.01);

      await this.deps.notificationService.sendLocationUpdate(guardians, eventId, simulatedLat, simulatedLng);
    }, 5000);
  }

  // ─── Utility Methods ────────────────────────────────────────────────────

  onEmergency(callback: OnEmergencyCallback): () => void {
    this.emergencyListeners.push(callback);
    return () => {
      this.emergencyListeners = this.emergencyListeners.filter(cb => cb !== callback);
    };
  }

  resolveEmergency(): void {
    if (this.currentEmergency) {
      this.currentEmergency.status = EmergencyStatus.RESOLVED;
      sosLogger.info(LOG_SOURCE, 'Emergency resolved', { id: this.currentEmergency.id });
      this.deps.emergencyRepo.resolveEmergencySession(this.currentEmergency.id, 'User Marked Safe');

      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }
    }
  }

  getCurrentEmergency(): EmergencyEvent | null { return this.currentEmergency; }
  getTimeline(): TimelineEntry[] { return sosLogger.getTimeline(); }
  isInCooldown(): boolean { return this.lastEmergencyTime > 0 && Date.now() - this.lastEmergencyTime < this.config.cooldownMs; }

  private createEmergencyEvent(params: any): EmergencyEvent {
    const fullTimeline = [...params.timeline, ...sosLogger.getTimeline()].sort((a, b) => a.timestamp - b.timestamp).slice(-this.config.maxTimelineEntries);
    return {
      id: `sos_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      status: EmergencyStatus.EMERGENCY,
      riskScore: Math.round((params.decision.signals.motionScore + params.decision.signals.locationScore + params.decision.signals.timeScore) / 3),
      panicScore: params.decision.signals.emotionScore,
      confidenceScore: params.decision.confidenceScore,
      keyword: params.keyword,
      speechText: params.speechText,
      language: params.language,
      location: params.location,
      timestamp: Date.now(),
      battery: params.battery,
      network: params.network,
      emotionBreakdown: params.emotionBreakdown,
      soundBreakdown: params.soundBreakdown,
      signals: params.decision.signals,
      timeline: fullTimeline,
    };
  }

  private notifyListeners(event: EmergencyEvent): void {
    for (const listener of this.emergencyListeners) {
      try { listener(event); } catch (e) { sosLogger.warn(LOG_SOURCE, 'Listener error', { error: String(e) }); }
    }
  }
}
