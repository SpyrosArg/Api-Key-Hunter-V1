import { useState } from 'react';
import { AlertTriangle, FileWarning, Code2, RefreshCw, Lock, Hexagon as Dragon, Globe } from 'lucide-react';

interface ScanResult {
  api_keys: Array<{
    file: string;
    service: string;
    line: number | null;
    issue: string;
    recommendation: string;
  }>;
  sensitive_files: Array<{
    file: string;
    line: number | null;
    issue: string;
    recommendation: string;
  }>;
  code_issues: Array<{
    file: string;
    line: number | null;
    issue: string;
    pattern: string;
    recommendation: string;
  }>;
  summary: {
    total_files_scanned: number;
    total_issues: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    scanned_directory?: string;
    scanned_url?: string;
    scan_started_at?: string;
    scan_completed_at?: string;
  };
}

function App() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [directory, setDirectory] = useState<string>('/home/project');
  const [url, setUrl] = useState<string>('');
  const [scanType, setScanType] = useState<'directory' | 'url'>('directory');

  const handleScan = async () => {
    if (scanType === 'directory' && !directory.trim()) {
      setError('Please provide a valid directory path');
      return;
    }

    if (scanType === 'url' && !url.trim()) {
      setError('Please provide a valid URL');
      return;
    }

    setScanning(true);
    setError(null);
    setResults(null);

    try {
      const endpoint = scanType === 'url' ? '/api/scan/url' : '/api/scan';
      const body = scanType === 'url' ? { url: url.trim() } : { directory: directory.trim() };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to perform security scan');
      }
      
      setResults(data);
    } catch (error) {
      console.error('Scan failed:', error);
      setError(error instanceof Error 
        ? error.message 
        : 'Failed to connect to scan service. Please ensure the server is running.');
    } finally {
      setScanning(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-emerald-900/30 text-emerald-400 ring-1 ring-emerald-500/20';
      case 'MEDIUM':
        return 'bg-amber-900/30 text-amber-400 ring-1 ring-amber-500/20';
      case 'HIGH':
        return 'bg-rose-900/30 text-rose-400 ring-1 ring-rose-500/20';
      default:
        return 'bg-slate-800/30 text-slate-300 ring-1 ring-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className="relative inline-flex mb-4 sm:mb-6">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full"></div>
            <div className="relative bg-black/50 backdrop-blur-sm p-3 sm:p-4 rounded-full ring-1 ring-[#2a3347]/50">
              <Dragon className="w-12 h-12 sm:w-16 sm:h-16 text-orange-500" />
            </div>
          </div>
          <h1 className="font-title text-3xl sm:text-4xl md:text-5xl font-light text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-400 mb-3 sm:mb-4 tracking-wide">
            API Key Hunter
          </h1>
          <p className="text-base sm:text-lg text-[#94a3b8] max-w-2xl mx-auto px-4">
            Protect your AI applications by scanning for exposed API keys and security misconfigurations
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-8">
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-xl border border-[#2a3347]/50">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setScanType('directory')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  scanType === 'directory'
                    ? 'bg-orange-500 text-white'
                    : 'bg-black/30 text-slate-400 hover:bg-black/50'
                }`}
              >
                Directory Scan
              </button>
              <button
                onClick={() => setScanType('url')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  scanType === 'url'
                    ? 'bg-orange-500 text-white'
                    : 'bg-black/30 text-slate-400 hover:bg-black/50'
                }`}
              >
                URL Scan
              </button>
            </div>

            {scanType === 'directory' ? (
              <>
                <label htmlFor="directory" className="block text-sm font-medium text-slate-300 mb-2">
                  Project Directory to Scan
                </label>
                <input
                  type="text"
                  id="directory"
                  value={directory}
                  onChange={(e) => setDirectory(e.target.value)}
                  placeholder="Enter path to project directory (e.g., /path/to/project)"
                  className="w-full bg-black/50 border border-[#2a3347]/50 rounded-lg px-4 py-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 mb-4"
                />
              </>
            ) : (
              <>
                <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">
                  URL to Scan
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to scan (e.g., https://example.com)"
                  className="w-full bg-black/50 border border-[#2a3347]/50 rounded-lg px-4 py-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 mb-4"
                />
              </>
            )}

            <button
              onClick={handleScan}
              disabled={scanning}
              className={`w-full inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium rounded-xl shadow-lg ${
                scanning 
                  ? 'bg-orange-500/30 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-500 hover:shadow-orange-500/20 hover:scale-105 transition-all duration-200'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-black`}
            >
              {scanning ? (
                <>
                  <RefreshCw className="animate-spin -ml-1 mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                  Scanning...
                </>
              ) : (
                <>
                  {scanType === 'url' ? (
                    <Globe className="mr-2 h-5 w-5" />
                  ) : (
                    <Lock className="mr-2 h-5 w-5" />
                  )}
                  Start Security Scan
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-rose-900/20 backdrop-blur-sm rounded-xl border border-rose-500/20 hover:bg-rose-900/30 hover:border-rose-500/30 hover:scale-[1.02] transition-all duration-200">
            <p className="flex items-center text-base sm:text-lg text-rose-300">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-rose-400" />
              {error}
            </p>
          </div>
        )}

        {results && (
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-black/50 backdrop-blur-sm shadow-xl rounded-2xl p-6 sm:p-8 border border-[#2a3347]/50 hover:bg-black/70 hover:border-orange-500/30 hover:scale-[1.02] transition-all duration-200">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-slate-100">Scan Summary</h2>
              <p className="text-sm text-slate-400 mb-4">
                {results.summary.scanned_directory ? (
                  <>Directory: <code className="bg-black/30 px-2 py-1 rounded">{results.summary.scanned_directory}</code></>
                ) : (
                  <>URL: <code className="bg-black/30 px-2 py-1 rounded">{results.summary.scanned_url}</code></>
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-4 sm:p-6 bg-black/30 rounded-xl border border-[#2a3347]/50 backdrop-blur-sm hover:bg-black/50 hover:border-orange-500/30 hover:scale-[1.05] transition-all duration-200">
                  <p className="text-sm font-medium text-[#94a3b8]">Files Scanned</p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-500 mt-2">
                    {results.summary.total_files_scanned}
                  </p>
                </div>
                <div className="p-4 sm:p-6 bg-black/30 rounded-xl border border-[#2a3347]/50 backdrop-blur-sm hover:bg-black/50 hover:border-orange-500/30 hover:scale-[1.05] transition-all duration-200">
                  <p className="text-sm font-medium text-[#94a3b8]">Issues Found</p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-500 mt-2">{results.summary.total_issues}</p>
                </div>
                <div className="p-4 sm:p-6 bg-black/30 rounded-xl border border-[#2a3347]/50 backdrop-blur-sm hover:bg-black/50 hover:border-orange-500/30 hover:scale-[1.05] transition-all duration-200">
                  <p className="text-sm font-medium text-[#94a3b8]">Risk Level</p>
                  <span
                    className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium mt-2 ${getRiskColor(
                      results.summary.risk_level
                    )}`}
                  >
                    {results.summary.risk_level}
                  </span>
                </div>
              </div>
              {results.summary.scan_started_at && (
                <p className="text-xs text-slate-500 mt-4">
                  Scan duration: {results.summary.scan_completed_at && 
                    new Date(results.summary.scan_completed_at).getTime() - new Date(results.summary.scan_started_at).getTime()
                  }ms
                </p>
              )}
            </div>

            {results.api_keys.length > 0 && (
              <div className="bg-black/50 backdrop-blur-sm shadow-xl rounded-2xl p-6 sm:p-8 border border-[#2a3347]/50 hover:bg-black/70 hover:border-orange-500/30 hover:scale-[1.02] transition-all duration-200">
                <div className="flex items-center mb-4 sm:mb-6">
                  <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-slate-400 mr-2 sm:mr-3" />
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">API Key Issues</h2>
                </div>
                <div className="space-y-4">
                  {results.api_keys.map((issue, index) => (
                    <div
                      key={index}
                      className="border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl hover:bg-slate-900/70 hover:border-slate-600/50 hover:scale-[1.02] transition-all duration-200"
                    >
                      <h3 className="font-semibold text-slate-200 text-base sm:text-lg mb-2">{issue.service}</h3>
                      <p className="text-xs sm:text-sm text-[#94a3b8] mb-1">
                        File: <code className="bg-black/30 px-2 py-0.5 rounded">{issue.file}</code>
                      </p>
                      {issue.line && (
                        <p className="text-xs sm:text-sm text-[#94a3b8] mb-3">
                          Line: <code className="bg-black/30 px-2 py-0.5 rounded">{issue.line}</code>
                        </p>
                      )}
                      <p className="text-sm sm:text-base text-slate-300 mb-2">{issue.issue}</p>
                      <p className="text-xs sm:text-sm text-[#94a3b8]">
                        {issue.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.sensitive_files.length > 0 && (
              <div className="bg-black/50 backdrop-blur-sm shadow-xl rounded-2xl p-6 sm:p-8 border border-[#2a3347]/50 hover:bg-black/70 hover:border-orange-500/30 hover:scale-[1.02] transition-all duration-200">
                <div className="flex items-center mb-4 sm:mb-6">
                  <FileWarning className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400 mr-2 sm:mr-3" />
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">Sensitive Files</h2>
                </div>
                <div className="space-y-4">
                  {results.sensitive_files.map((issue, index) => (
                    <div
                      key={index}
                      className="border border-amber-500/20 bg-amber-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl hover:bg-amber-900/30 hover:border-amber-500/30 hover:scale-[1.05] transition-all duration-200"
                    >
                      <p className="text-xs sm:text-sm text-[#94a3b8] mb-1">
                        File: <code className="bg-black/30 px-2 py-0.5 rounded">{issue.file}</code>
                      </p>
                      {issue.line && (
                        <p className="text-xs sm:text-sm text-[#94a3b8] mb-3">
                          Line: <code className="bg-black/30 px-2 py-0.5 rounded">{issue.line}</code>
                        </p>
                      )}
                      <p className="text-sm sm:text-base text-slate-300 mb-2">{issue.issue}</p>
                      <p className="text-xs sm:text-sm text-[#94a3b8]">
                        {issue.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.code_issues.length > 0 && (
              <div className="bg-black/50 backdrop-blur-sm shadow-xl rounded-2xl p-6 sm:p-8 border border-[#2a3347]/50 hover:bg-black/70 hover:border-orange-500/30 hover:scale-[1.02] transition-all duration-200">
                <div className="flex items-center mb-4 sm:mb-6">
                  <Code2 className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500 mr-2 sm:mr- 3" />
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">Code Issues</h2>
                </div>
                <div className="space-y-4">
                  {results.code_issues.map((issue, index) => (
                    <div
                      key={index}
                      className="border border-orange-500/20 bg-black/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl hover:bg-black/70 hover:border-orange-500/30 hover:scale-[1.05] transition-all duration-200"
                    >
                      <p className="text-xs sm:text-sm text-[#94a3b8] mb-1">
                        File: <code className="bg-black/30 px-2 py-0.5 rounded">{issue.file}</code>
                      </p>
                      {issue.line && (
                        <p className="text-xs sm:text-sm text-[#94a3b8] mb-3">
                          Line: <code className="bg-black/30 px-2 py-0.5 rounded">{issue.line}</code>
                        </p>
                      )}
                      <p className="text-sm sm:text-base text-slate-300 mb-2">{issue.issue}</p>
                      <p className="text-xs sm:text-sm text-[#94a3b8] mb-2">Pattern: {issue.pattern}</p>
                      <p className="text-xs sm:text-sm text-[#94a3b8]">
                        {issue.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.summary.total_issues === 0 && (
              <div className="bg-black/50 backdrop-blur-sm shadow-xl rounded-2xl p-6 sm:p-8 border border-[#2a3347]/50 text-center hover:bg-black/70 hover:border-orange-500/30 hover:scale-[1.02] transition-all duration-200">
                <Dragon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-emerald-400 mb-4 sm:mb-6" />
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2 sm:mb-3">All Clear!</h2>
                <p className="text-base sm:text-lg text-[#94a3b8]">
                  No security issues were found in your project.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;