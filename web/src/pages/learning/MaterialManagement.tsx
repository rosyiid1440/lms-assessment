import React, { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Search, Folder, File, FileText, Video, Image, Link as LinkIcon, Paperclip, ChevronDown, ChevronRight, Plus, Eye, History, Edit2, FileStack, MoreVertical, Trash2, CheckCircle, Clock, Info } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { RichTextEditor } from '../../components/RichTextEditor';
import { Drawer } from '../../components/ui/Drawer';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SplitPane } from '../../components/ui/SplitPane';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../../components/ui/SortableItem';
import { SafeHtml } from '../../components/ui/SafeHtml';

interface MaterialManagementProps {
  courseId?: string;
}

export const MaterialManagement = ({ courseId: propCourseId }: MaterialManagementProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCourseId = propCourseId || searchParams.get('courseId') || '';
  const initialMatId = searchParams.get('matId') || '';

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId || '');
  const [treeData, setTreeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [treeSearch, setTreeSearch] = useState('');
  
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [modal, setModal] = useState<{type: string, data: any} | null>(null);
  const [contextMenu, setContextMenu] = useState<{id: string, type: 'CHAPTER' | 'LESSON' | 'MATERIAL', x: number, y: number, data: any} | null>(null);
  const [historyDrawer, setHistoryDrawer] = useState<{isOpen: boolean, materialId: string}>({isOpen: false, materialId: ''});
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean, type: string, id: string}>({isOpen: false, type: '', id: ''});

  const [showRightPanel, setShowRightPanel] = useState(true);

  const { register, handleSubmit, reset, control, setValue, watch } = useForm();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [versions, setVersions] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchCourses();
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchTree(selectedCourse, initialMatId);
      setSelectedMaterial(null);
    }
  }, [selectedCourse]);

  const updateUrlParam = (matId: string) => {
    if (propCourseId) setSearchParams({ tab: 'materials', matId });
    else setSearchParams({ courseId: selectedCourse, matId });
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'CHAPTER' | 'LESSON' | 'MATERIAL', data: any) => {
    e.preventDefault();
    e.stopPropagation();
    const MENU_W = 200;
    const MENU_H = 220;
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - MENU_W));
    const y = Math.max(8, Math.min(e.clientY, window.innerHeight - MENU_H));
    setContextMenu({ id: data.id, type, x, y, data });
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses?limit=100');
      setCourses(res.data.data);
      if (res.data.data.length > 0 && !selectedCourse) setSelectedCourse(res.data.data[0].id);
    } catch (err) {}
  };

  const fetchTree = async (courseId: string, autoSelectMatId?: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/learning/tree?courseId=${courseId}`);
      if (res.data.length > 0) {
        const data = res.data[0];
        setTreeData(data);
        
        setExpandedNodes(prev => {
          if (Object.keys(prev).length > 0) return prev;
          const newExpanded: any = { [data.id]: true };
          data.chapters.forEach((ch: any) => {
            newExpanded[ch.id] = true;
            ch.lessons.forEach((ls: any) => { newExpanded[ls.id] = true; });
          });
          return newExpanded;
        });

        if (autoSelectMatId) {
          let foundMat = null;
          data.chapters.forEach((ch: any) => {
            ch.lessons.forEach((ls: any) => {
              const mat = ls.materials.find((m:any) => m.id === autoSelectMatId);
              if (mat) foundMat = mat;
            });
          });
          if (foundMat) {
            setSelectedMaterial(foundMat);
            fetchVersions(autoSelectMatId);
          }
        }
      }
    } catch (err) {
      showToast('Failed to load learning tree', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (id: string) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDragEnd = async (event: any, type: 'CHAPTER' | 'LESSON' | 'MATERIAL', parentId?: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    let newTree = { ...treeData };
    let itemsToUpdate: any[] = [];

    if (type === 'CHAPTER') {
      const oldIndex = newTree.chapters.findIndex((x: any) => x.id === active.id);
      const newIndex = newTree.chapters.findIndex((x: any) => x.id === over.id);
      newTree.chapters = arrayMove(newTree.chapters, oldIndex, newIndex);
      itemsToUpdate = newTree.chapters.map((item: any, idx: number) => ({ id: item.id, order: idx + 1 }));
    } else if (type === 'LESSON') {
      newTree.chapters = newTree.chapters.map((ch: any) => {
        if (ch.id === parentId) {
          const oldIndex = ch.lessons.findIndex((x: any) => x.id === active.id);
          const newIndex = ch.lessons.findIndex((x: any) => x.id === over.id);
          const newLessons = arrayMove(ch.lessons, oldIndex, newIndex);
          itemsToUpdate = newLessons.map((item: any, idx: number) => ({ id: item.id, order: idx + 1 }));
          return { ...ch, lessons: newLessons };
        }
        return ch;
      });
    } else if (type === 'MATERIAL') {
      newTree.chapters = newTree.chapters.map((ch: any) => ({
        ...ch,
        lessons: ch.lessons.map((ls: any) => {
          if (ls.id === parentId) {
            const oldIndex = ls.materials.findIndex((x: any) => x.id === active.id);
            const newIndex = ls.materials.findIndex((x: any) => x.id === over.id);
            const newMaterials = arrayMove(ls.materials, oldIndex, newIndex);
            itemsToUpdate = newMaterials.map((item: any, idx: number) => ({ id: item.id, order: idx + 1 }));
            return { ...ls, materials: newMaterials };
          }
          return ls;
        })
      }));
    }

    setTreeData(newTree);

    try {
      if (type === 'CHAPTER') await api.put('/learning/chapters/reorder', { items: itemsToUpdate });
      if (type === 'LESSON') await api.put('/learning/lessons/reorder', { items: itemsToUpdate });
      if (type === 'MATERIAL') await api.put('/learning/materials/reorder', { items: itemsToUpdate });
    } catch (err) {
      showToast('Reorder failed, reverting', 'error');
      fetchTree(selectedCourse, selectedMaterial?.id);
    }
  };

  const handleCreateChapter = async (data: any) => {
    try {
      await api.post('/learning/chapters', { ...data, courseId: selectedCourse });
      showToast('Chapter created', 'success');
      setModal(null);
      fetchTree(selectedCourse);
    } catch (err) {}
  };

  const handleRenameChapter = async (data: any) => {
    try {
      await api.put(`/learning/chapters/${modal?.data.id}`, { title: data.title });
      showToast('Chapter renamed', 'success');
      setModal(null);
      fetchTree(selectedCourse);
    } catch (err) {}
  };

  const handleCreateLesson = async (data: any) => {
    try {
      await api.post('/learning/lessons', { ...data, chapterId: modal?.data.chapterId });
      showToast('Lesson created', 'success');
      setModal(null);
      fetchTree(selectedCourse);
    } catch (err) {}
  };

  const handleRenameLesson = async (data: any) => {
    try {
      await api.put(`/learning/lessons/${modal?.data.id}`, { title: data.title });
      showToast('Lesson renamed', 'success');
      setModal(null);
      fetchTree(selectedCourse);
    } catch (err) {}
  };

  const handleCreateMaterial = async (data: any) => {
    try {
      await api.post('/learning/materials', { ...data, lessonId: modal?.data.lessonId });
      showToast(`Material saved as ${data.status || 'Draft'}`, 'success');
      setModal(null);
      fetchTree(selectedCourse);
    } catch (err) {}
  };

  const handleEditMaterial = async (data: any) => {
    try {
      await api.put(`/learning/materials/${modal?.data.materialId}`, data);
      showToast(`New version saved as ${data.status || 'Draft'}`, 'success');
      setModal(null);
      fetchTree(selectedCourse, modal?.data.materialId); 
    } catch (err) {}
  };

  const executeDelete = async () => {
    try {
      if (confirmDelete.type === 'CHAPTER') {
        await api.delete(`/learning/chapters/${confirmDelete.id}`);
        showToast('Chapter deleted', 'success');
      } else if (confirmDelete.type === 'LESSON') {
        await api.delete(`/learning/lessons/${confirmDelete.id}`);
        showToast('Lesson deleted', 'success');
      } else if (confirmDelete.type === 'MATERIAL') {
        await api.delete(`/learning/materials/${confirmDelete.id}`);
        showToast('Material deleted', 'success');
        if (selectedMaterial?.id === confirmDelete.id) setSelectedMaterial(null);
      }
      setConfirmDelete({isOpen: false, type: '', id: ''});
      fetchTree(selectedCourse);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
      setConfirmDelete({isOpen: false, type: '', id: ''});
    }
  };

  const handlePublish = async (materialId: string, versionId: string) => {
    try {
      await api.post(`/learning/materials/${materialId}/publish`, { versionId });
      showToast('Published successfully', 'success');
      fetchTree(selectedCourse, materialId);
      fetchVersions(materialId);
    } catch (err) {}
  };

  const fetchVersions = async (materialId: string) => {
    try {
      const res = await api.get(`/learning/materials/${materialId}/versions`);
      setVersions(res.data);
    } catch (err) {}
  };

  const handleSelectMaterial = (mat: any) => {
    // On small screens (SplitPane stacked, detail would appear below the list),
    // open the dedicated detail page instead.
    const isMobileLayout = window.matchMedia('(max-width: 1023px)').matches;
    const courseIdForNav = propCourseId || selectedCourse;
    if (isMobileLayout && courseIdForNav) {
      navigate(`/dashboard/teacher/courses/${courseIdForNav}/materials/${mat.id}`);
      return;
    }
    setSelectedMaterial(mat);
    updateUrlParam(mat.id);
    fetchVersions(mat.id);
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/learning/assets', formData, {
        onUploadProgress: (evt) => {
          setUploadProgress(Math.round((evt.loaded * 100) / evt.total!));
        }
      });
      showToast('File uploaded', 'success');
      reset({ ...modal?.data, assetId: res.data.id, title: file.name });
      setUploadProgress(0);
    } catch (err) {
      showToast('Upload failed', 'error');
      setUploadProgress(0);
    }
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'HTML': case 'MARKDOWN': return <FileText size={16} className="text-blue-500" />;
      case 'VIDEO': return <Video size={16} className="text-red-500" />;
      case 'IMAGE': return <Image size={16} className="text-green-500" />;
      case 'EXTERNAL_LINK': return <LinkIcon size={16} className="text-purple-500" />;
      case 'PDF': case 'OFFICE': return <Paperclip size={16} className="text-orange-500" />;
      default: return <File size={16} className="text-gray-500" />;
    }
  };

  const filterTree = (chapters: any[]) => {
    if (!treeSearch) return chapters;
    const lower = treeSearch.toLowerCase();
    
    return chapters.map(ch => {
      const lessons = ch.lessons.map((ls: any) => {
        const materials = ls.materials.filter((m: any) => (m.activeVersion?.title || m.type).toLowerCase().includes(lower));
        if (materials.length > 0 || ls.title.toLowerCase().includes(lower)) return { ...ls, materials };
        return null;
      }).filter(Boolean);

      if (lessons.length > 0 || ch.title.toLowerCase().includes(lower)) return { ...ch, lessons };
      return null;
    }).filter(Boolean);
  };

  const renderTree = () => {
    if (!treeData) return null;
    const filteredChapters = filterTree(treeData.chapters);

    return (
      <div className="space-y-1 select-none text-sm p-4 pb-24">
        <div className="flex items-center gap-2 font-bold text-gray-900 pb-3 mb-3 border-b border-gray-200">
          <div className="p-1.5 bg-primary-50 text-primary-600 rounded-md"><Folder size={18} /></div>
          <span className="truncate">{treeData.subject.name}</span>
          <button 
            onClick={() => { reset(); setModal({ type: 'ADD_CHAPTER', data: {} }); }}
            className="ml-auto text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded shadow-sm hover:bg-gray-50 uppercase tracking-wider flex-shrink-0"
          >+ Chap</button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'CHAPTER')}>
          <SortableContext items={filteredChapters.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
            {filteredChapters.map((chapter: any) => (
              <SortableItem key={chapter.id} id={chapter.id}>
                <div className="space-y-0.5">
                  <div 
                    onContextMenu={(e) => handleContextMenu(e, 'CHAPTER', chapter)}
                    className="flex items-center gap-1 group p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer relative"
                  >
                    <button onClick={() => toggleNode(chapter.id)} className="p-0.5 hover:bg-gray-100 rounded text-gray-400">
                      {expandedNodes[chapter.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <span className="font-bold text-gray-800 truncate flex-1">📁 {chapter.title}</span>
                    <button onClick={(e) => handleContextMenu(e, 'CHAPTER', chapter)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-400 hover:text-gray-900 p-1 rounded" aria-label="Chapter options"><MoreVertical size={16} /></button>
                  </div>

                  {expandedNodes[chapter.id] && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'LESSON', chapter.id)}>
                      <SortableContext items={chapter.lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                        <div className="ml-5 border-l border-gray-200 pl-1 space-y-0.5 my-1">
                          {chapter.lessons.map((lesson: any) => (
                            <SortableItem key={lesson.id} id={lesson.id}>
                              <div className="space-y-0.5">
                                <div 
                                  onContextMenu={(e) => handleContextMenu(e, 'LESSON', lesson)}
                                  className="flex items-center gap-1 group p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer relative"
                                >
                                  <button onClick={() => toggleNode(lesson.id)} className="p-0.5 hover:bg-gray-100 rounded text-gray-400">
                                    {expandedNodes[lesson.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                  <span className="font-semibold text-gray-700 truncate flex-1 text-[13px]">📂 {lesson.title}</span>
                                  <button onClick={(e) => handleContextMenu(e, 'LESSON', lesson)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-400 hover:text-gray-900 p-1 rounded" aria-label="Lesson options"><MoreVertical size={16} /></button>
                                </div>

                                {expandedNodes[lesson.id] && (
                                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'MATERIAL', lesson.id)}>
                                    <SortableContext items={lesson.materials.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
                                      <div className="ml-5 space-y-0.5">
                                        {lesson.materials.map((mat: any) => (
                                          <SortableItem key={mat.id} id={mat.id}>
                                            <div 
                                              onClick={() => handleSelectMaterial(mat)}
                                              onContextMenu={(e) => handleContextMenu(e, 'MATERIAL', mat)}
                                              className={`p-2 rounded-lg border transition-all flex items-center justify-between group cursor-pointer relative ${
                                                selectedMaterial?.id === mat.id ? 'bg-primary-50 border-primary-200 shadow-sm' : 'border-transparent hover:border-gray-200 hover:bg-white'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                {getIconForType(mat.type)}
                                                <span className={`text-[13px] truncate ${selectedMaterial?.id === mat.id ? 'font-bold text-primary-900' : 'font-medium text-gray-700'}`}>
                                                  {mat.activeVersion?.title || <span className="italic text-gray-400">Untitled Draft</span>}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1 flex-shrink-0">
                                                {!mat.currentVersionId && <div className="w-2 h-2 rounded-full bg-yellow-400" title="Draft"></div>}
                                                <button onClick={(e) => handleContextMenu(e, 'MATERIAL', mat)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-400 hover:text-gray-900 p-1 rounded" aria-label="Material options"><MoreVertical size={16} /></button>
                                              </div>
                                            </div>
                                          </SortableItem>
                                        ))}
                                      </div>
                                    </SortableContext>
                                  </DndContext>
                                )}
                              </div>
                            </SortableItem>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${propCourseId ? 'h-full' : 'h-[calc(100vh-8rem)] space-y-6'}`}>
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 text-white animate-in fade-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {!propCourseId && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Learning Workspace</h2>
            <p className="text-sm text-gray-500 mt-1">Design syllabus and manage course materials</p>
          </div>
          <select 
            value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 bg-white shadow-sm text-sm"
          >
            <option value="">-- Select Course to Manage --</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.subject.name} - {c.class.name}</option>)}
          </select>
        </div>
      )}

      <div className={`bg-white border-gray-200 flex-1 overflow-hidden shadow-sm ${propCourseId ? '' : 'border rounded-2xl'}`}>
        <SplitPane 
          initialLeftWidth={320}
          leftPane={
            <div className="h-full flex flex-col bg-gray-50/50">
              <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="text" placeholder="Search Chapter/Lesson/Material..." value={treeSearch} onChange={e => setTreeSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-shadow" />
                </div>
              </div>
              {loading ? (
                <div className="p-6 space-y-4 animate-pulse"><div className="h-6 bg-gray-200 rounded w-full"></div><div className="h-4 bg-gray-200 rounded w-3/4 ml-4"></div></div>
              ) : !treeData ? (
                <div className="text-center text-gray-400 text-sm py-12 flex flex-col items-center"><Folder size={32} className="mb-3 opacity-20" /> Select a course to load syllabus</div>
              ) : renderTree()}
            </div>
          }
          rightPane={
            <div className="flex flex-col lg:flex-row h-full relative">
              {/* Center Pane: Preview / Editor */}
              <div className="flex-1 flex flex-col h-full bg-white relative min-w-0">
                {!selectedMaterial ? (
                  <EmptyState icon={FileStack} title="Material Workspace" description="Select a material from the explorer on the left to preview its content or edit properties." className="m-auto border-none shadow-none" />
                ) : (
                  <>
                    <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 flex-shrink-0 shadow-sm z-10 gap-3">
                      <div className="flex items-center gap-3 truncate min-w-0">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 flex-shrink-0">{getIconForType(selectedMaterial.type)}</div>
                        <div className="truncate min-w-0">
                          <h2 className="text-base md:text-lg font-bold text-gray-900 truncate leading-tight">{selectedMaterial.activeVersion?.title || 'Untitled Draft'}</h2>
                          <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                            <span>{selectedMaterial.type}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            {selectedMaterial.currentVersionId ? <span className="text-green-600 truncate">Published (v{selectedMaterial.activeVersion?.versionNumber})</span> : <span className="text-yellow-600">Draft</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-auto">
                        <button onClick={() => { reset(selectedMaterial.activeVersion || {}); setModal({ type: 'EDIT_MATERIAL', data: { materialId: selectedMaterial.id, type: selectedMaterial.type } }); }} className="px-3 md:px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors flex items-center gap-2"><Edit2 size={16}/> <span className="hidden sm:inline">Edit Material</span></button>
                        <button onClick={() => setShowRightPanel(!showRightPanel)} className={`p-2 border border-gray-200 rounded-lg shadow-sm transition-colors hidden lg:block ${showRightPanel ? 'bg-primary-50 text-primary-600 border-primary-200' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Info size={18}/></button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 flex flex-col items-center">
                      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                        {selectedMaterial.type === 'HTML' ? (
                          <SafeHtml html={selectedMaterial.activeVersion?.searchableContent || ''} className="p-8 w-full flex-1" />
                        ) : selectedMaterial.activeVersion?.assetId ? (
                          <div className="w-full flex-1 flex flex-col">
                            {selectedMaterial.type === 'VIDEO' ? (
                              <video controls className="w-full h-full object-contain bg-black min-h-[500px]" src={`/storage/${selectedMaterial.activeVersion.asset.storageKey}`} />
                            ) : selectedMaterial.type === 'IMAGE' ? (
                              <div className="w-full h-full flex items-center justify-center p-4 bg-gray-100 min-h-[500px]"><img className="max-w-full max-h-full object-contain rounded-lg shadow-sm" src={`/storage/${selectedMaterial.activeVersion.asset.storageKey}`} alt="Material" /></div>
                            ) : selectedMaterial.type === 'PDF' ? (
                              <iframe className="w-full h-full flex-1 min-h-[600px]" src={`/storage/${selectedMaterial.activeVersion.asset.storageKey}`} />
                            ) : selectedMaterial.type === 'EXTERNAL_LINK' ? (
                              <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[500px]">
                                <LinkIcon size={64} className="text-blue-500 mb-6 p-4 bg-blue-50 rounded-2xl" />
                                <a href={selectedMaterial.activeVersion.searchableContent} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline font-extrabold text-2xl text-center">Open External Link</a>
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-50 min-h-[500px]">
                                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">{getIconForType(selectedMaterial.type)}</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">File Ready for Download</h3>
                                <p className="text-gray-500 mb-6 text-sm">This file type cannot be previewed in the browser.</p>
                                <a href={`/storage/${selectedMaterial.activeVersion.asset.storageKey}`} target="_blank" rel="noreferrer" className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-md hover:bg-primary-700 transition-all transform hover:-translate-y-0.5">Download File</a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <EmptyState icon={File} title="No Content" description="This material has no active content yet. Click Edit to start building." className="border-none shadow-none my-auto" />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Panel: Notion Style Properties */}
              {showRightPanel && selectedMaterial && (
                <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col lg:h-full overflow-y-auto flex-shrink-0 animate-in slide-in-from-right-8 duration-300">
                  <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <Info size={18} className="text-gray-400" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Properties</h3>
                  </div>
                  
                  <div className="p-6 space-y-6 flex-1">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-2"><CheckCircle size={14}/> Status</span>
                        {selectedMaterial.currentVersionId ? <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Published</span> : <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Draft</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-2"><File size={14}/> Format</span>
                        <span className="text-sm font-semibold text-gray-900">{selectedMaterial.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-2"><Clock size={14}/> Created</span>
                        <span className="text-sm font-semibold text-gray-900">{new Date(selectedMaterial.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-2"><Clock size={14}/> Updated</span>
                        <span className="text-sm font-semibold text-gray-900">{new Date(selectedMaterial.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><History size={14}/> Version History</h4>
                      {versions.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">No history available</div>
                      ) : (
                        <div className="relative border-l-2 border-gray-100 ml-2 space-y-6">
                          {versions.map((v: any, index: number) => (
                            <div key={v.id} className="relative pl-4">
                              <div className={`absolute w-2.5 h-2.5 rounded-full -left-[5px] top-1.5 ${index === 0 ? 'bg-primary-500 ring-4 ring-primary-50' : 'bg-gray-300'}`}></div>
                              <div>
                                <div className="text-sm font-bold text-gray-900">v{v.versionNumber}</div>
                                <div className="text-xs text-gray-500 mb-2">{new Date(v.createdAt).toLocaleString()}</div>
                                {selectedMaterial.currentVersionId !== v.id && (
                                  <button onClick={() => handlePublish(selectedMaterial.id, v.id)} className="text-[10px] font-bold bg-white border border-gray-200 text-gray-700 hover:text-green-600 hover:border-green-200 px-2 py-1 rounded transition-colors shadow-sm">
                                    Publish
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)}>
          <div 
            className="absolute bg-white border border-gray-200 shadow-2xl rounded-xl py-1.5 min-w-[180px] animate-in fade-in zoom-in duration-150"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.type === 'CHAPTER' && (
              <>
                <button onClick={() => { reset({ title: contextMenu.data.title }); setModal({ type: 'RENAME_CHAPTER', data: contextMenu.data }); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit2 size={16}/> Rename Chapter</button>
                <button onClick={() => { reset(); setModal({ type: 'ADD_LESSON', data: { chapterId: contextMenu.data.id } }); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Plus size={16}/> Add Lesson</button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { setConfirmDelete({isOpen: true, type: 'CHAPTER', id: contextMenu.data.id}); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} /> Delete</button>
              </>
            )}
            {contextMenu.type === 'LESSON' && (
              <>
                <button onClick={() => { reset({ title: contextMenu.data.title }); setModal({ type: 'RENAME_LESSON', data: contextMenu.data }); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit2 size={16}/> Rename Lesson</button>
                <button onClick={() => { reset({ type: 'HTML' }); setModal({ type: 'ADD_MATERIAL', data: { lessonId: contextMenu.data.id } }); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Plus size={16}/> Add Material</button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { setConfirmDelete({isOpen: true, type: 'LESSON', id: contextMenu.data.id}); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={16}/> Delete</button>
              </>
            )}
            {contextMenu.type === 'MATERIAL' && (
              <>
                <button onClick={() => { reset(contextMenu.data.activeVersion || {}); setModal({ type: 'EDIT_MATERIAL', data: { materialId: contextMenu.data.id, type: contextMenu.data.type } }); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit2 size={16}/> Edit Material</button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { setConfirmDelete({isOpen: true, type: 'MATERIAL', id: contextMenu.data.id}); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={16}/> Delete</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={modal?.type === 'ADD_CHAPTER' || modal?.type === 'ADD_LESSON' || modal?.type === 'RENAME_CHAPTER' || modal?.type === 'RENAME_LESSON'} onClose={() => setModal(null)} title={modal?.type === 'ADD_CHAPTER' ? 'New Chapter' : modal?.type === 'ADD_LESSON' ? 'New Lesson' : modal?.type === 'RENAME_CHAPTER' ? 'Rename Chapter' : 'Rename Lesson'}>
        <form onSubmit={handleSubmit(modal?.type === 'ADD_CHAPTER' ? handleCreateChapter : modal?.type === 'ADD_LESSON' ? handleCreateLesson : modal?.type === 'RENAME_CHAPTER' ? handleRenameChapter : handleRenameLesson)} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Title</label>
            <input {...register('title')} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow" placeholder="Type title here..." />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={() => setModal(null)} className="px-5 py-2.5 text-gray-700 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5">Save changes</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal?.type === 'ADD_MATERIAL' || modal?.type === 'EDIT_MATERIAL'} onClose={() => setModal(null)} title={modal?.type === 'EDIT_MATERIAL' ? 'Edit Material (New Version)' : 'New Material'} width="max-w-2xl">
        <form onSubmit={handleSubmit(modal?.type === 'EDIT_MATERIAL' ? handleEditMaterial : handleCreateMaterial)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {modal?.type === 'ADD_MATERIAL' && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">Material Type</label>
                <select {...register('type')} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="HTML">Rich Text / HTML</option>
                  <option value="PDF">PDF Document</option>
                  <option value="VIDEO">Video</option>
                  <option value="IMAGE">Image</option>
                  <option value="OFFICE">Office File</option>
                </select>
              </div>
            )}
            <div className={modal?.type === 'ADD_MATERIAL' ? '' : 'col-span-2'}>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Material Title</label>
              <input {...register('title')} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none focus:bg-white transition-colors" placeholder="E.g., Introduction to Physics" />
            </div>
          </div>
          
          {watch('type') !== 'HTML' && (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors group relative">
              <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <div className="w-14 h-14 bg-white shadow-sm border border-gray-200 text-primary-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Paperclip size={24} />
                </div>
                <span className="text-sm font-bold text-gray-900">Click to upload a file</span>
                <span className="text-xs font-medium text-gray-400 mt-1.5">PDF, MP4, PNG, PPTX, etc (Max 100MB)</span>
              </label>
              {watch('assetId') && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 text-xs font-bold rounded-lg border border-green-200">
                  File Attached
                </div>
              )}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-6 overflow-hidden">
                  <div className="bg-primary-600 h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {watch('type') === 'HTML' ? 'Content Editor *' : 'Description / Notes'}
            </label>
            <Controller
              name="searchableContent"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <RichTextEditor content={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <input type="hidden" {...register('assetId')} />
          <input type="hidden" {...register('status')} />
          
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={() => setModal(null)} className="px-5 py-2.5 text-gray-700 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" onClick={() => setValue('status', 'DRAFT')} className="px-5 py-2.5 bg-gray-100 text-gray-800 font-bold rounded-xl shadow-sm hover:bg-gray-200 transition-all">Save Draft</button>
            <button type="submit" onClick={() => setValue('status', 'PUBLISHED')} className="px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5">Publish Now</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({isOpen: false, type: '', id: ''})}
        onConfirm={executeDelete}
        title={`Delete ${confirmDelete.type.toLowerCase()}`}
        description={`Are you sure you want to delete this ${confirmDelete.type.toLowerCase()}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
};
