import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroPath — AI-Generated Learning Paths" },
      {
        name: "description",
        content:
          "NeuroPath builds personalized AI learning paths. Pick a topic, set your level, and track progress in one clean workspace.",
      },
      { property: "og:title", content: "NeuroPath — AI-Generated Learning Paths" },
      {
        property: "og:description",
        content:
          "Personalized AI learning paths with progress tracking, built for focused self-study.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/neuropath/index.html");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading NeuroPath…</p>
    </div>
  );
}
