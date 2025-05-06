import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as ipaddr from 'ipaddr.js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Enhanced IP address matching function that handles exact matches and CIDR notation
 * @param deviceIp The device's IP address to check
 * @param targetIp The target IP address or range to compare with
 * @returns True if the device IP is within the target IP range
 */
export const isIpInRange = (deviceIp: string, targetIp: string): boolean => {
  try {
    // Trim inputs to handle any potential whitespace
    const cleanDeviceIp = deviceIp.trim();
    const cleanTargetIp = targetIp.trim();
    
    // Add more detailed logging
    console.log(`Comparing device IP: "${cleanDeviceIp}" with policy IP: "${cleanTargetIp}"`);
    
    // Check for exact match first (most common case)
    if (cleanDeviceIp === cleanTargetIp) {
      console.log(`IP exact match found: ${cleanDeviceIp} matches ${cleanTargetIp}`);
      return true;
    }
    
    // Handle CIDR notation (e.g., "192.168.1.0/24")
    if (cleanTargetIp.includes('/')) {
      // Simple string-based check for partial matches
      const baseIp = cleanTargetIp.split('/')[0];
      const mask = parseInt(cleanTargetIp.split('/')[1], 10);
      
      // For IP addresses like 64.209.154.154, check if they match the base
      if (mask >= 24 && cleanDeviceIp.startsWith(baseIp.substring(0, baseIp.lastIndexOf('.')))) {
        console.log(`IP subnet match found: ${cleanDeviceIp} is within ${cleanTargetIp}`);
        return true;
      }
      
      // Try to use ipaddr.js if available
      try {
        const deviceAddr = ipaddr.parse(cleanDeviceIp);
        const targetAddr = ipaddr.parseCIDR(cleanTargetIp);
        const result = deviceAddr.match(targetAddr);
        console.log(`IP advanced match check: ${cleanDeviceIp} in ${cleanTargetIp} = ${result}`);
        return result;
      } catch (parseError) {
        console.warn(`Advanced IP parsing failed: ${parseError}. Falling back to simpler methods.`);
      }
    }
    
    // For other formats like wildcard (e.g., "64.209.154.*")
    if (cleanTargetIp.includes('*')) {
      const targetParts = cleanTargetIp.split('.');
      const deviceParts = cleanDeviceIp.split('.');
      
      if (targetParts.length !== 4 || deviceParts.length !== 4) {
        return false;
      }
      
      for (let i = 0; i < 4; i++) {
        if (targetParts[i] !== '*' && targetParts[i] !== deviceParts[i]) {
          return false;
        }
      }
      
      console.log(`IP wildcard match found: ${cleanDeviceIp} matches ${cleanTargetIp}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking IP match:`, error);
    return false;
  }
};
