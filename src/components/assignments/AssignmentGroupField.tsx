import React from 'react';
import { useAssignmentGroups } from '@/hooks/use-simplemdm';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';

interface AssignmentGroupFieldProps {
  form: UseFormReturn<any>;
}

const AssignmentGroupField: React.FC<AssignmentGroupFieldProps> = ({ form }) => {
  const { data: assignmentGroups, isLoading } = useAssignmentGroups({ limit: 50 });

  return (
    <FormField
      control={form.control}
      name="assignment_group_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Assignment Group</FormLabel>
          <FormControl>
            <Select 
              value={field.value} 
              onValueChange={field.onChange} 
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an assignment group" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="ml-2">Loading...</span>
                  </div>
                ) : assignmentGroups?.data && assignmentGroups.data.length > 0 ? (
                  assignmentGroups.data.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.attributes.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No assignment groups found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </FormControl>
          <FormDescription>
            Select the SimpleMDM assignment group to use for profile operations.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default AssignmentGroupField;
