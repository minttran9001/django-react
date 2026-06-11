"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const toastStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
  "--success-bg": "var(--toast-success-bg)",
  "--success-text": "var(--toast-success-text)",
  "--success-border": "var(--toast-success-border)",
  "--error-bg": "var(--toast-error-bg)",
  "--error-text": "var(--toast-error-text)",
  "--error-border": "var(--toast-error-border)",
  "--warning-bg": "var(--toast-warning-bg)",
  "--warning-text": "var(--toast-warning-text)",
  "--warning-border": "var(--toast-warning-border)",
  "--info-bg": "var(--toast-info-bg)",
  "--info-text": "var(--toast-info-text)",
  "--info-border": "var(--toast-info-border)",
} as React.CSSProperties

const toastClassNames: ToasterProps["toastOptions"] = {
  classNames: {
    toast: "group toast border shadow-lg",
    title: "text-sm font-medium",
    description: "text-sm opacity-90",
    success: "border-[var(--toast-success-border)]",
    error: "border-[var(--toast-error-border)]",
    warning: "border-[var(--toast-warning-border)]",
    info: "border-[var(--toast-info-border)]",
    icon:
      "group-data-[type=success]:text-[var(--toast-success-icon)] group-data-[type=error]:text-[var(--toast-error-icon)] group-data-[type=warning]:text-[var(--toast-warning-icon)] group-data-[type=info]:text-[var(--toast-info-icon)] group-data-[type=loading]:text-[var(--toast-loading-icon)]",
    actionButton:
      "bg-primary text-primary-foreground text-xs font-medium",
    cancelButton:
      "bg-muted text-muted-foreground text-xs font-medium",
    closeButton:
      "border-border bg-background text-foreground",
  },
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={toastClassNames}
      style={toastStyle}
      {...props}
    />
  )
}

export { Toaster }
