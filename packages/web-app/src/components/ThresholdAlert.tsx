/**
 * Threshold Alert Component
 * Displays warnings for VAT liability thresholds
 * EUR 10,000 threshold for OSS registration
 */

import React from 'react';

interface ThresholdAlertProps {
  totalVat: number;
  threshold?: number;
  percentageUsed?: number;
}

export const ThresholdAlert: React.FC<ThresholdAlertProps> = ({
  totalVat,
  threshold = 10000,
  percentageUsed,
}) => {
  const percentage = percentageUsed ?? (totalVat / threshold) * 100;
  const remaining = threshold - totalVat;

  let alertType: 'critical' | 'warning' | 'info' = 'info';
  let alertMessage = '';
  let alertIcon = 'ℹ️';

  if (percentage >= 100) {
    alertType = 'critical';
    alertIcon = '🚨';
    alertMessage = `Threshold exceeded by ${(totalVat - threshold).toFixed(2)} EUR`;
  } else if (percentage >= 80) {
    alertType = 'warning';
    alertIcon = '⚠️';
    alertMessage = `${remaining.toFixed(2)} EUR remaining before threshold`;
  } else if (percentage >= 50) {
    alertType = 'info';
    alertIcon = '📌';
    alertMessage = `${percentage.toFixed(1)}% of EUR ${threshold.toLocaleString()} threshold used`;
  }

  const alertColors = {
    critical: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  const progressColors = {
    critical: 'bg-red-600',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  if (percentage < 50) {
    return null; // Don't show alert if threshold is not critical
  }

  return (
    <div className={`p-4 rounded-lg border ${alertColors[alertType]}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{alertIcon}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-2">{alertMessage}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${progressColors[alertType]} transition-all duration-300`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs mt-2 text-gray-600">
            {percentage.toFixed(1)}% of {threshold.toLocaleString()} EUR threshold
          </p>
        </div>
      </div>
    </div>
  );
};
