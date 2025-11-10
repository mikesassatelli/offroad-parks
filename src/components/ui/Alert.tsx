"use client";

import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";

export type AlertType = "success" | "error" | "info";

export interface AlertMessage {
  id: string;
  type: AlertType;
  message: string;
}

interface AlertProps {
  alert: AlertMessage;
  onDismiss: (id: string) => void;
}

function Alert({ alert, onDismiss }: AlertProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(alert.id);
    }, 300);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [alert.id]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const Icon = icons[alert.type];

  return (
    <div
      className={`flex items-center gap-3 p-4 border rounded-lg shadow-sm transition-all duration-300 ${styles[alert.type]} ${
        isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{alert.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface AlertContainerProps {
  alerts: AlertMessage[];
  onDismiss: (id: string) => void;
}

export function AlertContainer({ alerts, onDismiss }: AlertContainerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 w-full max-w-md">
      {alerts.map((alert) => (
        <Alert key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
