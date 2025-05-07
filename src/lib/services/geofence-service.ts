import { supabase, geofencesDB } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Type for geofence objects
export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  zonePolicyId: string | null;
  created_at?: string; 
  updated_at?: string;
  user_id?: string;
}

// Storage keys for local storage fallback
export const GEOFENCE_STORAGE_KEY = 'geo-profile-dashboard-geofences';
export const GEOFENCE_MIGRATION_COMPLETE_KEY = 'geo-profile-dashboard-geofence-migration-complete';

// Default empty geofences array
export const defaultGeofences: Geofence[] = [];

class GeofenceService {
  // Get all geofences for the current user
  async getGeofences(): Promise<Geofence[]> {
    try {
      // Try to get geofences from Supabase if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const { data: geofences, error } = await geofencesDB.getGeofences();
        
        if (error) {
          console.error('Error fetching geofences from Supabase:', error);
          // Fall back to localStorage
          return this.getGeofencesFromLocalStorage();
        }
        
        return geofences || defaultGeofences;
      } else {
        // User not authenticated, use localStorage
        return this.getGeofencesFromLocalStorage();
      }
    } catch (error) {
      console.error('Error in getGeofences:', error);
      // Fall back to localStorage in case of any error
      return this.getGeofencesFromLocalStorage();
    }
  }
  
  // Get a geofence by ID
  async getGeofenceById(id: string): Promise<Geofence | null> {
    try {
      // Try to get from Supabase if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const { data: geofence, error } = await geofencesDB.getGeofence(id);
        
        if (error) {
          console.error('Error fetching geofence from Supabase:', error);
          // Fall back to localStorage
          const localGeofences = this.getGeofencesFromLocalStorage();
          return localGeofences.find(g => g.id === id) || null;
        }
        
        return geofence;
      } else {
        // User not authenticated, use localStorage
        const localGeofences = this.getGeofencesFromLocalStorage();
        return localGeofences.find(g => g.id === id) || null;
      }
    } catch (error) {
      console.error('Error in getGeofenceById:', error);
      // Fall back to localStorage in case of any error
      const localGeofences = this.getGeofencesFromLocalStorage();
      return localGeofences.find(g => g.id === id) || null;
    }
  }
  
  // Create a new geofence
  async createGeofence(geofence: Omit<Geofence, 'id'>): Promise<Geofence> {
    const newGeofence: Geofence = {
      id: uuidv4(),
      ...geofence
    };
    
    try {
      // Try to save to Supabase if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const { data: createdGeofence, error } = await geofencesDB.createGeofence(newGeofence);
        
        if (error) {
          console.error('Error creating geofence in Supabase:', error);
          // Fall back to localStorage
          return this.createGeofenceInLocalStorage(newGeofence);
        }
        
        return createdGeofence;
      } else {
        // User not authenticated, use localStorage
        return this.createGeofenceInLocalStorage(newGeofence);
      }
    } catch (error) {
      console.error('Error in createGeofence:', error);
      // Fall back to localStorage in case of any error
      return this.createGeofenceInLocalStorage(newGeofence);
    }
  }
  
  // Update an existing geofence
  async updateGeofence(geofence: Geofence): Promise<Geofence> {
    try {
      // Try to update in Supabase if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const { data: updatedGeofence, error } = await geofencesDB.updateGeofence(
          geofence.id, 
          {
            name: geofence.name,
            latitude: geofence.latitude,
            longitude: geofence.longitude,
            radius: geofence.radius,
            zonePolicyId: geofence.zonePolicyId
          }
        );
        
        if (error) {
          console.error('Error updating geofence in Supabase:', error);
          // Fall back to localStorage
          return this.updateGeofenceInLocalStorage(geofence);
        }
        
        return updatedGeofence;
      } else {
        // User not authenticated, use localStorage
        return this.updateGeofenceInLocalStorage(geofence);
      }
    } catch (error) {
      console.error('Error in updateGeofence:', error);
      // Fall back to localStorage in case of any error
      return this.updateGeofenceInLocalStorage(geofence);
    }
  }
  
  // Delete a geofence
  async deleteGeofence(id: string): Promise<boolean> {
    try {
      // Try to delete from Supabase if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const { error } = await geofencesDB.deleteGeofence(id);
        
        if (error) {
          console.error('Error deleting geofence from Supabase:', error);
          // Fall back to localStorage
          return this.deleteGeofenceFromLocalStorage(id);
        }
        
        return true;
      } else {
        // User not authenticated, use localStorage
        return this.deleteGeofenceFromLocalStorage(id);
      }
    } catch (error) {
      console.error('Error in deleteGeofence:', error);
      // Fall back to localStorage in case of any error
      return this.deleteGeofenceFromLocalStorage(id);
    }
  }
  
  // Save all geofences at once
  async saveGeofences(geofences: Geofence[]): Promise<boolean> {
    try {
      // Try to save to Supabase if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        // We need to delete all existing geofences and recreate them
        // First get all existing geofences
        const { data: existingGeofences, error: fetchError } = await geofencesDB.getGeofences();
        
        if (fetchError) {
          console.error('Error fetching existing geofences from Supabase:', fetchError);
          // Fall back to localStorage
          return this.saveGeofencesToLocalStorage(geofences);
        }
        
        // Delete each existing geofence
        for (const geofence of existingGeofences || []) {
          await geofencesDB.deleteGeofence(geofence.id);
        }
        
        // Create each new geofence
        for (const geofence of geofences) {
          await geofencesDB.createGeofence(geofence);
        }
        
        return true;
      } else {
        // User not authenticated, use localStorage
        return this.saveGeofencesToLocalStorage(geofences);
      }
    } catch (error) {
      console.error('Error in saveGeofences:', error);
      // Fall back to localStorage in case of any error
      return this.saveGeofencesToLocalStorage(geofences);
    }
  }
  
  // Migrate geofences from localStorage to Supabase
  async migrateGeofencesToSupabase(localGeofences: Geofence[]): Promise<boolean> {
    try {
      // Check if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        console.log("No authenticated user, skipping geofence migration");
        return false;
      }
      
      // Check if there are already geofences in Supabase
      const { data: existingGeofences, error: fetchError } = await geofencesDB.getGeofences();
      
      if (fetchError) {
        console.error("Error checking for existing geofences:", fetchError);
        toast.error("Failed to check for existing geofences");
        return false;
      }
      
      // If there are already geofences in Supabase, ask user before overwriting
      if (existingGeofences && existingGeofences.length > 0) {
        const shouldOverwrite = window.confirm(
          `You have ${existingGeofences.length} geofences stored in the cloud and ${localGeofences.length} stored locally. ` +
          `Would you like to upload your local geofences to the cloud? This will replace any existing cloud data.`
        );
        
        if (!shouldOverwrite) {
          console.log("User chose not to migrate local geofences");
          return false;
        }
        
        // Delete existing geofences as user opted to replace them
        for (const geofence of existingGeofences) {
          const { error: deleteError } = await geofencesDB.deleteGeofence(geofence.id);
          
          if (deleteError) {
            console.error("Error deleting existing geofence:", deleteError);
            toast.error("Failed to replace existing geofences");
            return false;
          }
        }
      }
      
      // Migrate geofences to Supabase
      for (const geofence of localGeofences) {
        const { error: createError } = await geofencesDB.createGeofence({
          ...geofence,
          user_id: session.session.user.id
        });
        
        if (createError) {
          console.error("Error migrating geofence to Supabase:", createError);
          toast.error("Failed to migrate geofences to the cloud");
          return false;
        }
      }
      
      // Show success toast
      toast.success(
        `Successfully migrated ${localGeofences.length} geofences to the cloud`,
        { duration: 5000 }
      );
      
      return true;
    } catch (error) {
      console.error("Error during geofence migration:", error);
      toast.error("Failed to migrate geofences to the cloud");
      return false;
    }
  }
  
  // Get geofences from localStorage
  getGeofencesFromLocalStorage(): Geofence[] {
    try {
      const savedGeofences = localStorage.getItem(GEOFENCE_STORAGE_KEY);
      return savedGeofences ? JSON.parse(savedGeofences) : defaultGeofences;
    } catch (error) {
      console.error('Error loading geofences from localStorage:', error);
      return defaultGeofences;
    }
  }
  
  // Save geofences to localStorage
  saveGeofencesToLocalStorage(geofences: Geofence[]): boolean {
    try {
      localStorage.setItem(GEOFENCE_STORAGE_KEY, JSON.stringify(geofences));
      return true;
    } catch (error) {
      console.error('Error saving geofences to localStorage:', error);
      return false;
    }
  }
  
  // Create a geofence in localStorage
  createGeofenceInLocalStorage(geofence: Geofence): Geofence {
    const geofences = this.getGeofencesFromLocalStorage();
    const updatedGeofences = [...geofences, geofence];
    this.saveGeofencesToLocalStorage(updatedGeofences);
    return geofence;
  }
  
  // Update a geofence in localStorage
  updateGeofenceInLocalStorage(geofence: Geofence): Geofence {
    const geofences = this.getGeofencesFromLocalStorage();
    const updatedGeofences = geofences.map(g => 
      g.id === geofence.id ? geofence : g
    );
    this.saveGeofencesToLocalStorage(updatedGeofences);
    return geofence;
  }
  
  // Delete a geofence from localStorage
  deleteGeofenceFromLocalStorage(id: string): boolean {
    const geofences = this.getGeofencesFromLocalStorage();
    const updatedGeofences = geofences.filter(g => g.id !== id);
    return this.saveGeofencesToLocalStorage(updatedGeofences);
  }
  
  // Check if migration from localStorage to Supabase is complete
  isMigrationComplete(): boolean {
    return localStorage.getItem(GEOFENCE_MIGRATION_COMPLETE_KEY) === 'true';
  }
  
  // Mark migration as complete
  markMigrationComplete(): void {
    localStorage.setItem(GEOFENCE_MIGRATION_COMPLETE_KEY, 'true');
  }
  
  // Remove all geofences from localStorage (after migration)
  clearLocalStorage(): void {
    localStorage.removeItem(GEOFENCE_STORAGE_KEY);
  }
}

// Create singleton instance
const geofenceService = new GeofenceService();
export default geofenceService;