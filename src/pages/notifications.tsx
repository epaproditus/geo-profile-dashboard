import React from 'react';
import { getNtfySubscriptionGuide } from '@/lib/ntfy';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone, Bell, Share2 } from 'lucide-react';
import MarkdownRenderer from '@/components/ui/markdown-renderer';

export default function NotificationsGuidePage() {
  const ntfyGuide = getNtfySubscriptionGuide();

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/" passHref>
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Push Notifications for Profile Events</h1>

      <div className="mb-8">
        <p className="text-lg mb-4">
          This guide will help you set up push notifications to receive alerts when profiles 
          are installed on or removed from devices in SimpleMDM.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-card p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
          <Smartphone className="h-10 w-10 mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">Install the App</h3>
          <p className="text-muted-foreground">
            Download the ntfy app for your iOS or Android device.
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
          <Share2 className="h-10 w-10 mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">Subscribe to Topic</h3>
          <p className="text-muted-foreground">
            Add a subscription to the geo-profile-dashboard topic.
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
          <Bell className="h-10 w-10 mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">Receive Notifications</h3>
          <p className="text-muted-foreground">
            Get alerts when profiles are installed or removed.
          </p>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none mb-12">
        <MarkdownRenderer content={ntfyGuide} />
      </div>

      <div className="bg-muted p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">What You'll Receive</h3>
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-md">
            <h4 className="font-medium text-primary mb-1">Profile Installed</h4>
            <p className="text-sm text-muted-foreground">
              "The profile "VPN Configuration" has been installed on device "John's iPhone"."
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-md">
            <h4 className="font-medium text-primary mb-1">Temporary Profile Installed</h4>
            <p className="text-sm text-muted-foreground">
              "The profile "Guest WiFi" has been installed on device "Sarah's iPad". It will be removed in 60 minutes."
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-md">
            <h4 className="font-medium text-primary mb-1">Profile Removed</h4>
            <p className="text-sm text-muted-foreground">
              "The profile "Guest WiFi" has been removed from device "Sarah's iPad". This was a scheduled removal of a temporary profile."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
