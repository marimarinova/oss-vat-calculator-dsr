/**
 * Settings Page
 * User configuration and system status
 */

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export const Settings: React.FC = () => {
  const { sellerInfo, updateSellerInfo, isFirebaseEnabled } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    vatId: '',
    country: 'BG',
    email: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (sellerInfo) {
      setFormData(sellerInfo);
    }
  }, [sellerInfo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSellerInfo(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your seller information and system configuration
        </p>
      </div>

      {/* Seller Information Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Seller Information</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your company name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT Identification Number
            </label>
            <input
              type="text"
              name="vatId"
              value={formData.vatId}
              onChange={handleChange}
              placeholder="BG123456789 (or your country's format)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Home Country</label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BG">Bulgaria (BG)</option>
              <option value="AT">Austria (AT)</option>
              <option value="BE">Belgium (BE)</option>
              <option value="DE">Germany (DE)</option>
              <option value="FR">France (FR)</option>
              <option value="IT">Italy (IT)</option>
              <option value="ES">Spain (ES)</option>
              <option value="NL">Netherlands (NL)</option>
              <option value="PL">Poland (PL)</option>
              <option value="RO">Romania (RO)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@business.email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Save Information
          </button>

          {saved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✓ Information saved successfully
            </div>
          )}
        </form>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">System Status</h2>

        <div className="space-y-3">
          {/* Firebase Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Data Storage</p>
              <p className="text-sm text-gray-600">
                {isFirebaseEnabled
                  ? 'Synchronized with cloud Firebase'
                  : 'Running in local demo mode'}
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-lg font-semibold text-white ${
                isFirebaseEnabled ? 'bg-green-600' : 'bg-amber-600'
              }`}
            >
              {isFirebaseEnabled ? '☁️ Cloud' : '💾 Local'}
            </span>
          </div>

          {/* HMAC Audit Chain */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">HMAC Audit Chain</p>
              <p className="text-sm text-gray-600">
                SHA-256 integrity verification for all transactions (DP2)
              </p>
            </div>
            <span className="px-4 py-2 rounded-lg font-semibold text-white bg-green-600">
              ✓ Active
            </span>
          </div>

          {/* Data Lifecycle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Data Lifecycle Taxonomy</p>
              <p className="text-sm text-gray-600">Draft → Processing → Filed (DP3)</p>
            </div>
            <span className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600">
              Processing
            </span>
          </div>

          {/* VAT Engine Version */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">VAT Engine Version</p>
              <p className="text-sm text-gray-600">EU VAT tables Q1 2026 (TAXUD source)</p>
            </div>
            <span className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600">
              v0.1.0
            </span>
          </div>

          {/* Output Formats */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Output Formats</p>
              <p className="text-sm text-gray-600">PDF, CSV (NAP), UBL 2.1/EN 16931 (DP5)</p>
            </div>
            <span className="px-4 py-2 rounded-lg font-semibold text-white bg-green-600">
              ✓ Ready
            </span>
          </div>
        </div>
      </div>

      {/* Design Principles */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-blue-900">Design Science Research Principles</h3>

        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <p className="font-semibold">DP1: Near-Zero Cost</p>
            <p>
              Firebase free tier (2 MB Firestore, 10 GB downloads/month) with localStorage fallback
              for demo mode.
            </p>
          </div>

          <div>
            <p className="font-semibold">DP2: Audit Trail</p>
            <p>
              HMAC-SHA256 chain ensures transaction integrity and provides cryptographic proof for
              regulatory compliance.
            </p>
          </div>

          <div>
            <p className="font-semibold">DP3: Data Lifecycle</p>
            <p>
              Structured taxonomy tracks records from draft through processing to filed status with
              timestamps.
            </p>
          </div>

          <div>
            <p className="font-semibold">DP4: Deterministic Calculation</p>
            <p>
              All VAT rates sourced from European Commission TAXUD tables with effective date
              tracking for reproducibility.
            </p>
          </div>

          <div>
            <p className="font-semibold">DP5: Portal-Aligned Output</p>
            <p>
              CSV exports match NAP Bulgaria sections 2A–2D exactly. UBL 2.1/EN 16931 support
              ensures ViDA (2025) forward compatibility.
            </p>
          </div>
        </div>
      </div>

      {/* Development Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Development</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Frontend:</strong> React 18 + TypeScript, Vite, Tailwind CSS
          </p>
          <p>
            <strong>Backend:</strong> Firebase Auth + Firestore (or localStorage fallback)
          </p>
          <p>
            <strong>Monorepo:</strong> pnpm workspaces with shared-core and oss-calculator packages
          </p>
          <p>
            <strong>Repository:</strong> github.com/marimarinova/oss-vat-calculator
          </p>
        </div>
      </div>
    </div>
  );
};
