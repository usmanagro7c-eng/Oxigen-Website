import { Toaster as Sonner } from "sonner";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        error: <AlertCircle className="h-4 w-4 text-rose-500" />,
        info: <Bell className="h-4 w-4 text-primary" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
