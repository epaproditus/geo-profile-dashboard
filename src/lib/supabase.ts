import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

// These environment variables need to be set in your Vite project
// and in your Vercel deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Authentication will not work properly.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Hook for using Supabase client in components
export const useSupabase = () => {
  return { supabase }
}

// Helper functions for auth
export const signInWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Redirect to the root path which definitely exists in your app
      emailRedirectTo: `${window.location.origin}/`,
    },
  })
  
  return { data, error }
}

// Passkey (WebAuthn) authentication methods
export const signInWithPasskey = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: '', // Required by Supabase API but not used for WebAuthn
  })
  
  return { data, error }
}

export const registerPasskey = async (email: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: '', // Required by Supabase API but not used for WebAuthn
    options: {
      data: {
        full_name: email.split('@')[0], // Use part of email as name
      },
    },
  })
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser()
  return data?.user
}

export const getSession = async () => {
  const { data } = await supabase.auth.getSession()
  return data?.session
}

// Configure session timeout - 5 minutes
export const SESSION_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Function to track when the session should expire
export const startSessionTimer = (onExpire: () => void) => {
  const loginTime = Date.now()
  localStorage.setItem('session_start_time', loginTime.toString())
  
  const timeoutId = setTimeout(() => {
    console.log('Session expired after 5 minutes')
    onExpire()
  }, SESSION_DURATION)
  
  return {
    clear: () => clearTimeout(timeoutId),
    getRemainingTime: () => {
      const startTime = parseInt(localStorage.getItem('session_start_time') || '0')
      const elapsed = Date.now() - startTime
      return Math.max(0, SESSION_DURATION - elapsed)
    }
  }
}

