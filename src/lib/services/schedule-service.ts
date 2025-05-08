import { supabase } from '@/lib/supabase';
import { Schedule, ScheduleCreate } from '@/types/schedule';

/**
 * Service for managing schedule data in Supabase
 */
export const scheduleService = {
  /**
   * Get all schedules
   */
  async getAll(): Promise<Schedule[]> {
    console.log("scheduleService.getAll: Fetching all schedules...");
    
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching schedules:', error);
      throw new Error(error.message);
    }
    
    console.log("scheduleService.getAll: Retrieved schedules:", data);
    return data as Schedule[];
  },

  /**
   * Get a schedule by ID
   */
  async getById(id: string): Promise<Schedule> {
    console.log(`scheduleService.getById: Fetching schedule with ID ${id}...`);
    
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching schedule ${id}:`, error);
      throw new Error(error.message);
    }
    
    console.log(`scheduleService.getById: Retrieved schedule:`, data);
    return data as Schedule;
  },

  /**
   * Create a new schedule
   */
  async create(schedule: ScheduleCreate): Promise<Schedule> {
    console.log("scheduleService.create: Creating a new schedule...", schedule);
    
    const { data, error } = await supabase
      .from('schedules')
      .insert(schedule)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating schedule:', error);
      throw new Error(error.message);
    }
    
    console.log("scheduleService.create: Created schedule:", data);
    return data as Schedule;
  },

  /**
   * Update a schedule
   */
  async update(id: string, schedule: Partial<Schedule>): Promise<Schedule> {
    console.log(`scheduleService.update: Updating schedule with ID ${id}...`, schedule);
    
    const { data, error } = await supabase
      .from('schedules')
      .update(schedule)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating schedule ${id}:`, error);
      throw new Error(error.message);
    }
    
    console.log(`scheduleService.update: Updated schedule:`, data);
    return data as Schedule;
  },

  /**
   * Delete a schedule
   */
  async delete(id: string): Promise<void> {
    console.log(`scheduleService.delete: Deleting schedule with ID ${id}...`);
    
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting schedule ${id}:`, error);
      throw new Error(error.message);
    }
    
    console.log(`scheduleService.delete: Deleted schedule with ID ${id}`);
  },

  /**
   * Toggle schedule enabled status
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<Schedule> {
    console.log(`scheduleService.toggleEnabled: Toggling enabled status for schedule with ID ${id} to ${enabled}...`);
    return this.update(id, { enabled });
  },

  /**
   * Get upcoming schedules that need to be executed
   * This would be called by a background service or cron job
   */
  async getUpcomingSchedules(withinMinutes: number = 5): Promise<Schedule[]> {
    console.log(`scheduleService.getUpcomingSchedules: Fetching upcoming schedules within ${withinMinutes} minutes...`);
    
    const now = new Date();
    const futureTime = new Date(now.getTime() + withinMinutes * 60 * 1000);
    
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('enabled', true)
      .gte('start_time', now.toISOString())
      .lte('start_time', futureTime.toISOString())
      .is('last_executed_at', null)
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching upcoming schedules:', error);
      throw new Error(error.message);
    }
    
    console.log("scheduleService.getUpcomingSchedules: Retrieved upcoming schedules:", data);
    return data as Schedule[];
  },

  /**
   * Mark a schedule as executed
   */
  async markExecuted(id: string): Promise<Schedule> {
    console.log(`scheduleService.markExecuted: Marking schedule with ID ${id} as executed...`);
    return this.update(id, { 
      last_executed_at: new Date().toISOString() 
    });
  }
};