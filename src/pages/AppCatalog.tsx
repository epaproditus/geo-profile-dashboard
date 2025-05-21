import React, { useState, useEffect } from 'react';
import { useApps, useAssignmentGroups } from '../hooks/use-simplemdm';
import Navbar from '../components/Navbar';
import { simplemdmApi } from "../lib/api/simplemdm";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  List,
  Search,
  X,
  Package,
  AppWindow,
  Settings,
  Puzzle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Generate a consistent color based on app name
const getAppColor = (name: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
    'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-orange-500', 
    'bg-teal-500', 'bg-cyan-500'
  ];
  
  // Generate a simple hash from the app name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Get an icon based on app type
const getAppIcon = (app: any) => {
  const appType = app.attributes.app_type;
  const bundleId = app.attributes.bundle_identifier || '';
  
  if (bundleId.includes('settings')) return <Settings className="h-6 w-6 text-white" />;
  if (bundleId.includes('game')) return <Puzzle className="h-6 w-6 text-white" />;
  
  if (appType === 'store') return <AppWindow className="h-6 w-6 text-white" />;
  return <Package className="h-6 w-6 text-white" />;
};

const AppCatalog: React.FC = () => {
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [limit, setLimit] = useState<number>(50); // Default to 50 apps per page
  const [startingAfter, setStartingAfter] = useState<string | undefined>(undefined);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'compact' | 'table'>('table');
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'status'>('none');
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const { data, isLoading, error } = useApps({ 
    limit, 
    starting_after: startingAfter 
  });

  const { data: assignmentGroups, isLoading: isLoadingGroups } = useAssignmentGroups({ limit: 50 });

  const hasNextPage = data?.has_more || false;
  const hasPreviousPage = pageHistory.length > 0;

  const handleUpdateApps = async () => {
    // If no group is selected, show the dialog
    if (!selectedGroupId) {
      setIsGroupDialogOpen(true);
      return;
    }

    setLoading(true);

    try {
      // Use the selected assignment group ID
      await simplemdmApi.updateAppsInGroup(selectedGroupId);

      // Show a success toast
      toast({
        title: "Success!",
        description: `Apps updated successfully for group ${selectedGroupId}.`,
        variant: "default",
      });
    } catch (error) {
      // Show an error toast
      toast({
        title: "Error",
        description: "Failed to update apps. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (data?.data && data.data.length > 0) {
      const lastItemId = data.data[data.data.length - 1].id.toString();
      setPageHistory([...pageHistory, startingAfter || '']);
      setStartingAfter(lastItemId);
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory];
      const previousStartingAfter = newHistory.pop();
      setPageHistory(newHistory);
      setStartingAfter(previousStartingAfter === '' ? undefined : previousStartingAfter);
      setCurrentPage(currentPage - 1);
    }
  };

  const handleLimitChange = (value: string) => {
    setLimit(Number(value));
    setStartingAfter(undefined);
    setPageHistory([]);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const filterApps = (apps: any[]) => {
    if (!apps) return [];
    
    let filtered = apps;
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = apps.filter(app => 
        app.attributes.name.toLowerCase().includes(term) || 
        (app.attributes.bundle_identifier && app.attributes.bundle_identifier.toLowerCase().includes(term))
      );
    }
    
    if (activeTab !== "all") {
      filtered = filtered.filter(app => app.attributes.app_type === activeTab);
    }
    
    return filtered;
  };
  
  const groupApps = (apps: any[]) => {
    if (groupBy === 'none') return { 'All Apps': apps };
    
    return apps.reduce((groups: {[key: string]: any[]}, app) => {
      const key = groupBy === 'type' 
        ? app.attributes.app_type === 'store' ? 'App Store' : 'Custom' 
        : app.attributes.status.charAt(0).toUpperCase() + app.attributes.status.slice(1);
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(app);
      return groups;
    }, {});
  };

  const apps = data?.data || [];
  const filteredApps = filterApps(apps);
  const groupedApps = groupApps(filteredApps);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">App Catalog</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load app catalog. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">App Catalog</h1>
          <div className="flex items-center gap-2">
            {selectedGroupId && (
              <div className="text-sm mr-2">
                Selected Group: <span className="font-semibold">
                  {assignmentGroups?.data?.find(g => g.id.toString() === selectedGroupId)?.attributes.name}
                </span>
              </div>
            )}
            <Button onClick={handleUpdateApps} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Apps...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Apps
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handlePreviousPage} 
              disabled={!hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={handleNextPage} 
              disabled={!hasNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select onValueChange={handleLimitChange} defaultValue={limit.toString()}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Input 
              type="text" 
              placeholder="Search apps..." 
              value={searchTerm} 
              onChange={handleSearchChange} 
              className="w-64"
            />
            {searchTerm && (
              <Button variant="ghost" onClick={clearSearch}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant={viewMode === 'compact' ? 'default' : 'outline'} 
              onClick={() => setViewMode('compact')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'outline'} 
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="store">App Store</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            {viewMode === 'compact' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {filteredApps.map((app) => (
                  <Card key={app.id} className="overflow-hidden">
                    <CardHeader className="p-2">
                      <div className="flex flex-col items-center">
                        {app.attributes.app_store_preview?.artwork_url ? (
                          <img 
                            src={app.attributes.app_store_preview.artwork_url} 
                            alt={app.attributes.name} 
                            className="h-12 w-12 rounded-md mb-1"
                          />
                        ) : (
                          <div className={`h-12 w-12 ${getAppColor(app.attributes.name)} rounded-md mb-1 flex items-center justify-center`}>
                            {getAppIcon(app)}
                          </div>
                        )}
                        <div className="text-xs font-medium text-center line-clamp-1" title={app.attributes.name}>
                          {app.attributes.name}
                        </div>
                        <Badge 
                          variant={app.attributes.app_type === 'store' ? 'default' : 'secondary'}
                          className="text-[10px] h-4 px-1 mt-1"
                        >
                          {app.attributes.app_type === 'store' ? 'App Store' : 'Custom'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <div className="text-[10px] text-center text-muted-foreground line-clamp-1" title={app.attributes.bundle_identifier || ''}>
                        {app.attributes.bundle_identifier || '-'}
                      </div>
                      <div className="flex justify-center mt-1">
                        <Button 
                          variant="outline" 
                          className="h-6 text-xs px-2 w-full"
                          onClick={() => setSelectedAppId(app.id)}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.attributes.name}</TableCell>
                      <TableCell>
                        <Badge variant={app.attributes.app_type === 'store' ? 'default' : 'secondary'}>
                          {app.attributes.app_type === 'store' ? 'App Store' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={app.attributes.status === 'ready' ? 'default' : 'outline'} className={app.attributes.status === 'ready' ? 'bg-green-500' : ''}>
                          {app.attributes.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{app.attributes.version || 'N/A'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedAppId(app.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          <TabsContent value="store">
            {viewMode === 'compact' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {filteredApps.map((app) => (
                  <Card key={app.id} className="overflow-hidden">
                    <CardHeader className="p-2">
                      <div className="flex flex-col items-center">
                        {app.attributes.app_store_preview?.artwork_url ? (
                          <img 
                            src={app.attributes.app_store_preview.artwork_url} 
                            alt={app.attributes.name} 
                            className="h-12 w-12 rounded-md mb-1"
                          />
                        ) : (
                          <div className={`h-12 w-12 ${getAppColor(app.attributes.name)} rounded-md mb-1 flex items-center justify-center`}>
                            {getAppIcon(app)}
                          </div>
                        )}
                        <div className="text-xs font-medium text-center line-clamp-1" title={app.attributes.name}>
                          {app.attributes.name}
                        </div>
                        <Badge 
                          variant={app.attributes.app_type === 'store' ? 'default' : 'secondary'}
                          className="text-[10px] h-4 px-1 mt-1"
                        >
                          {app.attributes.app_type === 'store' ? 'App Store' : 'Custom'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <div className="text-[10px] text-center text-muted-foreground line-clamp-1" title={app.attributes.bundle_identifier || ''}>
                        {app.attributes.bundle_identifier || '-'}
                      </div>
                      <div className="flex justify-center mt-1">
                        <Button 
                          variant="outline" 
                          className="h-6 text-xs px-2 w-full"
                          onClick={() => setSelectedAppId(app.id)}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.attributes.name}</TableCell>
                      <TableCell>
                        <Badge variant={app.attributes.app_type === 'store' ? 'default' : 'secondary'}>
                          {app.attributes.app_type === 'store' ? 'App Store' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={app.attributes.status === 'ready' ? 'default' : 'outline'} className={app.attributes.status === 'ready' ? 'bg-green-500' : ''}>
                          {app.attributes.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{app.attributes.version || 'N/A'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedAppId(app.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          <TabsContent value="custom">
            {viewMode === 'compact' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {filteredApps.map((app) => (
                  <Card key={app.id} className="overflow-hidden">
                    <CardHeader className="p-2">
                      <div className="flex flex-col items-center">
                        {app.attributes.app_store_preview?.artwork_url ? (
                          <img 
                            src={app.attributes.app_store_preview.artwork_url} 
                            alt={app.attributes.name} 
                            className="h-12 w-12 rounded-md mb-1"
                          />
                        ) : (
                          <div className={`h-12 w-12 ${getAppColor(app.attributes.name)} rounded-md mb-1 flex items-center justify-center`}>
                            {getAppIcon(app)}
                          </div>
                        )}
                        <div className="text-xs font-medium text-center line-clamp-1" title={app.attributes.name}>
                          {app.attributes.name}
                        </div>
                        <Badge 
                          variant={app.attributes.app_type === 'store' ? 'default' : 'secondary'}
                          className="text-[10px] h-4 px-1 mt-1"
                        >
                          {app.attributes.app_type === 'store' ? 'App Store' : 'Custom'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <div className="text-[10px] text-center text-muted-foreground line-clamp-1" title={app.attributes.bundle_identifier || ''}>
                        {app.attributes.bundle_identifier || '-'}
                      </div>
                      <div className="flex justify-center mt-1">
                        <Button 
                          variant="outline" 
                          className="h-6 text-xs px-2 w-full"
                          onClick={() => setSelectedAppId(app.id)}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.attributes.name}</TableCell>
                      <TableCell>
                        <Badge variant={app.attributes.app_type === 'store' ? 'default' : 'secondary'}>
                          {app.attributes.app_type === 'store' ? 'App Store' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={app.attributes.status === 'ready' ? 'default' : 'outline'} className={app.attributes.status === 'ready' ? 'bg-green-500' : ''}>
                          {app.attributes.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{app.attributes.version || 'N/A'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedAppId(app.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Showing {filteredApps.length} apps on page {currentPage}
          {hasNextPage && " • More apps available"}
        </div>

        <AppDetailDialog 
          appId={selectedAppId} 
          open={selectedAppId !== null}
          onClose={() => setSelectedAppId(null)}
        />
        
        {/* Dialog for selecting an assignment group */}
        <UpdateAppsDialog
          open={isGroupDialogOpen}
          onOpenChange={setIsGroupDialogOpen}
          assignmentGroups={assignmentGroups?.data || []}
          isLoading={isLoadingGroups}
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
          onUpdate={handleUpdateApps}
          isUpdating={loading}
        />
      </div>
    </>
  );
};

type AppDetailDialogProps = {
  appId: number | null;
  open: boolean;
  onClose: () => void;
};

const AppDetailDialog: React.FC<AppDetailDialogProps> = ({ appId, open, onClose }) => {
  const { data, isLoading } = useApps();
  
  if (!appId) return null;
  
  const app = data?.data.find(a => a.id === appId);

  if (!app) return null;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{app.attributes.name}</DialogTitle>
          <DialogDescription>
            {app.attributes.bundle_identifier || 'No bundle identifier'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">App Details</h3>
            <ScrollArea className="h-72 rounded-md border p-4">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">App Type:</dt>
                  <dd>{app.attributes.app_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Status:</dt>
                  <dd>{app.attributes.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Version:</dt>
                  <dd>{app.attributes.version || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Size:</dt>
                  <dd>
                    {app.attributes.size_in_bytes 
                      ? `${Math.round(app.attributes.size_in_bytes / (1024 * 1024))} MB` 
                      : 'Unknown'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Managed:</dt>
                  <dd>{app.attributes.managed ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Removable:</dt>
                  <dd>{app.attributes.removable ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Has Settings:</dt>
                  <dd>{app.attributes.has_settings ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Has Feedback:</dt>
                  <dd>{app.attributes.has_feedback ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Created:</dt>
                  <dd>{new Date(app.attributes.created_at).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Updated:</dt>
                  <dd>{new Date(app.attributes.updated_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </ScrollArea>
          </div>

          <div>
            {app.attributes.app_store_preview ? (
              <div className="flex flex-col h-full">
                <h3 className="font-semibold mb-2">App Store Information</h3>
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-md mb-4">
                  {app.attributes.app_store_preview.artwork_url ? (
                    <img 
                      src={app.attributes.app_store_preview.artwork_url} 
                      alt={app.attributes.name} 
                      className="h-24 w-24 rounded-lg mb-2"
                    />
                  ) : (
                    <div className="h-24 w-24 bg-secondary rounded-lg mb-2 flex items-center justify-center">
                      No Image
                    </div>
                  )}
                  <h4 className="font-medium">{app.attributes.app_store_preview.title || app.attributes.name}</h4>
                  <p className="text-sm text-muted-foreground">{app.attributes.app_store_preview.developer || 'Unknown developer'}</p>
                </div>
                <ScrollArea className="flex-1 rounded-md border p-4">
                  <p className="text-sm">
                    {app.attributes.app_store_preview.description || 'No description available.'}
                  </p>
                  {app.attributes.app_store_preview.app_store_url && (
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(app.attributes.app_store_preview?.app_store_url || '', '_blank')}
                      >
                        View in App Store
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-4 bg-muted rounded-md">
                <p className="text-muted-foreground">No App Store information available</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

type UpdateAppsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentGroups: any[];
  isLoading: boolean;
  selectedGroupId: string;
  setSelectedGroupId: (groupId: string) => void;
  onUpdate: () => void;
  isUpdating: boolean;
};

const UpdateAppsDialog: React.FC<UpdateAppsDialogProps> = ({
  open,
  onOpenChange,
  assignmentGroups,
  isLoading,
  selectedGroupId,
  setSelectedGroupId,
  onUpdate,
  isUpdating
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Apps</DialogTitle>
          <DialogDescription>
            Select an assignment group to update all its apps
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : assignmentGroups && assignmentGroups.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="assignment-group" className="text-sm font-medium">
                  Select an assignment group
                </label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger id="assignment-group">
                    <SelectValue placeholder="Select an assignment group" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.attributes.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGroupId && (
                <div className="border rounded-md p-3 bg-muted/30">
                  <h4 className="font-medium mb-2">Assignment Group Details</h4>
                  {assignmentGroups.map((group) => {
                    if (group.id.toString() === selectedGroupId) {
                      const appCount = group.relationships.apps.data.length;
                      const deviceCount = group.relationships.devices.data.length;
                      const deviceGroupCount = group.relationships.device_groups.data.length;
                      
                      return (
                        <div key={group.id} className="text-sm grid grid-cols-2 gap-2">
                          <span className="text-muted-foreground">Name:</span>
                          <span>{group.attributes.name}</span>
                          
                          <span className="text-muted-foreground">Apps:</span>
                          <span>{appCount} app{appCount !== 1 ? 's' : ''}</span>
                          
                          <span className="text-muted-foreground">Devices:</span>
                          <span>{deviceCount} device{deviceCount !== 1 ? 's' : ''}</span>
                          
                          <span className="text-muted-foreground">Device Groups:</span>
                          <span>{deviceGroupCount} group{deviceGroupCount !== 1 ? 's' : ''}</span>
                          
                          <span className="text-muted-foreground">Last Updated:</span>
                          <span>{formatDate(group.attributes.updated_at)}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No assignment groups found. Create assignment groups in SimpleMDM to update apps.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onUpdate} 
            disabled={!selectedGroupId || isUpdating || isLoading}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Apps...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Apps
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppCatalog;