import { EmergencyEvent } from '../../emergency/types/emergency.types';
import { IWhatsAppService, ISMSService } from './IProviders';
import { sosLogger } from '../../voice-sos/utils/logger';

const LOG_SOURCE = 'TwilioService';

// Backend URL for dispatch
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.90:3000';

export class TwilioService implements IWhatsAppService, ISMSService {

  /**
   * Send WhatsApp Alert via backend (Twilio)
   */
  async sendWhatsAppAlert(phoneNumbers: string[], event: EmergencyEvent): Promise<void> {
    const msg = (event as any).customMessage || 'SafeSphere Emergency Alert!';
    sosLogger.info(LOG_SOURCE, 'Attempting WhatsApp dispatch via backend...');

    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phones: phoneNumbers,
          customMessage: msg,
          type: 'whatsapp'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        sosLogger.info(LOG_SOURCE, 'Backend WhatsApp dispatch success', { results: data.results });
      } else {
        const err = await response.text();
        sosLogger.warn(LOG_SOURCE, 'Backend WhatsApp dispatch failed', { error: err });
      }
    } catch (e) {
      sosLogger.warn(LOG_SOURCE, 'Backend unreachable for WhatsApp', { error: String(e) });
    }
  }

  /**
   * Send SMS automatically via backend (Twilio/Vonage)
   * This is fully automatic and does NOT open the SMS composer
   */
  async sendOfflineSMS(phoneNumbers: string[], event: EmergencyEvent): Promise<void> {
    const msg = (event as any).customMessage || 'SafeSphere Emergency Alert!';
    
    sosLogger.info(LOG_SOURCE, '🚀 Attempting fully automatic SMS dispatch via backend...');

    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phones: phoneNumbers,
          customMessage: msg,
          type: 'sms'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        sosLogger.info(LOG_SOURCE, '✅ Backend SMS dispatch success', { results: data?.results });
      } else {
        const err = await response.text();
        sosLogger.warn(LOG_SOURCE, '❌ Backend SMS dispatch failed', { error: err });
      }
    } catch (e) {
      sosLogger.warn(LOG_SOURCE, '❌ Backend unreachable for SMS', { error: String(e) });
    }
  }
}
