import { Search } from "lucide-react";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export default function LaunchpadView() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <Card className="w-full max-w-lg bg-[var(--color-bg-container)]">
        <CardHeader className="pb-3 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Search className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="text-lg">Launchpad</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Quick actions, templates, and shortcuts will live here.
        </CardContent>
      </Card>
    </div>
  );
}
