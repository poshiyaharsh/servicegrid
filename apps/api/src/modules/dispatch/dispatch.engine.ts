export interface WorkingHoursWindow {
  startHour: number;
  endHour: number;
}

export interface DispatchTechnicianProfile {
  id: string;
  userId: string;
  displayName: string;
  homeLat: number | null;
  homeLng: number | null;
  skills: string[];
  workingHours: WorkingHoursWindow;
  hasRequiredInventory?: boolean;
}

export interface TimeSlot {
  startAt: Date;
  endAt: Date;
  status: string;
}

export interface RouteStop {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function estimateTravelMinutes(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null,
  avgUrbanSpeedKmh = 25,
): { distanceKm: number; travelMinutes: number } {
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return { distanceKm: 0, travelMinutes: 20 };
  }
  const distanceKm = Number(haversineKm(lat1, lng1, lat2, lng2).toFixed(2));
  const travelMinutes = Math.max(5, Math.round((distanceKm / avgUrbanSpeedKmh) * 60));
  return { distanceKm, travelMinutes };
}

export function checkTechnicianAvailability(
  tech: DispatchTechnicianProfile,
  startAt: Date,
  endAt: Date,
  leaves: TimeSlot[],
  appointments: TimeSlot[],
): { available: boolean; reason?: string } {
  const startHour = startAt.getUTCHours();
  const endHour = endAt.getUTCHours() + (endAt.getUTCMinutes() > 0 ? 1 : 0);
  if (startHour < tech.workingHours.startHour || endHour > tech.workingHours.endHour) {
    return { available: false, reason: 'Outside technician working hours' };
  }

  const overlaps = (slot: TimeSlot) => slot.startAt < endAt && slot.endAt > startAt;

  if (leaves.some((l) => l.status === 'APPROVED' && overlaps(l))) {
    return { available: false, reason: 'Technician is on approved leave' };
  }

  if (appointments.some((a) => a.status === 'SCHEDULED' && overlaps(a))) {
    return { available: false, reason: 'Technician has an overlapping appointment' };
  }

  return { available: true };
}

export function scoreTechnicianForJob(input: {
  technician: DispatchTechnicianProfile;
  requiredSkills: string[];
  available: boolean;
  jobLat: number | null;
  jobLng: number | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  slaDueAt: Date | null;
  hasRequiredInventory: boolean;
}) {
  const matchedSkills = input.requiredSkills.filter((s) =>
    input.technician.skills.includes(s),
  );
  const skillScore =
    input.requiredSkills.length === 0
      ? 30
      : Math.round((matchedSkills.length / input.requiredSkills.length) * 30);

  const availabilityScore = input.available ? 25 : 0;

  const { distanceKm, travelMinutes } = estimateTravelMinutes(
    input.technician.homeLat,
    input.technician.homeLng,
    input.jobLat,
    input.jobLng,
  );
  const distanceScore = Math.max(0, 20 - Math.round(distanceKm));

  const priorityBonus =
    input.priority === 'URGENT' ? 10 : input.priority === 'HIGH' ? 8 : input.priority === 'MEDIUM' ? 5 : 3;

  const slaHoursLeft = input.slaDueAt
    ? (input.slaDueAt.getTime() - Date.now()) / (1000 * 60 * 60)
    : 24;
  const slaScore = slaHoursLeft <= 4 ? 5 : 3;

  const inventoryScore = input.hasRequiredInventory ? 10 : 0;

  return {
    technicianId: input.technician.id,
    displayName: input.technician.displayName,
    totalScore:
      skillScore + availabilityScore + distanceScore + priorityBonus + slaScore + inventoryScore,
    available: input.available,
    missingSkills: input.requiredSkills.filter((s) => !input.technician.skills.includes(s)),
    distanceKm,
    estimatedTravelMinutes: travelMinutes,
  };
}

export function optimizeRoute(
  originLat: number,
  originLng: number,
  stops: RouteStop[],
): { orderedStops: RouteStop[]; totalDistanceKm: number; totalTravelMinutes: number } {
  const remaining = [...stops];
  const orderedStops: RouteStop[] = [];
  let curLat = originLat;
  let curLng = originLng;
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i]!;
      const d = haversineKm(curLat, curLng, stop.lat, stop.lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    const est = estimateTravelMinutes(curLat, curLng, next.lat, next.lng);
    totalDistanceKm += est.distanceKm;
    totalTravelMinutes += est.travelMinutes;
    orderedStops.push(next);
    curLat = next.lat;
    curLng = next.lng;
  }

  return {
    orderedStops,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalTravelMinutes,
  };
}
