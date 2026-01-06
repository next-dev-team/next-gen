import { Toaster as Sonner } from "sonner";
import { usePuckStore } from "../../stores/puckStore";

const Toaster = ({ ...props }) => {
  const designMode = usePuckStore((s) => s.designSystem.mode);

  return (
    <Sonner
      theme={designMode === "dark" ? "dark" : "light"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
