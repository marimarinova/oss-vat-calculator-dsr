/**
 * Dashboard Page
 * Shows summary cards, quarterly overview, and key metrics
 */

import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { VatSummaryCard } from '../components/VatSummaryCard';
import { ThresholdAlert } from '../components/ThresholdAlert';

export const Dashboard: React.FC = () => {
  const { transactions, isFirebaseEnabled } = useAppContext();

  const currentDate = new Date();
  const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
  const currentYear = currentDate.getFullYear();

  const quarterlyTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const date = new Date(tx.date);
      const txQuarter = Math.floor(date.getMonth() / 3) + 1;
      return date.getFullYear() === currentYear && txQuarter === currentQuarter;
    });
  }, [transactions, currentYear, currentQuarter]);

  const stats = useMemo(() => {
    const netTotal = quarterlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const vatTotal = quarterlyTransactions.reduce(
      (sum, tx) => sum + (tx.amount * (tx.vatRate || 19)) / 100,
      0,
    );
    const goodsCount = quarterlyTransactions.filter((tx) => tx.productType === 'goods').length;
    const servicesCount = quarterlyTransactions.filter(
      (tx) => tx.productType === 'services',
    ).length;

    // Calculate by country
    const byCountry: Record<string, number> = {};
    quarterlyTransactions.forEach((tx) => {
      byCountry[tx.buyerCountry] = (byCountry[tx.buyerCountry] || 0) + tx.amount;
    });

    return {
      netTotal,
      vatTotal,
      goodsCount,
      servicesCount,
      byCountry,
      transactionCount: quarterlyTransactions.length,
    };
  }, [quarterlyTransactions]);

  const topCountries = useMemo(() => {
    return Object.entries(stats.byCountry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([country, amount]) => ({ country, amount }));
  }, [stats.byCountry]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Q{currentQuarter} {currentYear} Summary
        </p>
      </div>

      {/* Threshold Alert */}
      <ThresholdAlert totalVat={stats.vatTotal} threshold={10000} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <VatSummaryCard
          title="Total Transactions"
          value={stats.transactionCount}
          unit="count"
          icon="📊"
          color="blue"
          subtext={`${stats.goodsCount} goods, ${stats.servicesCount} services`}
        />
        <VatSummaryCard
          title="Net Amount"
          value={stats.netTotal}
          unit="EUR"
          icon="💶"
          color="green"
          subtext="Taxable supplies"
        />
        <VatSummaryCard
          title="VAT Liability"
          value={stats.vatTotal}
          unit="EUR"
          icon="📋"
          color="blue"
          subtext={`${((stats.vatTotal / stats.netTotal) * 100 || 0).toFixed(1)}% avg rate`}
        />
        <VatSummaryCard
          title="Threshold Status"
          value={Math.min((stats.vatTotal / 10000) * 100, 100)}
          unit="%"
          icon={stats.vatTotal >= 10000 ? '⚠️' : '✅'}
          color={stats.vatTotal >= 10000 ? 'red' : 'green'}
          subtext={`${(10000 - stats.vatTotal).toFixed(2)} EUR until filing`}
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Member States */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Member States</h2>
          {topCountries.length > 0 ? (
            <div className="space-y-3">
              {topCountries.map(({ country, amount }, index) => (
                <div key={country} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-blue-600 w-8 text-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{country}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    EUR
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No transactions this quarter</p>
          )}
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Data Storage</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isFirebaseEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isFirebaseEnabled ? '☁️ Cloud' : '💾 Local'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">HMAC Audit Chain</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                ✓ Active
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Data Lifecycle</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Processing
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">VAT Calculation</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                v0.1.0
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Design Principles */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Design Principles (DSR)</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            <strong>DP1:</strong> Near-zero cost via Firebase free tier (2 MB Firestore, local
            fallback available)
          </li>
          <li>
            <strong>DP2:</strong> HMAC-SHA256 audit chain for transaction integrity
          </li>
          <li>
            <strong>DP3:</strong> Data lifecycle taxonomy (draft → processing → filed)
          </li>
          <li>
            <strong>DP4:</strong> Deterministic VAT calculation with transparent rate sources (EU
            VAT tables Q1 2026)
          </li>
          <li>
            <strong>DP5:</strong> Portal-aligned output (NAP Bulgaria sections 2A–2D, EN 16931/UBL
            forward compatibility)
          </li>
        </ul>
      </div>
    </div>
  );
};
