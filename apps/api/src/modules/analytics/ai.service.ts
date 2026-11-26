import { Injectable } from '@nestjs/common';
import { loadConfig } from '@servicegrid/config';

export interface AiSuggestion<T> {
  provider: string;
  mode: 'DETERMINISTIC_FALLBACK' | 'CONFIGURED_LLM';
  requiresHumanApproval: true;
  canAutoFinalizeFinancialsOrJobs: false;
  result: T;
}

@Injectable()
export class AiIntelligenceService {
  getProviderStatus() {
    const provider = process.env.AI_PROVIDER ?? 'disabled';
    return {
      configuredProvider: provider,
      llmDependent: false,
      fallbackActive: provider === 'disabled',
    };
  }

  classifyComplaint(text: string): AiSuggestion<{
    category: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }> {
    const lower = text.toLowerCase();
    let category = 'GENERAL_MAINTENANCE';
    if (lower.includes('ac') || lower.includes('cooling') || lower.includes('compressor')) {
      category = 'HVAC_AC';
    } else if (lower.includes('ro') || lower.includes('water') || lower.includes('filter')) {
      category = 'RO_WATER_PURIFIER';
    } else if (lower.includes('cctv') || lower.includes('camera') || lower.includes('dvr')) {
      category = 'CCTV_SECURITY';
    } else if (lower.includes('solar') || lower.includes('inverter')) {
      category = 'SOLAR';
    }

    const urgency =
      lower.includes('spark') || lower.includes('fire') || lower.includes('hospital')
        ? 'URGENT'
        : lower.includes('not working') || lower.includes('leaking')
          ? 'HIGH'
          : 'MEDIUM';

    return this.wrap({ category, urgency });
  }

  voiceToServiceRequestDraft(transcript: string): AiSuggestion<{
    title: string;
    description: string;
    suggestedCategory: string;
    suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }> {
    const cls = this.classifyComplaint(transcript);
    const cleaned = transcript.trim();
    return this.wrap({
      title: cleaned.slice(0, 72) || 'Voice Service Request',
      description: cleaned,
      suggestedCategory: cls.result.category,
      suggestedPriority: cls.result.urgency,
    });
  }

  summarizeText(text: string, maxLength = 140): AiSuggestion<{ summary: string }> {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    const summary =
      trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1)}…`;
    return this.wrap({ summary });
  }

  suggestSpareParts(complaintText: string): AiSuggestion<{ suggestedParts: string[] }> {
    const lower = complaintText.toLowerCase();
    const parts: string[] = [];
    if (lower.includes('cooling') || lower.includes('compressor')) {
      parts.push('Dual Run Capacitor', 'R32 Refrigerant');
    }
    if (lower.includes('ro') || lower.includes('water')) {
      parts.push('Sediment Filter', 'RO Membrane');
    }
    if (parts.length === 0) parts.push('Standard Inspection Kit');
    return this.wrap({ suggestedParts: parts });
  }

  generateDailySummary(metrics: {
    totalJobs: number;
    completedJobs: number;
    pendingJobs: number;
    outstandingPayments: string;
  }): AiSuggestion<{ headline: string }> {
    return this.wrap({
      headline: `Daily Ops: ${metrics.completedJobs}/${metrics.totalJobs} jobs completed, ${metrics.pendingJobs} pending, ₹${metrics.outstandingPayments} outstanding.`,
    });
  }

  detectAnomalies(input: {
    cancelledJobsCount: number;
    totalJobsCount: number;
    lowStockCount: number;
    overdueSlaCount: number;
  }): AiSuggestion<{ anomalies: string[] }> {
    const anomalies: string[] = [];
    if (input.totalJobsCount > 0 && input.cancelledJobsCount / input.totalJobsCount > 0.25) {
      anomalies.push('High cancellation rate (>25% of total jobs)');
    }
    if (input.lowStockCount > 0) {
      anomalies.push(`${input.lowStockCount} spare part(s) at or below reorder threshold`);
    }
    if (input.overdueSlaCount > 0) {
      anomalies.push(`${input.overdueSlaCount} work order(s) breached SLA`);
    }
    return this.wrap({ anomalies });
  }

  private wrap<T>(result: T): AiSuggestion<T> {
    const cfg = loadConfig();
    void cfg;
    const provider = process.env.AI_PROVIDER ?? 'disabled';
    return {
      provider,
      mode: provider === 'disabled' ? 'DETERMINISTIC_FALLBACK' : 'CONFIGURED_LLM',
      requiresHumanApproval: true,
      canAutoFinalizeFinancialsOrJobs: false,
      result,
    };
  }
}
