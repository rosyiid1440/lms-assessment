import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../lib/axios';
import { Save, Search, Download, Calculator, CheckCircle } from 'lucide-react';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

interface TeacherGradebookProps {
  courseId: string;
}

// ------------------------------------------------------------------
// Virtual scroll constants
// ------------------------------------------------------------------
const ROW_HEIGHT = 48; // px — must match the tr min-height below
const OVERSCAN = 5;    // extra rows rendered above/below visible window

// ------------------------------------------------------------------
// Lightweight virtual-scroll hook
// ------------------------------------------------------------------
function useVirtualRows(
  totalRows: number,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Measure once
    setContainerHeight(el.clientHeight);

    const onScroll = () => setScrollTop(el.scrollTop);
    const onResize = () => setContainerHeight(el.clientHeight);

    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [containerRef]);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);

  const totalHeight = totalRows * ROW_HEIGHT;
  const offsetTop = startIndex * ROW_HEIGHT;

  return { startIndex, endIndex, totalHeight, offsetTop };
}

// ------------------------------------------------------------------
// CSV export helper (no dependencies)
// ------------------------------------------------------------------
function exportCsv(data: { assignments: any[]; grid: any[] }) {
  const headers = [
    'NIS',
    'Student Name',
    ...data.assignments.map((a: any) => `"${a.title.replace(/"/g, '""')} (/${a.maxScore})"`),
    'Average',
    'Final',
    'Missing',
  ];

  const rows = data.grid.map((row: any) => {
    const grades = data.assignments.map((a: any) => {
      const sub = row.grades[a.id];
      return sub?.finalGrade ?? '';
    });
    return [
      row.student.nis,
      `"${row.student.fullName.replace(/"/g, '""')}"`,
      ...grades,
      row.stats.averageScore,
      row.stats.finalScore,
      row.stats.missing,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gradebook_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------------
// GradebookRow — memoised to avoid re-renders when sibling rows change
// ------------------------------------------------------------------
const GradebookRow = React.memo(function GradebookRow({
  row,
  assignments,
  editedGrades,
  onGradeChange,
}: {
  row: any;
  assignments: any[];
  editedGrades: Record<string, string>;
  onGradeChange: (studentId: string, assignmentId: string, value: string) => void;
}) {
  return (
    <tr
      className="hover:bg-blue-50/20 group"
      style={{ height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
    >
      <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-blue-50/20 border-r border-gray-200 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[10px] font-extrabold text-gray-600 shadow-sm border border-gray-300">
            {row.student.fullName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-xs truncate max-w-[180px]">{row.student.fullName}</div>
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">{row.student.nis}</div>
          </div>
        </div>
      </td>

      {assignments.map((ass: any) => {
        const sub = row.grades[ass.id];
        const editKey = `${row.student.id}_${ass.id}`;
        const currentVal =
          editedGrades[editKey] !== undefined ? editedGrades[editKey] : (sub?.finalGrade ?? '');
        const isMissing = !sub && new Date() > new Date(ass.dueDate);
        const isDraftSub = sub?.status === 'SUBMITTED' || sub?.status === 'LATE_SUBMITTED';

        return (
          <td
            key={ass.id}
            className={`px-2 py-2 border-r border-gray-100 relative ${
              isMissing ? 'bg-red-50/30' : isDraftSub ? 'bg-yellow-50/30' : ''
            }`}
          >
            <div className="flex flex-col items-center">
              <input
                type="number"
                min={0}
                max={ass.maxScore}
                step="0.1"
                value={currentVal}
                onChange={(e) => onGradeChange(row.student.id, ass.id, e.target.value)}
                className={`w-full max-w-[80px] text-center px-2 py-1.5 text-sm font-bold border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all ${
                  editedGrades[editKey] !== undefined
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-900'
                    : 'bg-transparent border-transparent hover:border-gray-300 focus:bg-white focus:border-primary-500'
                }`}
                placeholder="-"
              />
              {isDraftSub && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500"
                  title="Needs Grading"
                />
              )}
              {isMissing && (
                <span className="absolute bottom-1 right-1 text-[8px] font-extrabold text-red-500 uppercase tracking-wider">
                  Missing
                </span>
              )}
              {sub?.status === 'GRADED' && editedGrades[editKey] === undefined && (
                <CheckCircle size={10} className="text-green-500 absolute top-1.5 right-1.5 opacity-50" />
              )}
            </div>
          </td>
        );
      })}

      <td className="px-4 py-3 text-center bg-gray-50/50 border-r border-gray-200">
        <span className="font-extrabold text-gray-900 text-sm">{row.stats.averageScore}</span>
      </td>
      <td className="px-4 py-3 text-center bg-gray-50/50 border-r border-gray-200">
        <span className="font-black text-primary-700 text-base">{row.stats.finalScore}</span>
      </td>
      <td className="px-4 py-3 text-center bg-gray-50/50">
        <span
          className={`inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-extrabold ${
            row.stats.missing > 0 ? 'bg-red-100 text-red-700' : 'text-gray-400'
          }`}
        >
          {row.stats.missing}
        </span>
      </td>
    </tr>
  );
});

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------
export const TeacherGradebook = ({ courseId }: TeacherGradebookProps) => {
  const [data, setData] = useState<{ assignments: any[]; grid: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedGrades, setEditedGrades] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Virtual scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchGradebook = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/gradebook?courseId=${courseId}`);
      setData(res.data);
      setEditedGrades({});
    } catch {
      showToast('Failed to load gradebook', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGradebook();
  }, [courseId]);

  const handleGradeChange = useCallback(
    (studentId: string, assignmentId: string, value: string) => {
      setEditedGrades((prev) => ({ ...prev, [`${studentId}_${assignmentId}`]: value }));
    },
    []
  );

  const handleBulkSave = async () => {
    if (Object.keys(editedGrades).length === 0) return;
    setIsSaving(true);

    const updates = Object.keys(editedGrades).map((key) => {
      const [studentId, assignmentId] = key.split('_');
      return {
        studentId,
        assignmentId,
        finalGrade: editedGrades[key] !== '' ? parseFloat(editedGrades[key]) : null,
      };
    });

    try {
      await api.put('/gradebook/bulk', { updates });
      showToast('Grades saved successfully', 'success');
      fetchGradebook();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save grades', 'error');
      setIsSaving(false);
    }
  };

  // Filtered rows (search)
  const filteredGrid = React.useMemo(() => {
    if (!data) return [];
    const q = searchTerm.toLowerCase();
    if (!q) return data.grid;
    return data.grid.filter(
      (row: any) =>
        row.student.fullName.toLowerCase().includes(q) ||
        row.student.nis.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  // Virtual scroll calculations
  const { startIndex, endIndex, totalHeight, offsetTop } = useVirtualRows(
    filteredGrid.length,
    scrollContainerRef
  );

  const visibleRows = filteredGrid.slice(startIndex, endIndex);

  // ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="p-8">
        <SkeletonTable rows={10} cols={6} />
      </div>
    );
  }

  if (!data || data.assignments.length === 0) {
    return (
      <EmptyState
        icon={Calculator}
        title="Gradebook Empty"
        description="No assignments have been created for this course yet. Add assignments to start using the gradebook."
        className="m-8 py-24"
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {toast && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 font-medium ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50/80 p-3 md:p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 z-10 sticky top-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white outline-none shadow-sm"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {filteredGrid.length} student{filteredGrid.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => data && exportCsv(data)}
            className="flex-1 sm:flex-none justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={handleBulkSave}
            disabled={isSaving || Object.keys(editedGrades).length === 0}
            className="flex-1 sm:flex-none justify-center px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid — virtual scroll container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left text-sm text-gray-800 border-collapse min-w-max">
          <thead className="bg-white border-b-2 border-gray-300 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-4 py-4 font-extrabold text-gray-900 sticky left-0 bg-white border-r border-gray-200 z-30 min-w-[250px] shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                Student Name
              </th>
              {data.assignments.map((ass: any) => (
                <th key={ass.id} className="px-4 py-4 border-r border-gray-100 min-w-[150px] align-bottom">
                  <div className="text-xs font-bold text-gray-900 line-clamp-2" title={ass.title}>
                    {ass.title}
                  </div>
                  <div className="text-[10px] font-extrabold text-gray-400 mt-1 uppercase tracking-wider">
                    Max: {ass.maxScore}
                  </div>
                </th>
              ))}
              <th className="px-4 py-4 font-extrabold text-center bg-gray-50 border-r border-gray-200 w-24">Average</th>
              <th className="px-4 py-4 font-extrabold text-center bg-gray-50 border-r border-gray-200 w-24">Final</th>
              <th className="px-4 py-4 font-extrabold text-center bg-gray-50 w-24">Missing</th>
            </tr>
          </thead>
          <tbody>
            {/* Top spacer — represents rows scrolled past */}
            {offsetTop > 0 && (
              <tr style={{ height: offsetTop }}>
                <td colSpan={data.assignments.length + 4} />
              </tr>
            )}

            {visibleRows.map((row: any) => (
              <GradebookRow
                key={row.student.id}
                row={row}
                assignments={data.assignments}
                editedGrades={editedGrades}
                onGradeChange={handleGradeChange}
              />
            ))}

            {/* Bottom spacer — represents rows below visible window */}
            {totalHeight - offsetTop - visibleRows.length * ROW_HEIGHT > 0 && (
              <tr style={{ height: totalHeight - offsetTop - visibleRows.length * ROW_HEIGHT }}>
                <td colSpan={data.assignments.length + 4} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
