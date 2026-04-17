/**
 * VAT Summary Card Component
 * Displays key metrics with currency formatting
 */

import React from 'react';

interface VatSummaryCardProps {
  title: string;
  value: number;
  unit: string;
  icon: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
  subtext?: string;
}

export const VatSummaryCard: React.FC<VatSummaryCardProps> = ({
  title,
  value,
  unit,
  icon,
  color = 'blue',
  subtext,
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  const formattedValue =
    unit === 'EUR'
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2,
        }).format(value)
      : value.toLocaleString('en-US');

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]} ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold">{formattedValue}</p>
          {subtext && <p className="text-xs mt-2 text-gray-500">{subtext}</p>}
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
};
