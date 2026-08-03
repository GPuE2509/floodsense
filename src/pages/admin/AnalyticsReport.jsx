import React, { useState, useEffect } from 'react';
import {
  FileDown, Calendar, Globe, BarChart2, Waves, Shield,
  CheckCircle, Loader, AlertCircle, ChevronDown, RefreshCw,
  FileText, Activity, Users, Droplets, FileSpreadsheet, Filter, Database
} from 'lucide-react';
import { apiService } from '../../services/apiService';

// VITE_API_URL is the server root (e.g. http://localhost:5000), append /api to match backend routes
const _serverRoot = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_URL = _serverRoot.endsWith('/api') ? _serverRoot : `${_serverRoot}/api`;

/* ──────────────────────────────────────
   PRESET RANGES
   ────────────────────────────────────── */
const PRESETS = [
  { id: '7d',  labelVi: '7 ngày gần đây',   labelEn: 'Last 7 days',    days: 7  },
  { id: '30d', labelVi: '30 ngày gần đây',  labelEn: 'Last 30 days',   days: 30 },
  { id: '3m',  labelVi: '3 tháng gần đây',  labelEn: 'Last 3 months',  days: 90 },
  { id: '6m',  labelVi: '6 tháng gần đây',  labelEn: 'Last 6 months',  days: 180},
  { id: 'custom', labelVi: 'Tùy chỉnh', labelEn: 'Custom range', days: null },
];

const SECTIONS_CONFIG = [
  {
    id: 'overview',
    labelVi: 'Tổng quan hệ thống',
    labelEn: 'System Overview',
    descVi: 'Số liệu users, tăng trưởng, phân bổ vai trò & khu vực',
    descEn: 'User stats, growth, role & district distribution',
    icon: Users,
    color: 'var(--cyan-400)',
    bg: 'rgba(69,179,192,0.08)',
  },
  {
    id: 'flood_history',
    labelVi: 'Lịch sử lũ lụt & Báo cáo sự cố',
    labelEn: 'Flood History & Incident Reports',
    descVi: 'Phân loại, kiểm duyệt, mực nước IoT, mức độ nghiêm trọng',
    descEn: 'Report types, moderation, IoT water levels, severity',
    icon: Droplets,
    color: 'var(--orange-400)',
    bg: 'rgba(225,136,60,0.08)',
  },
  {
    id: 'rescue_distribution',
    labelVi: 'Phân phối hoàn thành cứu hộ',
    labelEn: 'Rescue Fulfillment Distribution',
    descVi: 'Tỉ lệ hoàn thành, loại khẩn cấp, workshop xử lý nhiều nhất',
    descEn: 'Completion rate, emergency types, top workshops',
    icon: Shield,
    color: 'var(--green-400)',
    bg: 'rgba(62,169,123,0.08)',
  },
];

const EXCEL_STREAMS_CONFIG = [
  {
    id: 'sensory',
    labelVi: 'Dữ liệu Cảm biến IoT đo mực nước thô',
    labelEn: 'Sensory Telemetry Logs (IoT Water Level Data)',
    descVi: 'Mã trạm, khu vực, mực nước (mm), trạng thái pin & tín hiệu online',
    descEn: 'Station code, district, water level (mm), battery & online status',
    icon: Waves,
    color: 'var(--cyan-400)',
    bg: 'rgba(69,179,192,0.08)',
  },
  {
    id: 'incidents',
    labelVi: 'Luồng Sự kiện Báo cáo sự cố từ cộng đồng',
    labelEn: 'Incident Event Streams (Community Reports)',
    descVi: 'Mức độ lũ lụt/cây đổ, tọa độ, điểm tin cậy AI %, số lượt vote',
    descEn: 'Severity, coordinates, AI confidence score %, community votes',
    icon: Droplets,
    color: 'var(--orange-400)',
    bg: 'rgba(225,136,60,0.08)',
  },
  {
    id: 'rescues',
    labelVi: 'Nhật ký Phiên Cứu hộ & Giao dịch tài chính',
    labelEn: 'Rescue Execution Logs (SOS Sessions & Financials)',
    descVi: 'Tình nguyện viên/Workshop xử lý, kiểm tra an toàn, giá dịch vụ (VND)',
    descEn: 'Assigned volunteer/staff, safe check-in status, base price (VND)',
    icon: Shield,
    color: 'var(--green-400)',
    bg: 'rgba(62,169,123,0.08)',
  },
  {
    id: 'system_logs',
    labelVi: 'Nhật ký Thao tác Quản trị & An ninh hệ thống',
    labelEn: 'Security & System Audit Logs',
    descVi: 'Thao tác Admin/Manager, khóa tài khoản, duyệt bài, IP, mức độ nghiêm trọng',
    descEn: 'Admin/Manager operations, account suspension, IP address, severity level',
    icon: Activity,
    color: 'var(--red-400)',
    bg: 'rgba(207,52,64,0.08)',
  },
];

