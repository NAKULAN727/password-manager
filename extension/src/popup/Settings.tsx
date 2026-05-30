import React, { useEffect, useState } from 'react';
import { ArrowLeft, Shield, Clock, Globe, Trash2, X } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

interface Settings {
  autoLockTimeout: number;
  clipboardClearTimeout: number;
  autofillMode: 'fill-only' | 'fill-and-submit';
  showAutofillBadge: boolean;
}

export function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ignoredDomains, setIgnoredDomains] = useState<string[]>([]);
  const [showDomains, setShowDomains] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (res?.success) setSettings(res.data);
    });
    chrome.runtime.sendMessage({ type: 'GET_IGNORED_DOMAINS' }, (res) => {
      if (res?.success) setIgnoredDomains(res.data);
    });
  }, []);

  const updateSetting = (key: keyof Settings, value: any) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: { settings: { [key]: value } } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const removeDomain = (domain: string) => {
    chrome.runtime.sendMessage({ type: 'REMOVE_IGNORED_DOMAIN', payload: { domain } }, () => {
      setIgnoredDomains(prev => prev.filter(d => d !== domain));
    });
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xs text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2A1E10]">
        <button onClick={onBack} className="text-[#9A7D5A] hover:text-[#F0E6D0] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-bold text-[#F0E6D0]">Settings</h2>
        {saved && <span className="ml-auto text-[10px] text-[#5EAA7A] font-semibold animate-fade-in">Saved</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Security Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={12} className="text-[#E8A020]" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9A7D5A]">Security</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-[#F0E6D0] font-medium block mb-1.5">Auto-Lock Timeout</label>
              <select
                value={settings.autoLockTimeout}
                onChange={(e) => updateSetting('autoLockTimeout', Number(e.target.value))}
                className="w-full rounded-lg border border-[#2A1E10] bg-[#1E160D] px-3 py-2 text-xs text-[#F0E6D0] focus:outline-none focus:border-[#E8A020]/30"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={0}>Never</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#F0E6D0] font-medium block mb-1.5">Clipboard Clear</label>
              <select
                value={settings.clipboardClearTimeout}
                onChange={(e) => updateSetting('clipboardClearTimeout', Number(e.target.value))}
                className="w-full rounded-lg border border-[#2A1E10] bg-[#1E160D] px-3 py-2 text-xs text-[#F0E6D0] focus:outline-none focus:border-[#E8A020]/30"
              >
                <option value={10}>10 seconds</option>
                <option value={20}>20 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </div>
          </div>
        </section>

        {/* Autofill Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={12} className="text-[#E8A020]" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9A7D5A]">Autofill</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-[#F0E6D0] font-medium block mb-1.5">Autofill Mode</label>
              <select
                value={settings.autofillMode}
                onChange={(e) => updateSetting('autofillMode', e.target.value)}
                className="w-full rounded-lg border border-[#2A1E10] bg-[#1E160D] px-3 py-2 text-xs text-[#F0E6D0] focus:outline-none focus:border-[#E8A020]/30"
              >
                <option value="fill-only">Autofill Only</option>
                <option value="fill-and-submit">Autofill + Submit</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[11px] text-[#F0E6D0] font-medium">Show Autofill Badge</label>
              <button
                onClick={() => updateSetting('showAutofillBadge', !settings.showAutofillBadge)}
                className={`w-9 h-5 rounded-full transition-all duration-200 ${settings.showAutofillBadge ? 'bg-[#E8A020]' : 'bg-[#2A1E10]'}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-[#0A0806] transition-transform duration-200 ml-0.5 ${settings.showAutofillBadge ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Ignored Domains Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe size={12} className="text-[#E8A020]" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9A7D5A]">Ignored Domains</h3>
            </div>
            <button
              onClick={() => setShowDomains(!showDomains)}
              className="text-[10px] text-[#E8A020] font-semibold"
            >
              {showDomains ? 'Hide' : `Show (${ignoredDomains.length})`}
            </button>
          </div>

          {showDomains && (
            <div className="space-y-1.5">
              {ignoredDomains.length === 0 ? (
                <p className="text-[10px] text-[#9A7D5A] text-center py-3">No ignored domains</p>
              ) : (
                ignoredDomains.map((domain) => (
                  <div key={domain} className="flex items-center justify-between rounded-lg border border-[#2A1E10] bg-[#1E160D] px-3 py-2">
                    <span className="text-[11px] text-[#F0E6D0] font-mono">{domain}</span>
                    <button onClick={() => removeDomain(domain)} className="text-[#CC4A3A] hover:text-[#F0E6D0] transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
