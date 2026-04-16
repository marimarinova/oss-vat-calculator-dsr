/**
 * VAT Calculator Page
 * Real-time calculation with rate transparency
 */

import React, { useState } from 'react';
import { getMemberStateRates, TaxEngine } from '@oss-vat/oss-calculator';
import { getMemberStateName, getAllMemberStates } from '@oss-vat/shared-core';

export const Calculator: React.FC = () => {
  const [formData, setFormData] = useState({
    amount: '',
    country: 'BG',
    rateType: 'standard' as const,
    currency: 'EUR',
  });

  const [result, setResult] = useState<{
    netAmount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
  } | null>(null);

  const memberStates = getAllMemberStates();
  const taxEngine = new TaxEngine();

  const handleCalculate = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const transaction = {
        id: 'calc_' + Date.now(),
        date: new Date(),
        customerCountryCode: formData.country,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        rateType: formData.rateType as
          | 'standard'
          | 'reduced'
          | 'super-reduced',
        isGoods: true,
      };

      const calcResult = taxEngine.calculateVAT(transaction);

      setResult({
        netAmount: calcResult.amountEUR,
        vatRate: calcResult.vatRate,
        vatAmount: calcResult.vatAmount,
        totalAmount: calcResult.totalAmountEUR,
      });
    } catch (error) {
      console.error('Calculation error:', error);
      alert('Calculation error: ' + (error as Error).message);
    }
  };

  const currentRates = getMemberStateRates(formData.country);
  const standardRate = currentRates?.standard[0];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Reset result on input change
    setResult(null);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">VAT Calculator</h1>
        <p className="text-gray-500 mt-1">
          Real-time calculation with destination-country rates
        </p>
      </div>

      {/* Calculator Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Input Details
          </h2>

          <div className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Net Amount
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Country
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {memberStates.map((code) => (
                  <option key={code} value={code}>
                    {getMemberStateName(code as any)} ({code})
                  </option>
                ))}
              </select>
            </div>

            {/* Rate Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VAT Rate Type
              </label>
              <select
                name="rateType"
                value={formData.rateType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="reduced">Reduced</option>
                <option value="super-reduced">Super-Reduced</option>
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="BGN">BGN (Bulgarian Lev)</option>
              </select>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition mt-6"
            >
              Calculate
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-6">Result</h2>

                <div className="space-y-4">
                  {/* Net Amount */}
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <p className="text-sm text-gray-600 mb-1">Net Amount (EUR)</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {result.netAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  {/* VAT Rate Applied */}
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <p className="text-sm text-gray-600 mb-1">
                      VAT Rate Applied (Design Principle 4)
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {result.vatRate.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Source: EU VAT Tables Q1 2026 (TAXUD)
                    </p>
                  </div>

                  {/* VAT Amount */}
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <p className="text-sm text-gray-600 mb-1">VAT Amount (EUR)</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {result.vatAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="bg-blue-600 text-white rounded-lg p-4">
                    <p className="text-sm opacity-90 mb-1">Total (Net + VAT)</p>
                    <p className="text-3xl font-bold">
                      {result.totalAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      EUR
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-2">No calculation yet</p>
              <p className="text-sm text-gray-400">
                Enter details and click Calculate to see results
              </p>
            </div>
          )}

          {/* Rate Information */}
          {currentRates && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {getMemberStateName(formData.country as any)} Rates
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-700">Standard Rate</span>
                  <span className="font-semibold text-gray-900">
                    {currentRates.standard[0]?.rate || 'N/A'}%
                  </span>
                </div>
                {currentRates.reduced.length > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">Reduced Rate</span>
                    <span className="font-semibold text-gray-900">
                      {currentRates.reduced[0]?.rate || 'N/A'}%
                    </span>
                  </div>
                )}
                {currentRates.superReduced && currentRates.superReduced.length > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">Super-Reduced Rate</span>
                    <span className="font-semibold text-gray-900">
                      {currentRates.superReduced[0]?.rate || 'N/A'}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Design Principle Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 mb-2">
          Design Principle 4: Deterministic Calculation
        </h3>
        <p className="text-sm text-amber-800">
          All calculations use the official EU VAT rate tables from the European
          Commission TAXUD database (Q1 2026). Rates are deterministic and
          reproducible across all transactions. Currency conversion uses ECB
          quarterly reference rates for consistent multi-currency support.
        </p>
      </div>
    </div>
  );
};
