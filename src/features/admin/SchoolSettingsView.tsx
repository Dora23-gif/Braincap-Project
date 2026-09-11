import React, { useState, useRef } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import {
  DEFAULT_PRINCIPAL_SIGNATURE,
  DEFAULT_WATERMARK_SEAL
} from '../../data/initialEnterpriseData';
import {
  Settings,
  ShieldCheck,
  Upload,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  Building,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Eye,
  Award,
  Stamp,
  AlertTriangle
} from 'lucide-react';
import { FuturisticPageShell } from '../../components/common/FuturisticPageShell';
import { DoubleBezelCard } from '../../components/common/DoubleBezelCard';
import { ModalPortal } from '../../components/common/ModalPortal';

export const SchoolSettingsView: React.FC = () => {
  const { schoolSettings, updateSchoolSettings, resetToDefaultData } = useSchoolData();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [principalName, setPrincipalName] = useState(schoolSettings.principalName);
  const [principalTitle, setPrincipalTitle] = useState(schoolSettings.principalTitle);
  const [signatureUrl, setSignatureUrl] = useState(schoolSettings.principalSignatureUrl);
  const [watermarkUrl, setWatermarkUrl] = useState(schoolSettings.watermarkSealUrl);
  const [showWatermarkInPrint, setShowWatermarkInPrint] = useState(schoolSettings.showWatermarkInPrint);
  const [showWatermarkInPreview, setShowWatermarkInPreview] = useState(schoolSettings.showWatermarkInPreview);
  const [autoSignReportCards, setAutoSignReportCards] = useState(schoolSettings.autoSignReportCards);

  const [schoolMotto, setSchoolMotto] = useState(schoolSettings.schoolMotto);
  const [schoolAddress, setSchoolAddress] = useState(schoolSettings.schoolAddress);
  const [schoolPhone, setSchoolPhone] = useState(schoolSettings.schoolPhone);
  const [schoolEmail, setSchoolEmail] = useState(schoolSettings.schoolEmail);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const signatureFileInputRef = useRef<HTMLInputElement>(null);
  const watermarkFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSignatureUrl(reader.result);
        showToast('Signature asset loaded into preview!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setWatermarkUrl(reader.result);
        showToast('Watermark seal asset loaded into preview!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRestoreDefaultSignature = () => {
    setSignatureUrl(DEFAULT_PRINCIPAL_SIGNATURE);
    showToast('Restored official Principal digital signature preset.');
  };

  const handleRestoreDefaultWatermark = () => {
    setWatermarkUrl(DEFAULT_WATERMARK_SEAL);
    showToast('Restored official high-security watermark seal preset.');
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    updateSchoolSettings(
      {
        principalName,
        principalTitle,
        principalSignatureUrl: signatureUrl,
        watermarkSealUrl: watermarkUrl,
        showWatermarkInPrint,
        showWatermarkInPreview,
        autoSignReportCards,
        schoolMotto,
        schoolAddress,
        schoolPhone,
        schoolEmail
      },
      { id: 'stf-001', name: 'Dr. Kenneth Balogun', role: 'SUPER_ADMIN' }
    );

    showToast('Institutional security and signature parameters saved successfully!');
  };

  return (
    <FuturisticPageShell
      title="INSTITUTIONAL SETTINGS & SECURITY"
      subtitle="Super Administrator & Principal governance console. Configure cryptographic watermark seals, principal digital signatures, and transcript security."
      icon={Stamp}
      badgeText="Anti-Counterfeit Active"
      badgeVariant="cyber"
      actions={
        <button
          onClick={handleSaveAll}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer touch-target active:scale-95"
        >
          <FileCheck className="w-4 h-4" />
          <span>Save Institutional Settings</span>
        </button>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700/80 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      <form onSubmit={handleSaveAll} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column Left: Signatures & Watermarks (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Principal Signature Card */}
            <DoubleBezelCard innerClassName="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-sm">
                    Principal Digital Signature Endorsement
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Vector Endorsement Active
                </span>
              </div>

              {/* Signature Preview Canvas */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-2">
                  Live Signature Preview
                </span>
                {/* Official White Document Paper Pad - 100% visible in both light & dark themes */}
                <div className="h-28 max-w-sm mx-auto bg-white dark:bg-white rounded-xl border-2 border-slate-200 dark:border-slate-600 p-3 flex items-center justify-center shadow-xs">
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Principal Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 italic">No signature uploaded</span>
                  )}
                </div>
                <div className="mt-2.5 text-xs font-serif-title font-bold text-slate-900 dark:text-white">
                  {principalName}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{principalTitle}</div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Principal Full Name</label>
                  <input
                    type="text"
                    required
                    value={principalName}
                    onChange={e => setPrincipalName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Official Title</label>
                  <input
                    type="text"
                    required
                    value={principalTitle}
                    onChange={e => setPrincipalTitle(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="file"
                  ref={signatureFileInputRef}
                  accept="image/png,image/svg+xml,image/jpeg"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => signatureFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Upload Signature Asset (SVG/PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreDefaultSignature}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Official Default</span>
                </button>
              </div>
            </DoubleBezelCard>

            {/* 2. Official Watermark & Security Seal */}
            <DoubleBezelCard innerClassName="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-sm">
                    Embossed Watermark &amp; Security Crest
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                  Anti-Counterfeit Protection
                </span>
              </div>

              {/* Watermark Preview */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center relative">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-2">
                  Embossed Seal Asset
                </span>
                <div className="w-32 h-32 mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 p-2 flex items-center justify-center shadow-2xs">
                  {watermarkUrl ? (
                    <img
                      src={watermarkUrl}
                      alt="Watermark Crest"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">No watermark loaded</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={watermarkFileInputRef}
                  accept="image/png,image/svg+xml,image/jpeg"
                  onChange={handleWatermarkUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => watermarkFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Upload Crest Asset</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreDefaultWatermark}
                  className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Official Seal</span>
                </button>
              </div>

              {/* Security Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Render Watermark in Printed Dossiers</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Applies 6% opacity gold heraldic seal on physical printouts &amp; PDFs</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showWatermarkInPrint}
                    onChange={e => setShowWatermarkInPrint(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Render Watermark in Screen Preview</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Displays subtle crest behind on-screen report card preview</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showWatermarkInPreview}
                    onChange={e => setShowWatermarkInPreview(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Auto-Sign Terminal Dossiers</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Automatically affix Principal signature upon published report card rendering</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSignReportCards}
                    onChange={e => setAutoSignReportCards(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </DoubleBezelCard>
          </div>

          {/* Column Right: School Info & Live Interactive Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* School Identity Card */}
            <DoubleBezelCard innerClassName="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Building className="w-4 h-4 text-indigo-600" />
                <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-sm">
                  Institutional Identity &amp; Contact
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Official Motto</label>
                  <input
                    type="text"
                    value={schoolMotto}
                    onChange={e => setSchoolMotto(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Campus Address</label>
                  <textarea
                    rows={2}
                    value={schoolAddress}
                    onChange={e => setSchoolAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Official Telephone</label>
                  <input
                    type="text"
                    value={schoolPhone}
                    onChange={e => setSchoolPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Admissions / Registry Email</label>
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={e => setSchoolEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </DoubleBezelCard>

            {/* Live Mini Dossier Preview Card */}
            <DoubleBezelCard innerClassName="p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Dossier Real-Time Composite Preview</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono-tabular">Scale 75%</span>
              </div>

              {/* Mock Report Card Sheet */}
              <div className="p-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl shadow-xs relative overflow-hidden select-none">
                {/* Background Watermark */}
                {showWatermarkInPreview && watermarkUrl && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08] dark:opacity-[0.15]">
                    <img src={watermarkUrl} alt="" className="w-40 h-40 object-contain" />
                  </div>
                )}

                <div className="relative z-10 space-y-2 text-[10px]">
                  <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span className="font-serif-title font-bold text-slate-900 dark:text-white text-xs block">
                      EVEREST INTERNATIONAL SCHOOLS
                    </span>
                    <span className="text-[9px] text-amber-800 dark:text-amber-400 font-semibold">{schoolMotto}</span>
                  </div>

                  <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 flex justify-between font-mono-tabular text-[9px]">
                    <span className="text-slate-700 dark:text-slate-300">Name: ADEBAYO, Oluwaseun</span>
                    <span className="text-slate-700 dark:text-slate-300">Class: SSS 2 Gold</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Avg: 78.4%</span>
                  </div>

                  {/* Remarks & Signature */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-end justify-between">
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase block">Resumption:</span>
                      <span className="font-bold text-[9px] text-slate-800 dark:text-slate-200">Sept 15, 2026</span>
                    </div>

                    <div className="text-right">
                      {autoSignReportCards && signatureUrl && (
                        <div className="h-7 flex justify-end bg-white/95 dark:bg-white rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700">
                          <img src={signatureUrl} alt="" className="max-h-full object-contain" />
                        </div>
                      )}
                      <div className="font-serif-title font-bold text-slate-900 dark:text-white text-[9px]">
                        {principalName}
                      </div>
                      <div className="text-[8px] text-slate-500 uppercase">{principalTitle}</div>
                    </div>
                  </div>
                </div>
              </div>
            </DoubleBezelCard>
          </div>
        </div>
      </form>

      {/* Database & Factory Seed Maintenance Section */}
      <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
        <DoubleBezelCard hoverEffect>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif-title font-bold text-slate-900 dark:text-white text-sm">
                  Database & Factory Seed Maintenance
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mt-0.5">
                  Restore the initial benchmark demo database (60 students across 12 class arms, 20 faculty members, 20 parent accounts, examination halls, and default grades).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-2xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Factory Dataset</span>
            </button>
          </div>
        </DoubleBezelCard>
      </div>

      {/* High-Security Confirmation Modal using ModalPortal */}
      {isResetModalOpen && (
        <ModalPortal>
          <div className="bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif-title font-bold text-slate-900 dark:text-white text-base">
                  Confirm Factory Dataset Reset
                </h3>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  Destructive Action • Irreversible
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action will completely wipe all custom-added students, classes, attendance logs, and modified marks, reverting the school database to the factory initial seed (100 benchmark records).
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDefaultData();
                  setIsResetModalOpen(false);
                  showToast('Factory database reset successfully!');
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Factory Reset</span>
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </FuturisticPageShell>
  );
};
