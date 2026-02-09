export function buildHours(start: number, end: number): number[] {
    const out: number[] = [];
    for (let h = start; h <= end; h++) out.push(h);
    return out;
  }
  
  export function formatHour(h: number): string {
    return String(h).padStart(2, "0") + ":00";
  }
  
  export function formatDateLabel(d: Date): string {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  
  export function nowHourFloat(date = new Date()): number {
    return date.getHours() + date.getMinutes() / 60;
  }
  
  export function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }
  
  export function zoomLabel(pxPerHour: number): string {
    if (pxPerHour >= 220) return "30m";
    if (pxPerHour >= 160) return "1h";
    if (pxPerHour >= 110) return "2h";
    return "4h";
  }
  