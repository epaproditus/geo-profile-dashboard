import React, { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays, set, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Info, Loader2, Clock, FileCheck, FileX } from "lucide-react";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

import { useSchedule, useCreateSchedule, useUpdateSchedule } from "@/hooks/use-schedules";
import { useAllProfiles } from "@/hooks/use-simplemdm";
import ProfileSelector from "@/components/schedules/ProfileSelector";
import DeviceFilterSelector from "@/components/schedules/DeviceFilterSelector";
import { MultiProfileSelector } from "@/components/schedules/ProfileSelector";
import AssignmentGroupField from '@/components/assignments/AssignmentGroupField';

// Form validation schema
const scheduleFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  profile_ids: z.array(z.string()).min(1, "At least one profile is required"),
  device_filter: z.string().optional(),
  schedule_type: z.enum(["one_time", "recurring"]),
  start_date: z.date({
    required_error: "Start date is required",
  }),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be a valid time in 24hr format (HH:MM)"),
  recurrence_pattern: z.enum(["daily", "weekly", "monthly"]).optional(),
  days_of_week: z.array(z.number()).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  // Fields for SimpleMDM API integration
  action_type: z.enum(["push_profile", "remove_profile", "push_remove_profile"]).default("push_profile"),
  assignment_group_id: z.string().optional(),
  removal_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be a valid time in 24hr format (HH:MM)").optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface ScheduleFormProps {
  scheduleId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  scheduleId,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = !!scheduleId;
  
  // Server time state
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [serverTimeLoading, setServerTimeLoading] = useState(true);
  
  // Track which dropdown is currently open
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Date picker popover state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Fetch server time
  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const { data, error } = await supabase.rpc('get_server_time');
        
        if (error) throw error;
        
        if (data) {
          setServerTime(new Date(data));
        }
      } catch (err) {
        console.error('Error fetching server time:', err);
      } finally {
        setServerTimeLoading(false);
      }
    };
    
    fetchServerTime();
  }, []);
  
  // Fetch data
  const { data: existingSchedule, isLoading: isLoadingSchedule } = useSchedule(scheduleId);
  const { data: profilesData, isLoading: isLoadingProfiles } = useAllProfiles();
  
  // Mutations
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  
  // Form setup
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      enabled: true,
      profile_ids: [],
      device_filter: "",
      schedule_type: "one_time",
      start_date: addDays(new Date(), 1),
      start_time: "09:00",
      recurrence_pattern: "daily",
    },
  });
  
  // Initialize form with existing schedule data if editing
  useEffect(() => {
    if (isEditMode && existingSchedule) {
      try {
        const startDateTime = parseISO(existingSchedule.start_time);
        
        if (isValid(startDateTime)) {
          // Convert single profile_id to array for multi-select
          const profileIds = existingSchedule.profile_id ? [existingSchedule.profile_id.toString()] : [];
          
          form.reset({
            name: existingSchedule.name,
            description: existingSchedule.description || "",
            enabled: existingSchedule.enabled,
            profile_ids: profileIds,
            device_filter: existingSchedule.device_filter || "",
            schedule_type: existingSchedule.schedule_type as "one_time" | "recurring",
            start_date: startDateTime,
            start_time: format(startDateTime, "HH:mm"),
            recurrence_pattern: existingSchedule.recurrence_pattern as "daily" | "weekly" | "monthly" || "daily",
            days_of_week: existingSchedule.days_of_week ? JSON.parse(existingSchedule.days_of_week) : undefined,
            day_of_month: existingSchedule.day_of_month || undefined,
            // SimpleMDM integration fields
            action_type: existingSchedule.action_type as "push_profile" || "push_profile",
            assignment_group_id: existingSchedule.assignment_group_id ? existingSchedule.assignment_group_id.toString() : undefined,
          });
        }
      } catch (e) {
        console.error("Error parsing schedule data", e);
      }
    }
  }, [existingSchedule, isEditMode, form]);
  
  const scheduleType = form.watch("schedule_type");
  const recurrencePattern = form.watch("recurrence_pattern");
  const actionType = form.watch("action_type");
   // Form submission
  const onSubmit = async (values: ScheduleFormValues) => {
    try {
      // Combine date and time for installation
      const timeComponents = values.start_time.split(":");
      const hours = parseInt(timeComponents[0], 10);
      const minutes = parseInt(timeComponents[1], 10);

      const startDateTime = set(values.start_date, {
        hours,
        minutes,
        seconds: 0,
        milliseconds: 0,
      });
      
      // Setup removal time for auto-remove if needed
      let removalDateTime = null;
      if (values.action_type === "push_remove_profile" && values.removal_time) {
        const removalTimeComponents = values.removal_time.split(":");
        const removalHours = parseInt(removalTimeComponents[0], 10);
        const removalMinutes = parseInt(removalTimeComponents[1], 10);
        
        removalDateTime = set(values.start_date, {
          hours: removalHours,
          minutes: removalMinutes,
          seconds: 0,
          milliseconds: 0,
        });
        
        // Validate that removal time is after installation time
        if (removalDateTime <= startDateTime) {
          form.setError("removal_time", {
            type: "manual",
            message: "Removal time must be after installation time"
          });
          return;
        }
      }

      if (values.profile_ids.length === 0) {
        form.setError("profile_ids", {
          type: "manual",
          message: "Please select at least one profile"
        });
        return;
      }
      
      // Validate assignment group for SimpleMDM profile actions
      if (!values.assignment_group_id) {
        form.setError("assignment_group_id", {
          type: "manual",
          message: `Please select an assignment group for profile ${values.action_type === "remove_profile" ? "removal" : "installation"}`
        });
        return;
      }
      
      // For each profile, create a separate schedule
      for (const profileId of values.profile_ids) {
        // Base schedule data - common for all types
        const baseScheduleData = {
          name: values.profile_ids.length > 1 
            ? `${values.name} - ${profileId}` 
            : values.name,
          description: values.description,
          enabled: values.enabled,
          profile_id: profileId,
          device_filter: values.device_filter || null,
          schedule_type: values.schedule_type,
          recurrence_pattern: values.schedule_type === "recurring" ? values.recurrence_pattern : null,
          days_of_week: values.days_of_week && values.days_of_week.length > 0 
            ? JSON.stringify(values.days_of_week) 
            : null,
          day_of_month: values.day_of_month || null,
          timezone: "UTC", // Add required timezone field
          end_time: null, // Add required end_time field
          assignment_group_id: values.assignment_group_id ? parseInt(values.assignment_group_id) : null,
          device_group_id: null, // Not used for profile push
          command_data: null // Not used for profile push
        };
        
        // Handle special case for push_remove_profile (install and auto-remove)
        if (values.action_type === "push_remove_profile") {
          // Create two separate schedules: one for installation and one for removal
          
          // 1. Installation Schedule
          const installScheduleData = {
            ...baseScheduleData,
            name: `${baseScheduleData.name} - Install`,
            start_time: startDateTime.toISOString(),
            action_type: "push_profile"
          };
          
          // 2. Removal Schedule
          const removeScheduleData = {
            ...baseScheduleData,
            name: `${baseScheduleData.name} - Remove`,
            start_time: removalDateTime.toISOString(),
            action_type: "remove_profile"
          };
          
          if (isEditMode && scheduleId) {
            // In edit mode, update the first schedule and create the second
            await updateSchedule.mutateAsync({
              id: scheduleId,
              ...installScheduleData,
            });
            
            // Create the removal schedule (or update if it already exists)
            await createSchedule.mutateAsync(removeScheduleData);
          } else {
            // Create both schedules
            await createSchedule.mutateAsync(installScheduleData);
            await createSchedule.mutateAsync(removeScheduleData);
          }
        } else {
          // Normal single schedule (push_profile or remove_profile)
          const scheduleData = {
            ...baseScheduleData,
            start_time: startDateTime.toISOString(),
            action_type: values.action_type,
          };
          
          // Create or update
          if (isEditMode && scheduleId) {
            // In edit mode, we're only updating a single schedule entry
            if (profileId === values.profile_ids[0]) {
              await updateSchedule.mutateAsync({
                id: scheduleId,
                ...scheduleData,
              });
            } else {
              // For additional profiles, create new schedules
              await createSchedule.mutateAsync(scheduleData);
            }
          } else {
            // Create a new schedule for each profile
            await createSchedule.mutateAsync(scheduleData);
          }
        }
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error saving schedule", error);
    }
  };
  
  const isPending = createSchedule.isPending || updateSchedule.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Server Time Indicator */}
        <div className="flex items-center text-sm bg-muted p-2 rounded">
          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Server Time: </span>
          <span className="ml-1 font-medium">
            {serverTimeLoading ? 
              "Loading..." : 
              serverTime ? 
                format(serverTime, "PPp") : 
                "Unable to fetch server time"
            }
          </span>
        </div>
        
        {/* Enabled Switch - Moved to top */}
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Schedule Status
                </FormLabel>
                <FormDescription>
                  Enable or disable this schedule
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        {/* Schedule Type - Moved up */}
        <FormField
          control={form.control}
          name="schedule_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Schedule Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="one_time" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      One-time Schedule
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="recurring" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Recurring Schedule
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Basic Information */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Name</FormLabel>
                <FormControl>
                  <Input placeholder="Daily Profile Update" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Daily update of security profiles for all devices" 
                    className="resize-none" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Date and Time Picker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <div className="relative">
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const cal = document.getElementById("date-picker-calendar");
                      if (cal) {
                        cal.style.display = cal.style.display === "none" ? "block" : "none";
                      } else {
                        console.error("Calendar element not found");
                      }
                    }}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                  <div 
                    id="date-picker-calendar" 
                    className="absolute left-0 z-50 mt-2 rounded-md border bg-popover p-0 shadow-md" 
                    style={{display: "none"}}
                  >
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        const cal = document.getElementById("date-picker-calendar");
                        if (cal) cal.style.display = "none";
                      }}
                      disabled={(date) => {
                        // Allow today's date by comparing with start of previous day
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        yesterday.setHours(23, 59, 59, 999);
                        return date < yesterday;
                      }}
                      initialFocus
                    />
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => {
              // Parse the current time value (stored in 24-hour format)
              const [hoursStr, minutesStr] = field.value ? field.value.split(':') : ["09", "00"];
              const hours24 = parseInt(hoursStr, 10);
              const minutes = parseInt(minutesStr, 10);
              
              // Convert to 12-hour format
              const hours12 = hours24 % 12 || 12; // Convert 0 to 12
              const period = hours24 >= 12 ? "PM" : "AM";
              
              // Function to toggle a dropdown and close all others
              const toggleDropdown = (dropdownId: string) => {
                // Close all other dropdowns first
                ["hour-selector", "minute-selector", "period-selector", "date-picker-calendar", "profile-selector-dropdown", "device-filter-dropdown", 
                 "removal-hour-selector", "removal-minute-selector", "removal-period-selector"].forEach(id => {
                  const element = document.getElementById(id);
                  if (element) element.style.display = "none";
                });
                
                // Then open only the current dropdown
                const dropdown = document.getElementById(dropdownId);
                if (dropdown) {
                  dropdown.style.display = "block";
                  setActiveDropdown(dropdownId);
                }
                
                // Add a click outside listener to close dropdown
                setTimeout(() => {
                  const closeDropdowns = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest(`#${dropdownId}`) && !target.closest(`[data-dropdown-trigger="${dropdownId}"]`)) {
                      const dropdown = document.getElementById(dropdownId);
                      if (dropdown) dropdown.style.display = "none";
                      document.removeEventListener('click', closeDropdowns);
                    }
                  };
                  document.addEventListener('click', closeDropdowns);
                }, 10);
              };
              
              // Update the time in 24-hour format
              const updateTime = (newHours12: number, newMinutes: number, newPeriod: string) => {
                // Convert to 24-hour format
                let newHours24 = newHours12;
                if (newPeriod === "PM" && newHours12 < 12) {
                  newHours24 = newHours12 + 12;
                } else if (newPeriod === "AM" && newHours12 === 12) {
                  newHours24 = 0;
                }
                
                const newTime = `${newHours24.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
                field.onChange(newTime);
                
                // If we have a removal time, we might need to validate it
                if (actionType === "push_remove_profile") {
                  // Check if we need to adjust the removal time
                  setTimeout(() => {
                    const startTime = form.getValues().start_time;
                    const removalTime = form.getValues().removal_time;
                    
                    if (startTime && removalTime) {
                      const [startHoursStr, startMinutesStr] = startTime.split(':');
                      const [removalHoursStr, removalMinutesStr] = removalTime.split(':');
                      
                      const startHours = parseInt(startHoursStr, 10);
                      const startMinutes = parseInt(startMinutesStr, 10);
                      const removalHours = parseInt(removalHoursStr, 10);
                      const removalMinutes = parseInt(removalMinutesStr, 10);
                      
                      // Calculate total minutes for comparison
                      const startTotalMinutes = startHours * 60 + startMinutes;
                      const removalTotalMinutes = removalHours * 60 + removalMinutes;
                      
                      if (removalTotalMinutes <= startTotalMinutes) {
                        // Automatically adjust removal time to be 5 hours after start time
                        const defaultRemovalHour = (startHours + 5) % 24;
                        const newRemovalTime = `${defaultRemovalHour.toString().padStart(2, '0')}:${startMinutesStr}`;
                        form.setValue("removal_time", newRemovalTime);
                      }
                    }
                  }, 0);
                }
                
                // Close all dropdowns
                ["hour-selector", "minute-selector", "period-selector"].forEach(id => {
                  const element = document.getElementById(id);
                  if (element) element.style.display = "none";
                });
                setActiveDropdown(null);
              };
              
              return (
                <FormItem>
                  <FormLabel>{actionType === "push_remove_profile" ? "Installation Time" : "Time"}</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Hour Selector (12-hour format) */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        type="button"
                        data-dropdown-trigger="hour-selector"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDropdown("hour-selector");
                        }}
                        className="w-full h-10 flex justify-between items-center"
                      >
                        <span>{hours12.toString().padStart(2, '0')}</span>
                        <span className="text-xs text-muted-foreground">Hour</span>
                      </Button>
                      <div 
                        id="hour-selector" 
                        className="absolute z-50 mt-1 bg-popover rounded-md border shadow-md overflow-y-auto"
                        style={{ display: "none", maxHeight: "200px", width: "100%" }}
                      >
                        <div className="p-1">
                          {Array.from({length: 12}, (_, i) => i + 1).map((hour) => (
                            <Button
                              key={hour}
                              variant="ghost"
                              type="button"
                              className="w-full justify-start rounded-sm font-normal"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateTime(hour, minutes, period);
                              }}
                            >
                              {hour.toString().padStart(2, '0')}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Minute Selector */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        type="button"
                        data-dropdown-trigger="minute-selector"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDropdown("minute-selector");
                        }}
                        className="w-full h-10 flex justify-between items-center"
                      >
                        <span>{minutes.toString().padStart(2, '0')}</span>
                        <span className="text-xs text-muted-foreground">Minute</span>
                      </Button>
                      <div 
                        id="minute-selector" 
                        className="absolute z-50 mt-1 bg-popover rounded-md border shadow-md overflow-y-auto"
                        style={{ display: "none", maxHeight: "200px", width: "100%" }}
                      >
                        <div className="p-1">
                          {Array.from({length: 60}, (_, i) => i).map((min) => (
                            <Button
                              key={min}
                              variant="ghost"
                              type="button"
                              className="w-full justify-start rounded-sm font-normal"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateTime(hours12, min, period);
                              }}
                            >
                              {min.toString().padStart(2, '0')}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* AM/PM Selector */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        type="button"
                        data-dropdown-trigger="period-selector"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDropdown("period-selector");
                        }}
                        className="w-full h-10 flex justify-between items-center"
                      >
                        <span>{period}</span>
                        <span className="text-xs text-muted-foreground">AM/PM</span>
                      </Button>
                      <div 
                        id="period-selector" 
                        className="absolute z-50 mt-1 bg-popover rounded-md border shadow-md overflow-y-auto"
                        style={{ display: "none", maxHeight: "200px", width: "100%" }}
                      >
                        <div className="p-1">
                          <Button
                            variant="ghost"
                            type="button"
                            className="w-full justify-start rounded-sm font-normal"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateTime(hours12, minutes, "AM");
                            }}
                          >
                            AM
                          </Button>
                          <Button
                            variant="ghost" 
                            type="button"
                            className="w-full justify-start rounded-sm font-normal"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateTime(hours12, minutes, "PM");
                            }}
                          >
                            PM
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <FormDescription>
                    Select {actionType === "push_remove_profile" ? "installation" : ""} time
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          
          {/* Removal Time Picker (only shown for push_remove_profile) */}
          {actionType === "push_remove_profile" && (
            <FormField
              control={form.control}
              name="removal_time"
              render={({ field }) => {
                // Initialize with default value if not set
                if (!field.value) {
                  // Default to 5 hours after start time
                  const startTime = form.getValues().start_time;
                  const [hoursStr, minutesStr] = startTime ? startTime.split(':') : ["09", "00"];
                  const hours24 = parseInt(hoursStr, 10);
                  const defaultRemovalHour = (hours24 + 5) % 24;
                  field.onChange(`${defaultRemovalHour.toString().padStart(2, '0')}:${minutesStr}`);
                }
                
                // Validate that removal time is after installation time
                const validateRemovalTime = () => {
                  const startTime = form.getValues().start_time;
                  if (startTime && field.value) {
                    const [startHoursStr, startMinutesStr] = startTime.split(':');
                    const [removalHoursStr, removalMinutesStr] = field.value.split(':');
                    
                    const startHours = parseInt(startHoursStr, 10);
                    const startMinutes = parseInt(startMinutesStr, 10);
                    const removalHours = parseInt(removalHoursStr, 10);
                    const removalMinutes = parseInt(removalMinutesStr, 10);
                    
                    // Calculate total minutes for comparison
                    const startTotalMinutes = startHours * 60 + startMinutes;
                    const removalTotalMinutes = removalHours * 60 + removalMinutes;
                    
                    if (removalTotalMinutes <= startTotalMinutes) {
                      form.setError("removal_time", {
                        type: "manual",
                        message: "Removal time must be after installation time"
                      });
                    } else {
                      form.clearErrors("removal_time");
                    }
                  }
                };
                
                // Parse the current time value (stored in 24-hour format)
                const [hoursStr, minutesStr] = field.value ? field.value.split(':') : ["17", "00"];
                const hours24 = parseInt(hoursStr, 10);
                const minutes = parseInt(minutesStr, 10);
                
                // Convert to 12-hour format
                const hours12 = hours24 % 12 || 12; // Convert 0 to 12
                const period = hours24 >= 12 ? "PM" : "AM";
                
                // Function to toggle a dropdown and close all others
                const toggleDropdown = (dropdownId: string) => {
                  // Close all other dropdowns first
                  ["hour-selector", "minute-selector", "period-selector", "date-picker-calendar", 
                   "removal-hour-selector", "removal-minute-selector", "removal-period-selector"].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) element.style.display = "none";
                  });
                  
                  // Then open only the current dropdown
                  const dropdown = document.getElementById(dropdownId);
                  if (dropdown) {
                    dropdown.style.display = "block";
                    setActiveDropdown(dropdownId);
                  }
                  
                  // Add a click outside listener to close dropdown
                  setTimeout(() => {
                    const closeDropdowns = (e: MouseEvent) => {
                      const target = e.target as HTMLElement;
                      if (!target.closest(`#${dropdownId}`) && !target.closest(`[data-dropdown-trigger="${dropdownId}"]`)) {
                        const dropdown = document.getElementById(dropdownId);
                        if (dropdown) dropdown.style.display = "none";
                        document.removeEventListener('click', closeDropdowns);
                      }
                    };
                    document.addEventListener('click', closeDropdowns);
                  }, 10);
                };
                
                // Update the time in 24-hour format
                const updateTime = (newHours12: number, newMinutes: number, newPeriod: string) => {
                  // Convert to 24-hour format
                  let newHours24 = newHours12;
                  if (newPeriod === "PM" && newHours12 < 12) {
                    newHours24 = newHours12 + 12;
                  } else if (newPeriod === "AM" && newHours12 === 12) {
                    newHours24 = 0;
                  }
                  
                  const newTime = `${newHours24.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
                  field.onChange(newTime);
                  
                  // Validate removal time after change
                  setTimeout(validateRemovalTime, 0);
                  
                  // Close all dropdowns
                  ["removal-hour-selector", "removal-minute-selector", "removal-period-selector"].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) element.style.display = "none";
                  });
                  setActiveDropdown(null);
                };
                
                // Run validation when component mounts or when installation time changes
                useEffect(() => {
                  validateRemovalTime();
                }, [form.watch("start_time")]);
                
                return (
                  <FormItem>
                    <FormLabel className="text-destructive">Removal Time</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Hour Selector (12-hour format) */}
                      <div className="relative">
                        <Button
                          variant="outline"
                          type="button"
                          data-dropdown-trigger="removal-hour-selector"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDropdown("removal-hour-selector");
                          }}
                          className="w-full h-10 flex justify-between items-center border-destructive"
                        >
                          <span>{hours12.toString().padStart(2, '0')}</span>
                          <span className="text-xs text-muted-foreground">Hour</span>
                        </Button>
                        <div 
                          id="removal-hour-selector" 
                          className="absolute z-50 mt-1 bg-popover rounded-md border shadow-md overflow-y-auto"
                          style={{ display: "none", maxHeight: "200px", width: "100%" }}
                        >
                          <div className="p-1">
                            {Array.from({length: 12}, (_, i) => i + 1).map((hour) => (
                              <Button
                                key={hour}
                                variant="ghost"
                                type="button"
                                className="w-full justify-start rounded-sm font-normal"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateTime(hour, minutes, period);
                                }}
                              >
                                {hour.toString().padStart(2, '0')}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Minute Selector */}
                      <div className="relative">
                        <Button
                          variant="outline"
                          type="button"
                          data-dropdown-trigger="removal-minute-selector"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDropdown("removal-minute-selector");
                          }}
                          className="w-full h-10 flex justify-between items-center border-destructive"
                        >
                          <span>{minutes.toString().padStart(2, '0')}</span>
                          <span className="text-xs text-muted-foreground">Minute</span>
                        </Button>
                        <div 
                          id="removal-minute-selector" 
                          className="absolute z-50 mt-1 bg-popover rounded-md border shadow-md overflow-y-auto"
                          style={{ display: "none", maxHeight: "200px", width: "100%" }}
                        >
                          <div className="p-1">
                            {Array.from({length: 60}, (_, i) => i).map((min) => (
                              <Button
                                key={min}
                                variant="ghost"
                                type="button"
                                className="w-full justify-start rounded-sm font-normal"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateTime(hours12, min, period);
                                }}
                              >
                                {min.toString().padStart(2, '0')}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* AM/PM Selector */}
                      <div className="relative">
                        <Button
                          variant="outline"
                          type="button"
                          data-dropdown-trigger="removal-period-selector"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDropdown("removal-period-selector");
                          }}
                          className="w-full h-10 flex justify-between items-center border-destructive"
                        >
                          <span>{period}</span>
                          <span className="text-xs text-muted-foreground">AM/PM</span>
                        </Button>
                        <div 
                          id="removal-period-selector" 
                          className="absolute z-50 mt-1 bg-popover rounded-md border shadow-md overflow-y-auto"
                          style={{ display: "none", maxHeight: "200px", width: "100%" }}
                        >
                          <div className="p-1">
                            <Button
                              variant="ghost"
                              type="button"
                              className="w-full justify-start rounded-sm font-normal"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateTime(hours12, minutes, "AM");
                              }}
                            >
                              AM
                            </Button>
                            <Button
                              variant="ghost" 
                              type="button"
                              className="w-full justify-start rounded-sm font-normal"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateTime(hours12, minutes, "PM");
                              }}
                            >
                              PM
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <FormDescription className="text-destructive">
                      Select when the profile will be automatically removed (must be after installation time)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          )}
        </div>
        
        {/* Action Type Selection */}
        <div className="border rounded-md p-4 bg-muted/20 mb-4">
          <h3 className="text-lg font-medium mb-2">Profile Action</h3>
          <FormField
            control={form.control}
            name="action_type"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0 border rounded-md p-3 cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/5" data-state={field.value === "push_profile" ? "checked" : "unchecked"}>
                      <FormControl>
                        <RadioGroupItem value="push_profile" />
                      </FormControl>
                      <div>
                        <FormLabel className="font-medium text-base cursor-pointer">
                          Install Profile
                        </FormLabel>
                        <div className="text-xs text-muted-foreground mt-1">
                          One-time or recurring installation
                        </div>
                      </div>
                    </FormItem>
                    
                    <FormItem className="flex items-center space-x-2 space-y-0 border rounded-md p-3 cursor-pointer data-[state=checked]:border-destructive data-[state=checked]:bg-destructive/5" data-state={field.value === "remove_profile" ? "checked" : "unchecked"}>
                      <FormControl>
                        <RadioGroupItem value="remove_profile" />
                      </FormControl>
                      <div>
                        <FormLabel className="font-medium text-base cursor-pointer">
                          Remove Profile
                        </FormLabel>
                        <div className="text-xs text-muted-foreground mt-1">
                          One-time or recurring removal
                        </div>
                      </div>
                    </FormItem>
                    
                    <FormItem className="flex items-center space-x-2 space-y-0 border-2 border-dashed rounded-md p-3 cursor-pointer data-[state=checked]:border-solid data-[state=checked]:border-primary data-[state=checked]:bg-primary/5" data-state={field.value === "push_remove_profile" ? "checked" : "unchecked"}>
                      <FormControl>
                        <RadioGroupItem value="push_remove_profile" />
                      </FormControl>
                      <div>
                        <FormLabel className="font-medium text-base cursor-pointer">
                          Install and Auto-Remove
                        </FormLabel>
                        <div className="text-xs text-muted-foreground mt-1">
                          Automatic removal after installation
                        </div>
                      </div>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  {field.value === "push_remove_profile" 
                   ? "The profile will be installed at the specified start time and automatically removed at the removal time." 
                   : "Choose whether to install or remove the selected profile(s) from devices."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Profile Selection */}
        <div className={actionType === "remove_profile" ? "border-l-4 border-destructive pl-4" : ""}>
          <FormField
            control={form.control}
            name="profile_ids"
            render={({ field }) => (
              <FormItem>
                {actionType === "remove_profile" ? (
                  <div className="flex items-center mb-1">
                    <FileX className="mr-2 h-4 w-4 text-destructive" />
                    <FormLabel className="text-destructive font-semibold">Configuration Profiles</FormLabel>
                  </div>
                ) : (
                  <FormLabel>Configuration Profiles</FormLabel>
                )}
                <FormControl>
                  <MultiProfileSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription className={form.watch("action_type") === "remove_profile" ? "text-destructive" : ""}>
                  Select configuration profiles to be <span className="font-semibold">{form.watch("action_type") === "push_profile" ? "installed on" : "removed from"}</span> devices at the scheduled time.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Device Filter */}
        <div>
          <FormField
            control={form.control}
            name="device_filter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Filter (Optional)</FormLabel>
                <FormControl>
                  <DeviceFilterSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Specify which devices should {actionType === "push_profile" ? "receive" : "have removed"} this profile. Leave empty to apply to all devices.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* SimpleMDM Assignment Group */}
        <div>
          <AssignmentGroupField form={form} />
        </div>
        
        {/* Recurring Schedule Options */}
        {scheduleType === "recurring" && (
          <div className="space-y-4 border rounded-md p-4">
            <FormField
              control={form.control}
              name="recurrence_pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recurrence Pattern</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recurrence pattern" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {recurrencePattern === "weekly" && (
              <FormField
                control={form.control}
                name="days_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days of Week</FormLabel>
                    <FormDescription>
                      Select which days of the week to run
                    </FormDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { label: "Sun", value: 0 },
                        { label: "Mon", value: 1 },
                        { label: "Tue", value: 2 },
                        { label: "Wed", value: 3 },
                        { label: "Thu", value: 4 },
                        { label: "Fri", value: 5 },
                        { label: "Sat", value: 6 },
                      ].map((day) => {
                        const isSelected = field.value?.includes(day.value);
                        return (
                          <Button
                            key={day.value}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className="w-12"
                            onClick={() => {
                              const currentValue = field.value || [];
                              if (isSelected) {
                                field.onChange(
                                  currentValue.filter((v) => v !== day.value)
                                );
                              } else {
                                field.onChange([...currentValue, day.value]);
                              }
                            }}
                          >
                            {day.label}
                          </Button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {recurrencePattern === "monthly" && (
              <FormField
                control={form.control}
                name="day_of_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value, 10) : "";
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a number between 1-31. If the month doesn't have this day, the schedule will run on the last day of the month.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            variant={actionType === "remove_profile" ? "destructive" : "default"}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update Schedule" : "Create Schedule"} 
            {!isEditMode && (
              <span className="ml-1">
                {actionType === "push_profile" && "(Install Profile)"}
                {actionType === "remove_profile" && "(Remove Profile)"}
                {actionType === "push_remove_profile" && "(Install & Auto-Remove)"}
              </span>
            )}
          </Button>
        </div>
        
        {(createSchedule.isError || updateSchedule.isError) && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to {isEditMode ? "update" : "create"} schedule. Please try again.
            </AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
};

export default ScheduleForm;