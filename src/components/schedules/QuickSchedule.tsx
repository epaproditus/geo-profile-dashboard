import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DeviceFilterSelector from "@/components/schedules/DeviceFilterSelector";
import { useCreateSchedule } from "@/hooks/use-schedules";
import { supabase } from "@/lib/supabase";
import { Clock, AlertCircle, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define the profiles that can be pushed via quick schedule
const QUICK_PROFILES = [
  { id: "173535", name: "Quick Profile 1" },
  { id: "173628", name: "Quick Profile 2" }
];

interface QuickScheduleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickSchedule: React.FC<QuickScheduleProps> = ({ open, onOpenChange }) => {
  // State for form fields
  const [deviceFilter, setDeviceFilter] = useState("");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [duration, setDuration] = useState<string>("10");
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Hooks
  const createSchedule = useCreateSchedule();
  const { toast } = useToast();
  
  // Fetch server time when component opens
  useEffect(() => {
    if (open) {
      fetchServerTime();
      // Reset form state
      setDeviceFilter("");
      setSelectedProfileIds([QUICK_PROFILES[0].id]);
      setDuration("10");
    }
  }, [open]);
  
  // Function to fetch server time
  const fetchServerTime = async () => {
    try {
      const { data, error } = await supabase.rpc('get_server_time');
      
      if (error) throw error;
      
      if (data) {
        setServerTime(new Date(data));
      }
    } catch (err) {
      console.error('Error fetching server time:', err);
      toast({
        title: "Error",
        description: "Failed to fetch server time. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!serverTime) {
      toast({
        title: "Error",
        description: "Server time not available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedProfileIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one profile.",
        variant: "destructive"
      });
      return;
    }
    
    if (!deviceFilter) {
      toast({
        title: "Error",
        description: "Please select target devices.",
        variant: "destructive"
      });
      return;
    }
    
    const durationMinutes = parseInt(duration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid duration.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Calculate start and end times
      const startTime = new Date(serverTime);
      const endTime = new Date(serverTime);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);
      
      // Selected profile names for the schedule name
      const profileNames = QUICK_PROFILES
        .filter(p => selectedProfileIds.includes(p.id))
        .map(p => p.name)
        .join(", ");
      
      // Create temporary schedule
      await createSchedule.mutateAsync({
        name: `Quick Schedule - ${profileNames}`,
        description: `Temporary schedule for ${durationMinutes} minutes`,
        enabled: true,
        profile_id: selectedProfileIds[0], // For backward compatibility
        profile_ids: selectedProfileIds, // For the form validation
        device_filter: deviceFilter,
        schedule_type: "one_time",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        timezone: "UTC", // Using UTC for consistency
        action_type: "push_profile"
      });
      
      toast({
        title: "Success",
        description: `Scheduled profile for ${durationMinutes} minutes.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating quick schedule:", error);
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Timer className="mr-2 h-5 w-5" />
            Quick Schedule
          </DialogTitle>
          <DialogDescription>
            Quickly push a specific profile to devices for a temporary duration.
          </DialogDescription>
        </DialogHeader>
        
        {/* Server Time Indicator */}
        <div className="flex items-center text-sm bg-muted p-2 rounded mb-4">
          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Server Time: </span>
          <span className="ml-1 font-medium">
            {serverTime 
              ? new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'medium'
                }).format(serverTime) 
              : "Loading..."}
          </span>
        </div>
        
        <div className="space-y-4 py-2">
          {/* Profile Selection */}
          <div className="space-y-2">
            <Label htmlFor="profile-select">Profile to Push</Label>
            <div className="space-y-2">
              {QUICK_PROFILES.map(profile => (
                <div key={profile.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`profile-${profile.id}`}
                    checked={selectedProfileIds.includes(profile.id)}
                    onChange={() => {
                      if (selectedProfileIds.includes(profile.id)) {
                        setSelectedProfileIds(selectedProfileIds.filter(id => id !== profile.id));
                      } else {
                        setSelectedProfileIds([...selectedProfileIds, profile.id]);
                      }
                    }}
                  />
                  <Label htmlFor={`profile-${profile.id}`}>{profile.name}</Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Device Filter */}
          <div className="space-y-2">
            <Label>Target Devices</Label>
            <DeviceFilterSelector 
              value={deviceFilter} 
              onChange={setDeviceFilter} 
            />
          </div>
          
          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="1440" // 24 hours
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Profile will be automatically removed after this duration
            </p>
          </div>
          
          <Alert variant="default" className="bg-blue-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will create a temporary schedule that will push the selected profile
              to target devices immediately and automatically remove it after the specified duration.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Scheduling..." : "Schedule Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSchedule;
