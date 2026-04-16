/**
 * Transactions Page
 * Manage transaction input, edit, and delete
 */

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TransactionForm } from '../components/TransactionForm';
import { getMemberStateName } from '@oss-vat/shared-core';

export const Transactions: React.FC = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } =
    useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter((tx) => {
    const matchesCountry = !filterCountry || tx.buyerCountry === filterCountry;
    const matchesSearch =
      !searchTerm ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.includes(searchTerm);
    return matchesCountry && matchesSearch;
  });

  const handleAddTransaction = (data: {
    date: string;
    buyerCountry: string;
    amount: number;
    currency: string;
    description: string;
    productType: 'goods' | 'services';
  }) => {
    addTransaction({
      date: data.date,
      buyerCountry: data.buyerCountry,
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency,
      description: data.description,
      productType: data.productType,
    });
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  const uniqueCountries = [...new Set(transactions.map((t) => t.buyerCountry))];
  const totalNet = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalVat = filteredTransactions.reduce(
    (sum, tx) => sum + (tx.amount * (tx.vatRate || 19)) / 100,
    0
  );

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500 mt-1">
          Manage your cross-border B2C transactions
        </p>
      </div>

      {/* Add Transaction Form */}
      <TransactionForm onSubmit={handleAddTransaction} />

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Country
            </label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Countries</option>
              {uniqueCountries.map((code) => (
                <option key={code} value={code}>
                  {getMemberStateName(code as any)} ({code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Description or transaction ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterCountry('');
                setSearchTerm('');
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {filteredTransactions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 bg-white rounded-lg border border-gray-200 p-4">
          <div>
            <p className="text-xs font-medium text-gray-500">TRANSACTIONS</p>
            <p className="text-2xl font-bold text-gray-900">
              {filteredTransactions.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">NET TOTAL (EUR)</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalNet.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">VAT LIABILITY (EUR)</p>
            <p className="text-2xl font-bold text-blue-600">
              {totalVat.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                    VAT
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((tx) => {
                    const vatAmount = (tx.amount * (tx.vatRate || 19)) / 100;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(tx.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {tx.buyerCountry}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="max-w-xs truncate">{tx.description}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          {(tx.amount / 100).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          {tx.currency}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                          {vatAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          EUR
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              tx.productType === 'goods'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {tx.productType === 'goods' ? '📦' : '🔧'}{' '}
                            {tx.productType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No transactions found</p>
            <p className="text-sm text-gray-400">
              {transactions.length === 0
                ? 'Add your first transaction above'
                : 'Adjust your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
