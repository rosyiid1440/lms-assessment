import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { FileText, Video, Image, Link as LinkIcon, Paperclip, File, BookOpen, ChevronRight, Download, Eye } from 'lucide-react';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { SafeHtml } from '../../components/ui/SafeHtml';
import { StudentPageHeader } from '../../components/ui/StudentPageHeader';
import { BackButton } from '../../components/ui/BackButton';
import { Modal } from '../../components/ui/Modal';

export const StudentMaterialList = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [treeData, setTreeData] = useState<any>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (selectedCourse) {
      fetchTree(selectedCourse.id);
      setSelectedMaterial(null);
      setExpanded({});
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/gradebook/student/ME');
      if (Array.isArray(res.data)) {
        const courseList = res.data.map((item: any) => item.course);
        setCourses(courseList);
        const target = courseId ? courseList.find((c: any) => c.id === courseId) : courseList[0];
        if (target) setSelectedCourse(target);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTree = async (courseId: string) => {
    setTreeLoading(true);
    setSelectedMaterial(null);
    try {
      const res = await api.get(`/learning/tree?courseId=${courseId}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        const tree = res.data[0];
        setTreeData(tree);
        if (tree.chapters?.length > 0) {
          const initial: Record<string, boolean> = {};
          tree.chapters.forEach((ch: any) => { initial[ch.id] = true; });
          setExpanded(initial);
        }
      } else {
        setTreeData(null);
      }
    } catch (err) {
      console.error(err);
      setTreeData(null);
    } finally {
      setTreeLoading(false);
    }
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

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

  const renderMaterialContent = () => {
    const version = selectedMaterial?.activeVersion;
    if (!version) return null;

    if (selectedMaterial.type === 'HTML' || selectedMaterial.type === 'MARKDOWN') {
      return <SafeHtml html={version.searchableContent || ''} className="text-sm text-gray-800 leading-relaxed" />;
    }
    if (selectedMaterial.type === 'VIDEO' && version.asset) {
      return <video controls className="w-full rounded-xl bg-black" src={`/storage/${version.asset.storageKey}`} />;
    }
    if (selectedMaterial.type === 'IMAGE' && version.asset) {
      return <img src={`/storage/${version.asset.storageKey}`} alt={version.title} className="max-w-full rounded-xl shadow-sm mx-auto" />;
    }
    if (selectedMaterial.type === 'PDF' && version.asset) {
      return <iframe className="w-full h-[70vh] rounded-xl border border-gray-200" src={`/storage/${version.asset.storageKey}`} title={version.title} />;
    }
    if (selectedMaterial.type === 'YOUTUBE' || selectedMaterial.type === 'EXTERNAL_LINK') {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-6 bg-purple-50 rounded-2xl mb-6"><LinkIcon size={48} className="text-purple-500" /></div>
          <a href={version.searchableContent} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline font-bold text-lg text-center">Open External Link</a>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-6 bg-gray-100 rounded-2xl mb-6">{getIconForType(selectedMaterial.type)}</div>
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

  if (loading) return <div className="max-w-5xl mx-auto"><SkeletonList count={4} /></div>;

  if (courses.length === 0 || (courseId && !selectedCourse)) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <StudentPageHeader icon={BookOpen} title="Learning Materials" description="Access your course materials" />
        <EmptyState icon={BookOpen} title="No Materials Available" description="You are not currently enrolled in any courses." className="py-20" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton to={courseId ? `/dashboard/student/courses/${courseId}` : '/dashboard/student/courses'} label={courseId ? 'Back to Course' : 'Back to My Courses'} />

      {selectedCourse && (
        <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl p-5 md:p-6 text-white shadow-md">
          <h1 className="text-xl md:text-2xl font-extrabold leading-tight">{selectedCourse.subject?.name}</h1>
          <p className="text-primary-100 font-medium text-sm md:text-base mt-1">Learning Materials</p>
        </div>
      )}

      {/* Course selector */}
      {!courseId && courses.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                selectedCourse?.id === c.id
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
              }`}
            >
              {c.subject?.name}
            </button>
          ))}
        </div>
      )}

      {treeLoading ? (
        <div className="max-w-5xl mx-auto"><SkeletonList count={4} /></div>
      ) : !treeData ? (
        <EmptyState
          icon={FileText}
          title="No Published Materials"
          description="Your teacher hasn't published any materials for this course yet. Please check back later."
          className="py-20"
        />
      ) : (
        <div className="space-y-3">
          {treeData.chapters?.length === 0 ? (
            <EmptyState icon={FileText} title="No Chapters" description="This course doesn't have any content yet." className="py-20" />
          ) : (
            treeData.chapters.map((chapter: any) => (
              <div key={chapter.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleExpand(chapter.id)}
                  className="w-full flex items-center gap-2 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${expanded[chapter.id] ? 'rotate-90' : ''}`} />
                  <span className="font-bold text-gray-900 flex-1 truncate">{chapter.title}</span>
                </button>

                {expanded[chapter.id] && (
                  <div className="divide-y divide-gray-50 border-t border-gray-100">
                    {chapter.lessons?.length === 0 ? (
                      <p className="p-4 text-sm text-gray-400 italic">No published lessons.</p>
                    ) : (
                      chapter.lessons.map((lesson: any) => (
                        <div key={lesson.id} className="p-4">
                          <h5 className="font-semibold text-gray-600 text-[13px] mb-2 uppercase tracking-wide">📂 {lesson.title}</h5>
                          {lesson.materials?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic px-3">No materials.</p>
                          ) : (
                            <div className="space-y-2">
                              {lesson.materials.map((mat: any) => (
                                <button
                                  key={mat.id}
                                  onClick={() => setSelectedMaterial(mat)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                                    selectedMaterial?.id === mat.id
                                      ? 'border-primary-300 bg-primary-50'
                                      : 'border-gray-100 bg-gray-50/50 hover:bg-primary-50 hover:border-primary-200'
                                  }`}
                                >
                                  {getIconForType(mat.type)}
                                  <span className="text-[13px] font-medium text-gray-800 truncate flex-1">
                                    {mat.activeVersion?.title || 'Untitled'}
                                  </span>
                                  <Eye size={15} className="text-gray-300 flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Material viewer modal */}
      <Modal
        isOpen={!!selectedMaterial}
        onClose={() => setSelectedMaterial(null)}
        title={selectedMaterial?.activeVersion?.title || 'Material'}
        width="max-w-4xl"
      >
        {selectedMaterial && (
          <>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              {selectedMaterial.type}
              {selectedMaterial.activeVersion ? ` • Version ${selectedMaterial.activeVersion.versionNumber}` : ''}
            </p>
            {renderMaterialContent()}
          </>
        )}
      </Modal>
    </div>
  );
};