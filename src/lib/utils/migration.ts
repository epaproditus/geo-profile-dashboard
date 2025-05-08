// DEPRECATED - This migration system is no longer used
// Kept for historical reference only

import { supabase } from "@/lib/supabase";
import { toast } from "sonner"; 
import geofenceService, { Geofence } from "../services/geofence-service";

// Constants for localStorage keys
const POLICY_STORAGE_KEY = 'geo-profile-dashboard-policies';
const GEOFENCE_STORAGE_KEY = 'geo-profile-dashboard-geofences';

// Type definition for zone policies
interface ZonePolicy {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  locations: {
    displayName: string;
    latitude: number;
    longitude: number;
    radius: number;
    geofenceId: string;
  }[];
  ipRanges?: {
    displayName: string;
    ipAddress: string;
    geofenceId: string;
  }[];
  devices: {
    id: string;
    name: string;
  }[];
  profiles: {
    id: string;
    name: string;
  }[];
}

/**
 * Checks if there is data in localStorage that should be migrated to Supabase
 * and performs the migration if needed
 */
export const checkAndMigrateData = async (): Promise<{ migrated: boolean, policiesCount?: number, geofencesCount?: number }> => {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("No authenticated user, skipping migration");
    return { migrated: false };
  }

  // Track if any migrations were performed
  let anyMigrationPerformed = false;
  let policiesCount = 0;
  let geofencesCount = 0;

  // Migrate policies if needed
  const policyMigration = await migratePolicies(user.id);
  if (policyMigration.migrated) {
    anyMigrationPerformed = true;
    policiesCount = policyMigration.count || 0;
  }

  // Migrate geofences if needed
  const geofenceMigration = await migrateGeofences();
  if (geofenceMigration.migrated) {
    anyMigrationPerformed = true;
    geofencesCount = geofenceMigration.count || 0;
  }

  // Set overall migration flag if either migration was performed
  if (anyMigrationPerformed) {
    localStorage.setItem('supabase-migration-completed', 'true');
  }

  return { 
    migrated: anyMigrationPerformed, 
    policiesCount, 
    geofencesCount 
  };
};

/**
 * Migrate policies from localStorage to Supabase
 */
const migratePolicies = async (userId: string): Promise<{ migrated: boolean, count?: number }> => {
  // Check if we have policies in localStorage
  const localPolicies = loadPoliciesFromLocalStorage();
  if (!localPolicies || localPolicies.length === 0) {
    console.log("No local policies found to migrate");
    return { migrated: false };
  }

  // Check if we've already migrated policies by checking for a flag in localStorage
  const policyMigrationFlag = localStorage.getItem('supabase-policy-migration-completed');
  if (policyMigrationFlag === 'true') {
    console.log("Policy migration already completed");
    return { migrated: false };
  }

  // Check if there are already policies in Supabase for this user
  const { data: existingPolicies, error: fetchError } = await supabase
    .from('policies')
    .select('*')
    .eq('user_id', userId);

  if (fetchError) {
    console.error("Error checking for existing policies:", fetchError);
    return { migrated: false };
  }

  // If there are already policies in Supabase, ask the user before overwriting
  if (existingPolicies && existingPolicies.length > 0) {
    const shouldOverwrite = window.confirm(
      `You have ${existingPolicies.length} policies stored in the cloud and ${localPolicies.length} stored locally. ` +
      `Would you like to upload your local policies to the cloud? This will replace any existing cloud data.`
    );

    if (!shouldOverwrite) {
      console.log("User chose not to migrate local policies");
      return { migrated: false };
    }

    // Delete existing policies as user opted to replace them
    const { error: deleteError } = await supabase
      .from('policies')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error("Error deleting existing policies:", deleteError);
      toast.error("Failed to replace existing policies");
      return { migrated: false };
    }
  }

  // Migrate policies to Supabase
  const { error: insertError } = await supabase
    .from('policies')
    .insert(
      localPolicies.map(policy => ({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        is_default: policy.isDefault,
        locations: policy.locations,
        ip_ranges: policy.ipRanges || [],
        devices: policy.devices,
        profiles: policy.profiles,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    );

  if (insertError) {
    console.error("Error migrating policies to Supabase:", insertError);
    toast.error("Failed to migrate policies to the cloud");
    return { migrated: false };
  }

  // Set policy migration flag to avoid re-migrating
  localStorage.setItem('supabase-policy-migration-completed', 'true');
  
  // Show success toast
  toast.success(
    `Successfully migrated ${localPolicies.length} policies to the cloud`, 
    { duration: 5000 }
  );

  console.log(`Successfully migrated ${localPolicies.length} policies to Supabase`);
  return { migrated: true, count: localPolicies.length };
};

/**
 * Migrate geofences from localStorage to Supabase
 */
const migrateGeofences = async (): Promise<{ migrated: boolean, count?: number }> => {
  // Check if we've already migrated geofences
  const geofenceMigrationFlag = localStorage.getItem('supabase-geofence-migration-completed');
  if (geofenceMigrationFlag === 'true') {
    console.log("Geofence migration already completed");
    return { migrated: false };
  }

  // Check if we have geofences in localStorage
  const localGeofences = loadGeofencesFromLocalStorage();
  if (!localGeofences || localGeofences.length === 0) {
    console.log("No local geofences found to migrate");
    return { migrated: false };
  }

  // Use the geofence service to migrate the geofences
  const success = await geofenceService.migrateGeofencesToSupabase(localGeofences);
  
  if (!success) {
    console.error("Error during geofence migration");
    // Don't show a toast here as the service already shows error toasts
    return { migrated: false };
  }

  // Set geofence migration flag to avoid re-migrating
  localStorage.setItem('supabase-geofence-migration-completed', 'true');
  
  console.log(`Successfully migrated ${localGeofences.length} geofences to Supabase`);
  return { migrated: true, count: localGeofences.length };
};

/**
 * Helper function to load policies from localStorage
 */
const loadPoliciesFromLocalStorage = (): ZonePolicy[] => {
  try {
    const saved = localStorage.getItem(POLICY_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading policies from localStorage:', error);
  }
  return [];
};

/**
 * Helper function to load geofences from localStorage
 */
const loadGeofencesFromLocalStorage = (): Geofence[] => {
  try {
    const saved = localStorage.getItem(GEOFENCE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading geofences from localStorage:', error);
  }
  return [];
};
