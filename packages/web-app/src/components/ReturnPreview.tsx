/**
 * OSS Return Preview Component
 * Shows quarterly return structure matching NAP Bulgaria format
 */

import React from 'react';
import { StorageTransaction, StorageFiling } from '../services/storage';

interface ReturnPreviewProps {
  transactions: StorageTransaction[];
  quarter: number;
  year: number;
}

interface CountryTotal {
  country: string;
  netAmount: number;
  vatAmount: number;
  transactions: number;
}

export const ReturnPreview: React.FC<ReturnPreviewProps> = ({ transactions, quarter, year }) => {
  // Aggregate by country
  const byCountry: Record<string, CountryTotal> = {};

  transactions.forEach((tx) => {
    if (!byCountry[tx.buyerCountry]) {
      byCountry[tx.buyerCountry] = {
        country: tx.buyerCountry,
        netAmount: 0,
        vatAmount: 0,
        transactions: 0,
      };
    }
    byCountry[tx.buyerCountry].netAmount += tx.amount;
    byCountry[tx.buyerCountry].vatAmount += (tx.amount * (tx.vatRate || 19)) / 100;
    byCountry[tx.buyerCountry].transactions += 1;
  });

  const countries = Object.values(byCountry).sort((a, b) => b.netAmount - a.netAmount);
  const totalNet = countries.reduce((sum, c) => sum + c.netAmount, 0);
  const totalVat = countries.reduce((sum, c) => sum + c.vatAmount, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-50 border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Q{quarter} {year} OSS VAT Return (NAP Bulgaria Format)
        </h3>
        <p className="text-sm text-gray-500 mt-1">Sections 2A–2D: Intra-community B2C supplies</p>
      </div>

      {/* Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Member State
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                Net Amount (EUR)
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">VAT Rate</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                VAT Amount (EUR)
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                Transactions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {countries.map((country) => (
              <tr key={country.country} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{country.country}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">
                  {country.netAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">19%</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                  {country.vatAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-6 py-4 text-sm text-center text-gray-700">
                  {country.transactions}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-blue-50 border-t border-gray-200">
            <tr>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">TOTAL</td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                {totalNet.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-6 py-4"></td>
              <td className="px-6 py-4 text-sm text-right font-bold text-blue-600 text-lg">
                {totalVat.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-6 py-4 text-sm text-center font-semibold text-gray-900">
                {transactions.length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500 font-medium">COUNTRIES REPORTED</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{countries.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">TOTAL TRANSACTIONS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{transactions.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">FILING THRESHOLD (EUR 10,000)</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              totalVat >= 10000 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {totalVat >= 10000 ? '🚨 EXCEEDED' : '✓ OK'}
          </p>
        </div>
      </div>
    </div>
  );
};
