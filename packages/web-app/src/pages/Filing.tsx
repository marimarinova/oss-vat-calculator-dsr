/**
 * OSS Return Filing Page
 * Quarterly return submission and history
 */

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ReturnPreview } from '../components/ReturnPreview';

export const Filing: React.FC = () => {
  const { transactions, filings, addFiling } = useAppContext();
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'draft' | 'history'>('draft');

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear];

  const quarterlyTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const date = new Date(tx.date);
      const txQuarter = Math.floor(date.getMonth() / 3) + 1;
      return date.getFullYear() === selectedYear && txQuarter === selectedQuarter;
    });
  }, [transactions, selectedYear, selectedQuarter]);

  const stats = useMemo(() => {
    const netTotal = quarterlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const vatTotal = quarterlyTransactions.reduce(
      (sum, tx) => sum + (tx.amount * (tx.vatRate || 19)) / 100,
      0,
    );
    return { netTotal, vatTotal, transactionCount: quarterlyTransactions.length };
  }, [quarterlyTransactions]);

  const handleGeneratePDF = () => {
    alert(
      'PDF generation would call packages/oss-calculator/output/pdf-invoice\n\n' +
        `Q${selectedQuarter} ${selectedYear}\n` +
        `Transactions: ${stats.transactionCount}\n` +
        `VAT: ${stats.vatTotal.toFixed(2)} EUR`,
    );
  };

  const handleExportCSV = () => {
    alert(
      'CSV export would call packages/oss-calculator/output/csv-nap-export\n\n' +
        `Q${selectedQuarter} ${selectedYear}\n` +
        `Format: NAP Bulgaria Sections 2A–2D\n` +
        `Transactions: ${stats.transactionCount}`,
    );
  };

  const handleSubmitFiling = async () => {
    await addFiling({
      period: `${selectedYear}-Q${selectedQuarter}`,
      status: 'submitted',
      createdAt: Date.now(),
      submittedAt: Date.now(),
    });
    alert(`Filing Q${selectedQuarter} ${selectedYear} submitted successfully!`);
  };

  const historicalFilings = filings.filter((f) => {
    const [year, quarter] = f.period
      .split('-Q')
      .map((x, i) => (i === 0 ? parseInt(x) : parseInt(x)));
    return year === selectedYear || year === selectedYear - 1;
  });

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">OSS VAT Return</h1>
        <p className="text-gray-500 mt-1">
          Quarterly filing for intra-community B2C supplies (NAP Bulgaria format)
        </p>
      </div>

      {/* Quarter/Year Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quarter</label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Q1 (Jan–Mar)</option>
              <option value={2}>Q2 (Apr–Jun)</option>
              <option value={3}>Q3 (Jul–Sep)</option>
              <option value={4}>Q4 (Oct–Dec)</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{stats.transactionCount}</span> transactions · VAT:{' '}
              <span className="font-semibold text-blue-600">
                {stats.vatTotal.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                EUR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('draft')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'draft'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          Draft Return
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'history'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          Filing History
        </button>
      </div>

      {/* Draft Return Tab */}
      {activeTab === 'draft' && (
        <div className="space-y-6">
          {quarterlyTransactions.length > 0 ? (
            <>
              {/* Return Preview */}
              <ReturnPreview
                transactions={quarterlyTransactions}
                quarter={selectedQuarter}
                year={selectedYear}
              />

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-lg border border-gray-200 p-6">
                <button
                  onClick={handleGeneratePDF}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
                >
                  📄 Generate PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition"
                >
                  📊 Export CSV
                </button>
                <button
                  onClick={handleSubmitFiling}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  ✓ Submit Filing
                </button>
              </div>

              {/* System Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Design Principle 5: Portal-Aligned Output
                </h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>
                    <strong>CSV Format:</strong> Compatible with NAP Bulgaria sections 2A–2D
                    (intra-community supplies)
                  </li>
                  <li>
                    <strong>PDF Output:</strong> Article 226 TFEU compliant invoice format with
                    audit trail
                  </li>
                  <li>
                    <strong>UBL 2.1/EN 16931:</strong> XML structure for forward compatibility with
                    ViDA (2025) reforms
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 mb-2">No transactions for this quarter</p>
              <p className="text-sm text-gray-400">
                Add transactions in the Transactions tab first
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filing History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {historicalFilings.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      Documents
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historicalFilings.map((filing) => (
                    <tr key={filing.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {filing.period}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            filing.status === 'submitted'
                              ? 'bg-blue-100 text-blue-700'
                              : filing.status === 'accepted'
                                ? 'bg-green-100 text-green-700'
                                : filing.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {filing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(filing.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {filing.submittedAt
                          ? new Date(filing.submittedAt).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {filing.pdfUrl || filing.csvUrl ? (
                          <span className="text-blue-600 font-medium">📎 Available</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 mb-2">No filing history</p>
              <p className="text-sm text-gray-400">
                Submit your first return in the Draft Return tab
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