// Define types for our database tables
export interface Profile {
  id: number
  mdm_id: number
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export interface Geofence {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  radius: number
  created_at: string
  updated_at: string
  user_id: string
}

export interface ProfileGeofence {
  id: number
  profile_id: number
  geofence_id: number
  created_at: string
  user_id: string
}

export interface DeviceLocation {
  id: number
  device_id: number
  last_seen_at: string
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  user_id: string
}

export interface Policy {
  id: string
  name: string
  description: string
  is_default: boolean
  locations: any[] // JSON array
  ip_ranges: any[] // JSON array
  devices: any[] // JSON array
  profiles: any[] // JSON array 
  created_at: string
  updated_at: string
  user_id: string
}

// Database operations for policies and profiles
export const policiesDB = {
  // Get all policies for current user
  async getPolicies() {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching policies');
      return { data: [], error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error fetching policies:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Get a single policy by ID
  async getPolicy(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching a policy');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
      .single()
    
    if (error) {
      console.error(`Error fetching policy ${id}:`, error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Create a new policy
  async createPolicy(policy: Omit<Policy, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when creating a policy');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('policies')
      .insert([
        { ...policy, user_id: user.id }
      ])
      .select()
    
    if (error) {
      console.error('Error creating policy:', error)
      return { data: null, error }
    }
    
    return { data: data[0], error: null }
  },
  
  // Update an existing policy
  async updatePolicy(id: string, updates: Partial<Omit<Policy, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when updating a policy');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('policies')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
      .select()
    
    if (error) {
      console.error(`Error updating policy ${id}:`, error)
      return { data: null, error }
    }
    
    return { data: data[0], error: null }
  },
  
  // Delete a policy
  async deletePolicy(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when deleting a policy');
      return { error: new Error('Authentication required') };
    }
    
    const { error } = await supabase
      .from('policies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
    
    if (error) {
      console.error(`Error deleting policy ${id}:`, error)
      return { error }
    }
    
    return { error: null }
  }
}

// Database operations for policies and profiles
export const profilesDB = {
  // Get all profiles for current user
  async getProfiles() {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching profiles');
      return { data: [], error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error fetching profiles:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Get a single profile by ID
  async getProfile(id: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching a profile');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
      .single()
    
    if (error) {
      console.error(`Error fetching profile ${id}:`, error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Create a new profile
  async createProfile(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when creating a profile');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        { ...profile, user_id: user.id }
      ])
      .select()
    
    if (error) {
      console.error('Error creating profile:', error)
      return { data: null, error }
    }
    
    return { data: data[0], error: null }
  },
  
  // Update an existing profile
  async updateProfile(id: number, updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when updating a profile');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
      .select()
    
    if (error) {
      console.error(`Error updating profile ${id}:`, error)
      return { data: null, error }
    }
    
    return { data: data[0], error: null }
  },
  
  // Delete a profile
  async deleteProfile(id: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when deleting a profile');
      return { error: new Error('Authentication required') };
    }
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
    
    if (error) {
      console.error(`Error deleting profile ${id}:`, error)
      return { error }
    }
    
    return { error: null }
  }
}

// Database operations for geofences
export const geofencesDB = {
  // Get all geofences for current user
  async getGeofences() {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching geofences');
      return { data: [], error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('geofences')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error fetching geofences:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Get a single geofence by ID
  async getGeofence(id: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching a geofence');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('geofences')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
      .single()
    
    if (error) {
      console.error(`Error fetching geofence ${id}:`, error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Create a new geofence
  async createGeofence(geofence: Omit<Geofence, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when creating a geofence');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('geofences')
      .insert([
        { ...geofence, user_id: user.id }
      ])
      .select()
    
    if (error) {
      console.error('Error creating geofence:', error)
      return { data: null, error }
    }
    
    return { data: data[0], error: null }
  },
  
  // Update an existing geofence
  async updateGeofence(id: number, updates: Partial<Omit<Geofence, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when updating a geofence');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('geofences')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
      .select()
    
    if (error) {
      console.error(`Error updating geofence ${id}:`, error)
      return { data: null, error }
    }
    
    return { data: data[0], error: null }
  },
  
  // Delete a geofence
  async deleteGeofence(id: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when deleting a geofence');
      return { error: new Error('Authentication required') };
    }
    
    const { error } = await supabase
      .from('geofences')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Also filter by user_id for security
    
    if (error) {
      console.error(`Error deleting geofence ${id}:`, error)
      return { error }
    }
    
    return { error: null }
  }
}

// Database operations for profile-geofence associations
export const profileGeofencesDB = {
  // Get all geofences for a profile
  async getGeofencesForProfile(profileId: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching geofences for profile');
      return { data: [], error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('profile_geofences')
      .select(`
        *,
        geofences:geofence_id(*)
      `)
      .eq('profile_id', profileId)
      .eq('user_id', user.id) // Filter by user_id for security
    
    if (error) {
      console.error(`Error fetching geofences for profile ${profileId}:`, error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Get all profiles for a geofence
  async getProfilesForGeofence(geofenceId: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching profiles for geofence');
      return { data: [], error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('profile_geofences')
      .select(`
        *,
        profiles:profile_id(*)
      `)
      .eq('geofence_id', geofenceId)
      .eq('user_id', user.id) // Filter by user_id for security
    
    if (error) {
      console.error(`Error fetching profiles for geofence ${geofenceId}:`, error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Associate a profile with a geofence
  async associateProfileWithGeofence(profileId: number, geofenceId: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when associating profile with geofence');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('profile_geofences')
      .insert([
        { 
          profile_id: profileId, 
          geofence_id: geofenceId,
          user_id: user.id
        }
      ])
      .select()
    
    if (error) {
      console.error(`Error associating profile ${profileId} with geofence ${geofenceId}:`, error)
      return { data: null, error }
    }
    
    return { data: data[0], error: null }
  },
  
  // Remove association between profile and geofence
  async removeProfileGeofenceAssociation(profileId: number, geofenceId: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when removing profile-geofence association');
      return { error: new Error('Authentication required') };
    }
    
    const { error } = await supabase
      .from('profile_geofences')
      .delete()
      .eq('profile_id', profileId)
      .eq('geofence_id', geofenceId)
      .eq('user_id', user.id) // Filter by user_id for security
    
    if (error) {
      console.error(`Error removing association between profile ${profileId} and geofence ${geofenceId}:`, error)
      return { error }
    }
    
    return { error: null }
  }
}

// Database operations for device locations
export const deviceLocationsDB = {
  // Get location for a device
  async getDeviceLocation(deviceId: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when fetching device location');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const { data, error } = await supabase
      .from('device_locations')
      .select('*')
      .eq('device_id', deviceId)
      .eq('user_id', user.id) // Filter by user_id for security
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error(`Error fetching location for device ${deviceId}:`, error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },
  
  // Update or create device location
  async updateDeviceLocation(deviceId: number, latitude: number | null, longitude: number | null, accuracy: number | null) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when updating device location');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const now = new Date().toISOString()
    
    // Check if record exists
    const { data: existingData } = await this.getDeviceLocation(deviceId)
    
    if (existingData) {
      // Update existing record
      const { data, error } = await supabase
        .from('device_locations')
        .update({ 
          latitude, 
          longitude, 
          accuracy, 
          last_seen_at: now
        })
        .eq('device_id', deviceId)
        .eq('user_id', user.id) // Filter by user_id for security
        .select()
      
      if (error) {
        console.error(`Error updating location for device ${deviceId}:`, error)
        return { data: null, error }
      }
      
      return { data: data[0], error: null }
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('device_locations')
        .insert([
          { 
            device_id: deviceId, 
            latitude, 
            longitude, 
            accuracy, 
            last_seen_at: now,
            user_id: user.id // Use the authenticated user's ID
          }
        ])
        .select()
      
      if (error) {
        console.error(`Error creating location for device ${deviceId}:`, error)
        return { data: null, error }
      }
      
      return { data: data[0], error: null }
    }
  },
  
  // Update device last_seen_at timestamp
  async updateDeviceTimestamp(deviceId: number) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is authenticated before proceeding
    if (!user || !user.id) {
      console.error('No authenticated user found when updating device timestamp');
      return { data: null, error: new Error('Authentication required') };
    }
    
    const now = new Date().toISOString()
    
    // Check if record exists
    const { data: existingData } = await this.getDeviceLocation(deviceId)
    
    if (existingData) {
      // Update existing record's timestamp
      const { data, error } = await supabase
        .from('device_locations')
        .update({ last_seen_at: now })
        .eq('device_id', deviceId)
        .eq('user_id', user.id) // Filter by user_id for security
        .select()
      
      if (error) {
        console.error(`Error updating timestamp for device ${deviceId}:`, error)
        return { data: null, error }
      }
      
      return { data: data[0], error: null }
    } else {
      // Create new record with just the timestamp
      const { data, error } = await supabase
        .from('device_locations')
        .insert([
          { 
            device_id: deviceId, 
            last_seen_at: now,
            user_id: user.id // Use the authenticated user's ID
          }
        ])
        .select()
      
      if (error) {
        console.error(`Error creating timestamp for device ${deviceId}:`, error)
        return { data: null, error }
      }
      
      return { data: data[0], error: null }
    }
  }
}