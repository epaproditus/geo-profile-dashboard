import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusCircle, Calendar, Clock, Loader2, CheckCircle2, XCircle, Settings, CalendarClock, FileCheck2, FileX, ShieldAlert, Timer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSchedules, useToggleScheduleStatus, useDeleteSchedule } from "@/hooks/use-schedules";
import { useAllProfiles } from "@/hooks/use-simplemdm";
import ScheduleForm from "@/components/schedules/ScheduleForm";
import QuickSchedule from "@/components/schedules/QuickSchedule";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { AdminActionButton } from "@/components/AdminAction";
import { AdminOnly } from "@/components/AdminOnly";
import { isCurrentUserAdmin } from "@/lib/admin";

const Schedules = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isQuickScheduleOpen, setIsQuickScheduleOpen] = useState(false);
  const [editScheduleId, setEditScheduleId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<string>("upcoming");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const navigate = useNavigate();
  
  // Check if user is admin when component mounts
  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isCurrentUserAdmin();
      setIsAdmin(admin);
    };
    checkAdmin();
  }, []);
  
  // Fetch schedules - using direct approach
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Direct data fetching
  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log("Directly fetched schedules:", data);
      setSchedules(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data on load
  useEffect(() => {
    fetchSchedules();
  }, []);
  
  // Fetch profiles for reference
  const { data: profilesData } = useAllProfiles();
  
  // Mutation hooks
  const toggleStatus = useToggleScheduleStatus();
  const deleteSchedule = useDeleteSchedule();
  
  // Filter schedules based on selected tab
  const filteredSchedules = schedules.filter(schedule => {
    // Filter based on tab
    if (viewTab === "past") {
      return schedule.last_executed_at !== null;
    }
    if (viewTab === "upcoming") {
      return schedule.last_executed_at === null;
    }
    return true; // "all" tab
  });
  
  // Get profile name by id
  const getProfileName = (profileId) => {
    const profile = profilesData?.data?.find(p => p.id.toString() === profileId);
    return profile?.attributes?.name || "Unknown Profile";
  };
  
  // Format schedule time display
  const formatScheduleTime = (schedule) => {
    try {
      const startTime = parseISO(schedule.start_time);
      
      if (schedule.schedule_type === "one_time") {
        return format(startTime, "PPP 'at' p");
      }
      
      if (schedule.schedule_type === "recurring") {
        const pattern = schedule.recurrence_pattern || "daily";
        
        let recurrenceStr = "";
        if (pattern === "daily") {
          recurrenceStr = "Daily";
        } else if (pattern === "weekly") {
          recurrenceStr = "Weekly";
        } else if (pattern === "monthly") {
          recurrenceStr = "Monthly";
        }
        
        return `${recurrenceStr} at ${format(startTime, "p")}`;
      }
      
      return format(startTime, "PPP 'at' p");
    } catch (e) {
      console.error("Error formatting schedule time:", e);
      return "Invalid date";
    }
  };
  
  // Handle delete
  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      try {
        // Check if user is admin before proceeding
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
          alert("Only administrators can delete schedules.");
          return;
        }
        
        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase
          .from('schedules')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Refresh data after deletion
        fetchSchedules();
      } catch (err) {
        console.error("Error deleting schedule:", err);
        alert("Failed to delete schedule. Please try again.");
      }
    }
  };
  
  // Handle toggle status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      // Check if user is admin before proceeding
      const isAdmin = await isCurrentUserAdmin();
      if (!isAdmin) {
        alert("Only administrators can change schedule status.");
        return;
      }
      
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('schedules')
        .update({ enabled: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh data after update
      fetchSchedules();
    } catch (err) {
      console.error("Error toggling schedule status:", err);
      alert("Failed to update schedule status. Please try again.");
    }
  };

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <CalendarClock className="mr-2 h-6 w-6" />
                Schedule Manager
              </h1>
              <p className="text-muted-foreground">
                Schedule configuration profiles to be installed or removed at specific times
              </p>
            </div>
            
            <AdminActionButton onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Schedule
            </AdminActionButton>
          </div>
          
          {/* Admin Notice */}
          <AdminOnly
            fallback={
              <Alert className="mb-6">
                <ShieldAlert className="h-4 w-4 mr-2" />
                <AlertDescription>
                  Only administrators can create, edit, or delete schedules. You can view existing schedules but cannot modify them.
                </AlertDescription>
              </Alert>
            }
          >
            {null}
          </AdminOnly>
          
          {/* Filter options */}
          <div className="flex items-center justify-between mb-6">
            <Tabs value={viewTab} onValueChange={setViewTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Debug button */}
            <Button variant="outline" size="sm" onClick={() => {
              console.log("Manual refresh triggered");
              fetchSchedules();
              console.log(`Current schedules count: ${schedules?.length || 0}`);
              console.log(`Filtered schedules count: ${filteredSchedules?.length || 0}`);
            }}>
              <Loader2 className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <div className="flex justify-center my-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSchedules?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No schedules found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  {viewTab === "upcoming" 
                    ? "You don't have any upcoming scheduled profile installations."
                    : viewTab === "past" 
                    ? "No schedules have been executed yet."
                    : "You haven't created any schedules yet."}
                </p>
                <AdminActionButton onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Schedule
                </AdminActionButton>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules?.map(schedule => (
                <Card key={schedule.id} className="flex flex-col h-full">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-semibold flex items-center">
                          {schedule.name}
                          <Badge 
                            variant={schedule.enabled ? "default" : "secondary"} 
                            className="ml-2"
                          >
                            {schedule.enabled ? "Active" : "Inactive"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {schedule.description || formatScheduleTime(schedule)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2 flex-grow">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">{schedule.schedule_type === "one_time" ? "One-time" : "Recurring"}</Badge>
                        {schedule.action_type === "remove_profile" && (
                          <Badge variant="destructive" className="mr-2">Remove</Badge>
                        )}
                        {schedule.last_executed_at && (
                          <Badge variant="secondary">Executed</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatScheduleTime(schedule)}
                      </p>
                      
                      <p className="text-sm flex items-center">
                        <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                        {getProfileName(schedule.profile_id)}
                      </p>
                      
                      <p className="text-sm flex items-center">
                        {schedule.action_type === "remove_profile" ? (
                          <>
                            <FileX className="mr-2 h-4 w-4 text-destructive" />
                            <span className="text-destructive">Scheduled for removal</span>
                          </>
                        ) : (
                          <>
                            <FileCheck2 className="mr-2 h-4 w-4 text-primary" />
                            <span>Scheduled for installation</span>
                          </>
                        )}
                      </p>
                      
                      {schedule.last_executed_at && (
                        <p className="text-sm text-muted-foreground">
                          Executed {formatDistanceToNow(parseISO(schedule.last_executed_at))} ago
                        </p>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-2 flex justify-between">
                    <AdminActionButton 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleToggleStatus(schedule.id, schedule.enabled)}
                    >
                      {schedule.enabled ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Enable
                        </>
                      )}
                    </AdminActionButton>
                    
                    <div className="space-x-1">
                      <AdminActionButton 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditScheduleId(schedule.id)}
                      >
                        Edit
                      </AdminActionButton>
                      
                      <AdminActionButton 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        Delete
                      </AdminActionButton>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
      
      {/* Create Schedule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create New Schedule</DialogTitle>
            <DialogDescription>
              Schedule a configuration profile to be installed or removed at a specific time.
            </DialogDescription>
          </DialogHeader>
          
          <ScheduleForm 
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              fetchSchedules(); // Refresh data when form is submitted
            }} 
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Schedule Dialog */}
      <Dialog open={!!editScheduleId} onOpenChange={(open) => !open && setEditScheduleId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update this scheduled profile operation.
            </DialogDescription>
          </DialogHeader>
          
          <ScheduleForm 
            scheduleId={editScheduleId || undefined} 
            onSuccess={() => {
              setEditScheduleId(null);
              fetchSchedules(); // Refresh data when form is submitted
            }} 
            onCancel={() => setEditScheduleId(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Quick Schedule Dialog */}
      <Dialog open={isQuickScheduleOpen} onOpenChange={setIsQuickScheduleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Quick Schedule</DialogTitle>
            <DialogDescription>
              Quickly schedule a profile installation or removal.
            </DialogDescription>
          </DialogHeader>
          
          <QuickSchedule 
            onSuccess={() => {
              setIsQuickScheduleOpen(false);
              fetchSchedules(); // Refresh data when form is submitted
            }} 
            onCancel={() => setIsQuickScheduleOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </AuthCheck>
  );
};

export default Schedules;