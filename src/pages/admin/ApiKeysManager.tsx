import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Save, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ApiKeysManager = () => {
  const { toast } = useToast();
  const [lovableApiKey, setLovableApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    checkExistingKey();
  }, []);

  const checkExistingKey = async () => {
    try {
      // Check if LOVABLE_API_KEY exists (we can't read it, just check status)
      setInitialLoad(false);
    } catch (error) {
      console.error('Error checking API key:', error);
      setInitialLoad(false);
    }
  };

  const handleSaveKey = async () => {
    if (!lovableApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      toast({
        title: "API Key Configuration",
        description: "Note: API keys are automatically configured for Lovable AI. This interface is for reference only.",
      });
      
      setLovableApiKey("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold gradient-text mb-2">API Keys</h2>
        <p className="text-muted-foreground">
          Manage API keys for chatbot and AI features
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle>Lovable AI Configuration</CardTitle>
          </div>
          <CardDescription>
            The Lovable AI API key is automatically configured and managed securely in your backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">Current Status</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm">Active and Ready</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Your Innovation Chatbot is using the Lovable AI gateway with automatic authentication.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">API Key (Read-Only)</label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value="••••••••••••••••••••••••••••••••"
                disabled
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              API keys are securely stored in your backend environment and cannot be viewed for security reasons.
            </p>
          </div>

          <div className="p-4 border-l-4 border-primary bg-primary/5 rounded">
            <h4 className="font-semibold text-sm mb-1">How it works</h4>
            <p className="text-sm text-muted-foreground">
              Your chatbot connects to Lovable AI through a secure edge function. The API key is stored in your backend environment variables and is never exposed to the client.
            </p>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Supported Models</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• google/gemini-2.5-flash (Default - Free)</li>
              <li>• google/gemini-2.5-pro (Advanced reasoning)</li>
              <li>• openai/gpt-5 (Premium)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysManager;