/* ──────────────────────────────────────
   HELPER
   ────────────────────────────────────── */
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}
function subtractDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

/* ──────────────────────────────────────
   SECTION / STREAM TOGGLE CARD
   ────────────────────────────────────── */
function SelectionCard({ cfg, selected, onToggle, lang }) {
  const Icon = cfg.icon;
  const isVI = lang === 'vi';
  const label = isVI ? cfg.labelVi : cfg.labelEn;
  const desc  = isVI ? cfg.descVi  : cfg.descEn;

  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 16px',
        background: selected ? cfg.bg : 'rgba(255,255,255,0.02)',
        border: `1.5px solid ${selected ? cfg.color : 'var(--border-dim)'}`,
        borderRadius: 'var(--r-md)',
        cursor: 'pointer', transition: 'all 0.18s',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 20, height: 20, borderRadius: 6,
        border: `2px solid ${selected ? cfg.color : 'var(--border-dim)'}`,
        background: selected ? cfg.color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2, transition: 'all 0.15s',
      }}>
        {selected && <CheckCircle size={13} color="#0D1F2D" strokeWidth={3} />}
      </div>

      {/* Icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: selected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: cfg.color,
      }}>
        <Icon size={18} />
      </div>

      {/* Texts */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: selected ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   MAIN PAGE: COMBINED EXPORT CENTER
   ────────────────────────────────────── */
export default function AnalyticsReport() {
  const today = new Date();

  // exportMode: 'pdf' | 'excel'
  const [exportMode, setExportMode] = useState('pdf');

  // Shared Date Range
  const [preset, setPreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState(toISODate(subtractDays(today, 30)));
  const [dateTo,   setDateTo]   = useState(toISODate(today));

  // PDF specific state
  const [pdfLang, setPdfLang] = useState('vi');
  const [selectedSections, setSelectedSections] = useState(['overview', 'flood_history', 'rescue_distribution']);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Excel specific state
  const [excelStreams, setExcelStreams] = useState(['sensory', 'incidents', 'rescues', 'system_logs']);
  const [excelLang, setExcelLang] = useState('vi');
  const [logLevel, setLogLevel] = useState('ALL');
  const [excelExporting, setExcelExporting] = useState(false);
  const [excelError, setExcelError] = useState(null);
  const [excelSuccess, setExcelSuccess] = useState(false);

  /* Update date range on preset change */
  useEffect(() => {
    const p = PRESETS.find(p => p.id === preset);
    if (p && p.days) {
      setDateFrom(toISODate(subtractDays(today, p.days)));
      setDateTo(toISODate(today));
    }
  }, [preset]);

  const toggleSection = (id) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleExcelStream = (id) => {
    setExcelStreams(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleExportPdf = async () => {
    if (selectedSections.length === 0) {
      setPdfError('Vui lòng chọn ít nhất một phần nội dung.');
      return;
    }
    setPdfExporting(true);
    setPdfError(null);
    setPdfSuccess(false);

    try {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        sections: selectedSections.join(','),
        lang: pdfLang,
      });

      const blob = await apiService.getBlob(`/admin/reports/export-pdf?${params}`);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sftr-analytics-report-${dateStr}-${pdfLang}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err) {
      console.error('[AnalyticsReport] PDF Export failed:', err);
      setPdfError(err.message || 'Xuất PDF thất bại. Thử lại sau.');
    } finally {
      setPdfExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (excelStreams.length === 0) {
      setExcelError('Vui lòng chọn ít nhất một luồng dữ liệu (Data Stream).');
      return;
    }
    setExcelExporting(true);
    setExcelError(null);
    setExcelSuccess(false);

    try {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        streams: excelStreams.join(','),
        logLevel,
        lang: excelLang,
      });

      const blob = await apiService.getBlob(`/admin/reports/export-excel?${params}`);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sftr-raw-system-logs-${dateStr}-${excelLang}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExcelSuccess(true);
      setTimeout(() => setExcelSuccess(false), 4000);
    } catch (err) {
      console.error('[AnalyticsReport] Excel Export failed:', err);
      setExcelError(err.message || 'Xuất Excel thất bại. Thử lại sau.');
    } finally {
      setExcelExporting(false);
    }
  };

  // UI always English
  const isVI = false;

  return (
    <div className="page-enter" style={{ maxWidth: 880, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-4">
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(69,179,192,0.2), rgba(61,125,176,0.15))',
            border: '1px solid rgba(69,179,192,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {exportMode === 'pdf' ? <FileDown size={24} color="var(--cyan-400)" /> : <FileSpreadsheet size={24} color="var(--green-400)" />}
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', marginBottom: 3 }}>
              {isVI ? 'Trung Tâm Xuất Dữ Liệu & Báo Cáo' : 'Data & Report Export Center'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {isVI
                ? 'Xuất báo cáo PDF vĩ mô in ấn hoặc tải chuỗi dữ liệu thô XLSX cho phân tích BI chuyên sâu.'
                : 'Export macro printable PDF analytics or download granular raw XLSX telemetry streams for deep BI analysis.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Top Mode Switcher Tabs ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 26,
        background: 'rgba(13,31,45,0.6)', padding: 6, borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border-dim)',
      }}>
        <button
          onClick={() => setExportMode('pdf')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 18px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
            background: exportMode === 'pdf'
              ? 'linear-gradient(135deg, rgba(69,179,192,0.25), rgba(61,125,176,0.18))'
              : 'transparent',
            color: exportMode === 'pdf' ? 'var(--cyan-400)' : 'var(--text-secondary)',
            fontWeight: exportMode === 'pdf' ? 700 : 500,
            fontSize: '0.88rem', transition: 'all 0.18s', fontFamily: 'inherit',
            boxShadow: exportMode === 'pdf' ? '0 0 15px rgba(69,179,192,0.15)' : 'none',
          }}
        >
          <FileDown size={17} />
          {isVI ? '📄 Báo cáo Phân tích PDF' : '📄 PDF Analytics Report'}
        </button>

        <button
          onClick={() => setExportMode('excel')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 18px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
            background: exportMode === 'excel'
              ? 'linear-gradient(135deg, rgba(62,169,123,0.25), rgba(16,185,129,0.18))'
              : 'transparent',
            color: exportMode === 'excel' ? 'var(--green-400)' : 'var(--text-secondary)',
            fontWeight: exportMode === 'excel' ? 700 : 500,
            fontSize: '0.88rem', transition: 'all 0.18s', fontFamily: 'inherit',
            boxShadow: exportMode === 'excel' ? '0 0 15px rgba(62,169,123,0.15)' : 'none',
          }}
        >
          <FileSpreadsheet size={17} />
          {isVI ? '📊 Dữ liệu thô Excel (.XLSX)' : '📊 Raw System Logs (.XLSX)'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>

        {/* ─────────────────────────────────────────────────────────
            COMMON CARD: Khoảng thời gian (Date Range)
           ───────────────────────────────────────────────────────── */}
        <div className="card bracketed p-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Calendar size={15} color={exportMode === 'pdf' ? 'var(--cyan-400)' : 'var(--green-400)'} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {isVI ? 'Khoảng thời gian trích xuất' : 'Extraction Date Range'}
            </span>
          </div>

          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                id={`preset-${p.id}`}
                onClick={() => setPreset(p.id)}
                style={{
                  padding: '6px 14px',
                  background: preset === p.id
                    ? (exportMode === 'pdf' ? 'rgba(69,179,192,0.15)' : 'rgba(62,169,123,0.15)')
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${preset === p.id ? (exportMode === 'pdf' ? 'var(--cyan-400)' : 'var(--green-400)') : 'var(--border-dim)'}`,
                  borderRadius: 99,
                  color: preset === p.id ? (exportMode === 'pdf' ? 'var(--cyan-400)' : 'var(--green-400)') : 'var(--text-secondary)',
                  fontWeight: preset === p.id ? 700 : 500,
                  fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {isVI ? p.labelVi : p.labelEn}
              </button>
            ))}
          </div>

          {/* Custom date pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: isVI ? 'Từ ngày' : 'From date', val: dateFrom, setter: setDateFrom, id: 'date-from' },
              { label: isVI ? 'Đến ngày' : 'To date',  val: dateTo,   setter: setDateTo,   id: 'date-to'   },
            ].map(({ label, val, setter, id }) => (
              <div key={id}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                  {label}
                </div>
                <input
                  id={id}
                  type="date"
                  value={val}
                  max={toISODate(today)}
                  onChange={e => { setter(e.target.value); setPreset('custom'); }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: 'rgba(13,31,45,0.6)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--r-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                    colorScheme: 'dark',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────
            MODE 1: PDF ANALYTICS OPTIONS
           ───────────────────────────────────────────────────────── */}
        {exportMode === 'pdf' ? (
          <>
            {/* Card: Language */}
            <div className="card bracketed p-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Globe size={15} color="var(--cyan-400)" />
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {isVI ? 'Ngôn ngữ file PDF xuất ra' : 'PDF Export Document Language'}
                  </span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {isVI ? 'Chỉ ảnh hưởng đến nội dung trong file PDF — không thay đổi giao diện web' : 'Only affects the generated PDF document content — does not change web interface'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { code: 'vi', label: '🇻🇳  Tiếng Việt' },
                  { code: 'en', label: '🇺🇸  English' },
                ].map(opt => (
                  <button
                    key={opt.code}
                    id={`lang-btn-${opt.code}`}
                    onClick={() => setPdfLang(opt.code)}
                    style={{
                      flex: 1, padding: '10px 16px',
                      background: pdfLang === opt.code ? 'rgba(69,179,192,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${pdfLang === opt.code ? 'var(--cyan-400)' : 'var(--border-dim)'}`,
                      borderRadius: 'var(--r-md)',
                      color: pdfLang === opt.code ? 'var(--cyan-400)' : 'var(--text-secondary)',
                      fontWeight: pdfLang === opt.code ? 700 : 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer', transition: 'all 0.18s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card: PDF Sections */}
            <div className="card bracketed p-4">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={15} color="var(--cyan-400)" />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {isVI ? 'Nội dung báo cáo PDF' : 'PDF Report Sections'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setSelectedSections(SECTIONS_CONFIG.map(s => s.id))}
                    style={{ fontSize: '0.72rem', color: 'var(--cyan-400)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isVI ? 'Chọn tất cả' : 'Select all'}
                  </button>
                  <span style={{ color: 'var(--border-dim)' }}>·</span>
                  <button
                    onClick={() => setSelectedSections([])}
                    style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {isVI ? 'Bỏ chọn' : 'Clear'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {SECTIONS_CONFIG.map(cfg => (
                  <SelectionCard
                    key={cfg.id}
                    cfg={cfg}
                    selected={selectedSections.includes(cfg.id)}
                    onToggle={() => toggleSection(cfg.id)}
                    lang={isVI ? 'vi' : 'en'}
                  />
                ))}
              </div>
            </div>

            {/* Preview Summary */}
            <div style={{
              padding: '14px 18px',
              background: 'rgba(69,179,192,0.06)',
              border: '1px solid rgba(69,179,192,0.2)',
              borderRadius: 'var(--r-md)',
              fontSize: '0.8rem', color: 'var(--text-secondary)',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                {isVI ? '📄 Tóm tắt file PDF sẽ xuất:' : '📄 PDF file summary:'}
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <div>
                  {isVI ? '• Kỳ báo cáo:' : '• Period:'}{' '}
                  <span style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>{dateFrom} → {dateTo}</span>
                </div>
                <div>
                  {isVI ? '• Ngôn ngữ PDF:' : '• PDF Language:'}{' '}
                  <span style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>
                    {pdfLang === 'vi' ? 'Tiếng Việt 🇻🇳' : 'English 🇺🇸'}
                  </span>
                </div>
                <div>
                  {isVI ? '• Nội dung:' : '• Sections:'}{' '}
                  <span style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>
                    {selectedSections.length === 0
                      ? (isVI ? '(Chưa chọn)' : '(None selected)')
                      : selectedSections.map(id => {
                          const cfg = SECTIONS_CONFIG.find(c => c.id === id);
                          return isVI ? cfg?.labelVi : cfg?.labelEn;
                        }).join(' · ')}
                  </span>
                </div>
                <div>
                  {isVI ? '• Format:' : '• Format:'}{' '}
                  <span style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>
                    {`sftr-analytics-report-${toISODate(today)}-${pdfLang}.pdf`}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {pdfError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: 'rgba(207,52,64,0.08)', border: '1px solid rgba(207,52,64,0.3)',
                borderRadius: 'var(--r-md)', color: 'var(--red-400)', fontSize: '0.85rem',
              }}>
                <AlertCircle size={16} />
                {pdfError}
              </div>
            )}

            {pdfSuccess && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: 'rgba(62,169,123,0.08)', border: '1px solid rgba(62,169,123,0.3)',
                borderRadius: 'var(--r-md)', color: 'var(--green-400)', fontSize: '0.85rem',
              }}>
                <CheckCircle size={16} />
                {isVI ? 'Xuất PDF thành công! File đã được tải về máy.' : 'PDF exported successfully! File downloaded.'}
              </div>
            )}

            {/* Export Button */}
            <button
              id="btn-export-pdf"
              onClick={handleExportPdf}
              disabled={pdfExporting || selectedSections.length === 0}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '15px 28px',
                background: pdfExporting || selectedSections.length === 0
                  ? 'rgba(69,179,192,0.1)'
                  : 'linear-gradient(135deg, rgba(69,179,192,0.22), rgba(61,125,176,0.18))',
                border: `1.5px solid ${selectedSections.length === 0 ? 'var(--border-dim)' : 'var(--cyan-400)'}`,
                borderRadius: 'var(--r-md)',
                color: selectedSections.length === 0 ? 'var(--text-muted)' : 'var(--cyan-400)',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: pdfExporting || selectedSections.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                boxShadow: (!pdfExporting && selectedSections.length > 0) ? '0 0 20px rgba(69,179,192,0.18)' : 'none',
                width: '100%',
              }}
            >
              {pdfExporting
                ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {isVI ? 'Đang tạo báo cáo...' : 'Generating PDF report...'}</>
                : <><FileDown size={18} />
                    {isVI ? 'Xuất báo cáo PDF' : 'Export PDF Report'}</>
              }
            </button>
          </>
        ) : (
          /* ─────────────────────────────────────────────────────────
             MODE 2: EXCEL RAW SYSTEM LOGS OPTIONS
             ───────────────────────────────────────────────────────── */
          <>
            {/* Card: Excel Language */}
            <div className="card bracketed p-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Globe size={15} color="var(--green-400)" />
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {isVI ? 'Ngôn ngữ file Excel xuất ra' : 'Excel Export Document Language'}
                  </span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {isVI ? 'Chỉ ảnh hưởng đến nội dung trong file Excel — không thay đổi giao diện web' : 'Only affects the generated Excel workbook content — does not change web interface'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { code: 'vi', label: '🇻🇳  Tiếng Việt' },
                  { code: 'en', label: '🇺🇸  English' },
                ].map(opt => (
                  <button
                    key={opt.code}
                    id={`excel-lang-btn-${opt.code}`}
                    onClick={() => setExcelLang(opt.code)}
                    style={{
                      flex: 1, padding: '10px 16px',
                      background: excelLang === opt.code ? 'rgba(62,169,123,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${excelLang === opt.code ? 'var(--green-400)' : 'var(--border-dim)'}`,
                      borderRadius: 'var(--r-md)',
                      color: excelLang === opt.code ? 'var(--green-400)' : 'var(--text-secondary)',
                      fontWeight: excelLang === opt.code ? 700 : 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer', transition: 'all 0.18s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card: Excel Data Streams Checkboxes */}
            <div className="card bracketed p-4">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Database size={15} color="var(--green-400)" />
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {isVI ? 'Chọn luồng dữ liệu (Sheets trong Excel)' : 'Data Streams (Worksheet Selection)'}
                    </span>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {isVI ? 'Mỗi luồng dữ liệu sẽ được tạo thành 1 Worksheet riêng biệt trong file Excel' : 'Each selected data stream is rendered as an isolated worksheet within the workbook'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setExcelStreams(EXCEL_STREAMS_CONFIG.map(s => s.id))}
                    style={{ fontSize: '0.72rem', color: 'var(--green-400)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isVI ? 'Chọn tất cả' : 'Select all'}
                  </button>
                  <span style={{ color: 'var(--border-dim)' }}>·</span>
                  <button
                    onClick={() => setExcelStreams([])}
                    style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {isVI ? 'Bỏ chọn' : 'Clear'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {EXCEL_STREAMS_CONFIG.map(cfg => (
                  <SelectionCard
                    key={cfg.id}
                    cfg={cfg}
                    selected={excelStreams.includes(cfg.id)}
                    onToggle={() => toggleExcelStream(cfg.id)}
                    lang={isVI ? 'vi' : 'en'}
                  />
                ))}
              </div>
            </div>

            {/* Preview Summary */}
            <div style={{
              padding: '14px 18px',
              background: 'rgba(62,169,123,0.06)',
              border: '1px solid rgba(62,169,123,0.2)',
              borderRadius: 'var(--r-md)',
              fontSize: '0.8rem', color: 'var(--text-secondary)',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                {isVI ? '📊 Tóm tắt file Excel sẽ xuất:' : '📊 Excel Workbook Summary:'}
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <div>
                  {isVI ? '• Kỳ dữ liệu:' : '• Period:'}{' '}
                  <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>{dateFrom} → {dateTo}</span>
                </div>
                <div>
                  {isVI ? '• Worksheets được tạo:' : '• Worksheets Included:'}{' '}
                  <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>
                    {excelStreams.length === 0
                      ? (isVI ? '(Chưa chọn)' : '(None selected)')
                      : `[Audit_Summary] + ` + excelStreams.map(id => {
                          const cfg = EXCEL_STREAMS_CONFIG.find(c => c.id === id);
                          return isVI ? cfg?.labelVi : cfg?.labelEn;
                        }).join(' · ')}
                  </span>
                </div>
                <div>
                  {isVI ? '• Ngôn ngữ nội dung:' : '• Workbook Language:'}{' '}
                  <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>
                    {excelLang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
                  </span>
                </div>
                <div>
                  {isVI ? '• Format:' : '• Format:'}{' '}
                  <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>
                    {`sftr-raw-system-logs-${toISODate(today)}-${excelLang}.xlsx`}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {excelError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: 'rgba(207,52,64,0.08)', border: '1px solid rgba(207,52,64,0.3)',
                borderRadius: 'var(--r-md)', color: 'var(--red-400)', fontSize: '0.85rem',
              }}>
                <AlertCircle size={16} />
                {excelError}
              </div>
            )}

            {excelSuccess && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: 'rgba(62,169,123,0.08)', border: '1px solid rgba(62,169,123,0.3)',
                borderRadius: 'var(--r-md)', color: 'var(--green-400)', fontSize: '0.85rem',
              }}>
                <CheckCircle size={16} />
                {isVI ? 'Xuất dữ liệu thô Excel thành công! File đã tải xuống.' : 'Granular raw system logs exported successfully (.XLSX downloaded).'}
              </div>
            )}

            {/* Export Button */}
            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              disabled={excelExporting || excelStreams.length === 0}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '15px 28px',
                background: excelExporting || excelStreams.length === 0
                  ? 'rgba(62,169,123,0.1)'
                  : 'linear-gradient(135deg, rgba(62,169,123,0.25), rgba(16,185,129,0.18))',
                border: `1.5px solid ${excelStreams.length === 0 ? 'var(--border-dim)' : 'var(--green-400)'}`,
                borderRadius: 'var(--r-md)',
                color: excelStreams.length === 0 ? 'var(--text-muted)' : 'var(--green-400)',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: excelExporting || excelStreams.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                boxShadow: (!excelExporting && excelStreams.length > 0) ? '0 0 20px rgba(62,169,123,0.18)' : 'none',
                width: '100%',
              }}
            >
              {excelExporting
                ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {isVI ? 'Đang gom dữ liệu & đóng gói Excel...' : 'Extracting streams & building XLSX...'}</>
                : <><FileSpreadsheet size={18} />
                    {isVI ? 'Xuất Dữ liệu Thô Excel (.XLSX)' : 'Export Granular Raw Excel (.XLSX)'}</>
              }
            </button>
          </>
        )}

        {/* Note */}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 8 }}>
          {isVI
            ? 'Cơ chế tự động làm mới JWT Token luôn được kích hoạt để đảm bảo quá trình tải xuống không bị ngắt quãng.'
            : 'Automatic JWT token refresh mechanism is active to ensure uninterrupted spreadsheet extraction and downloading.'}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
