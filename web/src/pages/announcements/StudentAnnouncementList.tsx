import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Megaphone, Paperclip, Eye, Download, Clock } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { SafeHtml } from '../../components/ui/SafeHtml';
import { StudentPageHeader } from '../../components/ui/StudentPageHeader';
import { BackButton } from '../../components/ui/BackButton';

export const StudentAnnouncementList = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      if (Array.isArray(res.data)) setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto"><SkeletonList count={4} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BackButton to="/dashboard" label="Back to Dashboard" />
      <StudentPageHeader icon={Megaphone} title="Announcements" description="Important updates from your teachers" />

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Announcements"
          description="You are all caught up! Your teachers haven't posted any new announcements."
          className="py-20"
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann: any) => (
            <div key={ann.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-extrabold text-gray-900 leading-tight">{ann.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100 text-[10px] font-bold">
                    {ann.course?.subject?.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                    <Clock size={11} /> {new Date(ann.publishedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <SafeHtml html={ann.content} className="text-sm text-gray-800" />
              </div>

              {ann.attachmentFile && (
                <div className="px-5 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-blue-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0"><Paperclip size={18} /></div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{ann.attachmentFile.originalName}</div>
                        <div className="text-xs font-medium text-gray-500">{(Number(ann.attachmentFile.sizeBytes) / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={`/storage/${ann.attachmentFile.storageKey}`} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none justify-center px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"><Eye size={13} /> Preview</a>
                      <a href={`/storage/${ann.attachmentFile.storageKey}`} download className="flex-1 sm:flex-none justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"><Download size={13} /> Download</a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};