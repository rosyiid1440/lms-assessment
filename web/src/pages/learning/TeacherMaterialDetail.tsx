import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { FileText, Video, Image, Link as LinkIcon, Paperclip, File, BookOpen, ChevronRight, Download, Eye, Edit2 } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SafeHtml } from '../../components/ui/SafeHtml';
import { BackButton } from '../../components/ui/BackButton';

export const TeacherMaterialDetail = () => {
  const { id: courseId, matId } = useParams<{ id: string; matId: string }>();
  const [course, setCourse] = useState<any>(null);
  const [material, setMaterial] = useState<any>(null);
  const [location, setLocation] = useState<{ chapter: any; lesson: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchMaterial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, matId]);

  const fetchMaterial = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/learning/tree?courseId=${courseId}`);
      const tree = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
      setCourse(tree);
      if (tree) {
        let found: any = null;
        let foundChapter: any = null;
        let foundLesson: any = null;
        tree.chapters?.forEach((ch: any) => {
          ch.lessons?.forEach((ls: any) => {
            const m = ls.materials?.find((x: any) => x.id === matId);
            if (m) { found = m; foundChapter = ch; foundLesson = ls; }
          });
        });
        setMaterial(found);
        if (foundChapter && foundLesson) setLocation({ chapter: foundChapter, lesson: foundLesson });
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'HTML': case 'MARKDOWN': return <FileText size={18} className="text-blue-500" />;
      case 'VIDEO': return <Video size={18} className="text-red-500" />;
      case 'IMAGE': return <Image size={18} className="text-green-500" />;
      case 'YOUTUBE': case 'EXTERNAL_LINK': return <LinkIcon size={18} className="text-purple-500" />;
      case 'PDF': case 'OFFICE': case 'SCORM': case 'H5P': case 'AUDIO': return <Paperclip size={18} className="text-orange-500" />;
      default: return <File size={18} className="text-gray-500" />;
    }
  };

  const renderContent = () => {
    const version = material?.activeVersion;
    if (!version) {
      return (
        <EmptyState
          icon={File}
          title="No Published Content"
          description="This material has no active version yet. Click Edit to start building it."
          className="py-16 border-none shadow-none"
        />
      );
    }
    const type = material.type;

    if (type === 'HTML' || type === 'MARKDOWN') {
      return <SafeHtml html={version.searchableContent || ''} className="text-sm md:text-base text-gray-800 leading-relaxed" />;
    }
    if (type === 'VIDEO' && version.asset) {
      return <video controls className="w-full rounded-xl bg-black" src={`/storage/${version.asset.storageKey}`} />;
    }
    if (type === 'IMAGE' && version.asset) {
      return <img src={`/storage/${version.asset.storageKey}`} alt={version.title} className="max-w-full rounded-xl shadow-sm mx-auto" />;
    }
    if (type === 'PDF' && version.asset) {
      return <iframe className="w-full h-[70vh] rounded-xl border border-gray-200" src={`/storage/${version.asset.storageKey}`} title={version.title} />;
    }
    if (type === 'YOUTUBE' || type === 'EXTERNAL_LINK') {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-6 bg-purple-50 rounded-2xl mb-6"><LinkIcon size={48} className="text-purple-500" /></div>
          <a href={version.searchableContent} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline font-bold text-lg text-center break-all">Open External Link</a>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-6 bg-gray-100 rounded-2xl mb-6">{getIconForType(type)}</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{version.title}</h3>
        <p className="text-gray-500 mb-6 text-sm">This file type cannot be previewed in the browser.</p>
        {version.asset ? (
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <a href={`/storage/${version.asset.storageKey}`} target="_blank" rel="noreferrer" className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"><Eye size={16} /> Preview</a>
            <a href={`/storage/${version.asset.storageKey}`} download className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-md hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"><Download size={16} /> Download</a>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No file attached.</p>
        )}
      </div>
    );
  };

  if (loading) return <div className="max-w-4xl mx-auto"><SkeletonList count={4} /></div>;

  if (error || !material || !course) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <BackButton to={`/dashboard/teacher/courses/${courseId}?tab=materials`} label="Back to Materials" />
        <ErrorState message="Material not found or you don't have access." onRetry={fetchMaterial} />
      </div>
    );
  }

  const isPublished = !!material.currentVersionId;
  const version = material.activeVersion;

  return (
    <div className="max-w-4xl mx-auto space-y-5 md:space-y-6 pb-12">
      <BackButton to={`/dashboard/teacher/courses/${courseId}?tab=materials`} label="Back to Materials" />

      {/* Breadcrumb */}
      <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider flex-wrap">
        <Link to="/dashboard/teacher/courses" className="hover:text-primary-600 transition-colors">My Courses</Link>
        <ChevronRight size={12} className="mx-0.5" />
        <Link to={`/dashboard/teacher/courses/${courseId}`} className="hover:text-primary-600 transition-colors">{course.subject?.name}</Link>
        <ChevronRight size={12} className="mx-0.5" />
        <span>{location?.chapter?.title || 'Chapter'}</span>
        <ChevronRight size={12} className="mx-0.5" />
        <span className="text-gray-900">{location?.lesson?.title || 'Lesson'}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 md:p-3 bg-gray-50 rounded-xl border border-gray-100 flex-shrink-0">{getIconForType(material.type)}</div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-extrabold text-gray-900 leading-tight">{version?.title || 'Untitled Draft'}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">{material.type}</span>
                {isPublished ? (
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                    Published {version ? `(v${version.versionNumber})` : ''}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-yellow-50 text-yellow-700 border border-yellow-200">Draft</span>
                )}
              </div>
            </div>
          </div>
          <Link
            to={`/dashboard/teacher/courses/${courseId}?tab=materials&matId=${material.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-primary-700 transition-all active:scale-[0.98] flex-shrink-0"
          >
            <Edit2 size={16} /> Edit Material
          </Link>
        </div>

        <div className="p-4 md:p-8 bg-gray-50/40">{renderContent()}</div>
      </div>
    </div>
  );
};
