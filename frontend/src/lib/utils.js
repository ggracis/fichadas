import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateString) {
  // Forzar que la fecha se interprete como hora local (no UTC)
  const date = new Date(dateString.replace(' ', 'T'));
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  })
}

export function formatDate(dateString) {
  const date = new Date(dateString.replace(' ', 'T'));
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  })
}

export function formatTime(dateString) {
  if (dateString instanceof Date) {
    return dateString.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    })
  }
  const date = new Date(dateString.replace(' ', 'T'));
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  })
}
