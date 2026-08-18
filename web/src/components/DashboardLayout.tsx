import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, LayoutDashboard, Users, BookOpen, GraduationCap, Briefcase, ClipboardList, Library, FileStack, CalendarCheck, Award, Megaphone, CalendarDays, Menu, X, BookMarked, MonitorPlay, BookOpenCheck, FileQuestion, ClipboardEdit, FileText, BarChart3, PlayCircle, MonitorSmartphone } from 'lucide-react';

import { FloatingAIChat } from './chat/FloatingAIChat';

export const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navClass = (path: string) => 
    `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors text-sm ${
      isActive(path) 
        ? 'bg-primary-50 text-primary-700' 
        : 'text-gray-600 hover:bg-gray-50'
    }`;

  const isTeacher = user?.role?.slug === 'teacher';
  const isStudent = user?.role?.slug === 'student';
  const isAdmin = !isTeacher && !isStudent; // super_admin, admin

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <>
      <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-lg md:text-xl font-bold text-gray-900">LMS Enterprise</h1>
        <button onClick={closeSidebar} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <div className="p-3 md:p-4 flex-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Menu</div>
        <nav className="space-y-1">
          <Link to="/dashboard" onClick={closeSidebar} className={navClass('/dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>

          {/* ADMIN MENU */}
          {isAdmin && (
            <>
              <Link to="/dashboard/users" onClick={closeSidebar} className={navClass('/dashboard/users')}>
                <Users size={20} /> User Management
              </Link>
              <Link to="/dashboard/academic" onClick={closeSidebar} className={navClass('/dashboard/academic')}>
                <BookOpen size={20} /> Academic Year
              </Link>
              <Link to="/dashboard/classes" onClick={closeSidebar} className={navClass('/dashboard/classes')}>
                <GraduationCap size={20} /> Classes
              </Link>
              <Link to="/dashboard/students" onClick={closeSidebar} className={navClass('/dashboard/students')}>
                <Users size={20} /> Students
              </Link>
              <Link to="/dashboard/teachers" onClick={closeSidebar} className={navClass('/dashboard/teachers')}>
                <Briefcase size={20} /> Teachers
              </Link>
              <Link to="/dashboard/enrollments" onClick={closeSidebar} className={navClass('/dashboard/enrollments')}>
                <ClipboardList size={20} /> Enrollments
              </Link>
              <Link to="/dashboard/courses" onClick={closeSidebar} className={navClass('/dashboard/courses')}>
                <Library size={20} /> Courses
              </Link>
              <Link to="/dashboard/materials" onClick={closeSidebar} className={navClass('/dashboard/materials')}>
                <FileStack size={20} /> Materials
              </Link>
              <Link to="/dashboard/teacher/modules" onClick={closeSidebar} className={navClass('/dashboard/teacher/modules')}>
                <BookMarked size={20} /> Modul Ajar
              </Link>
              <Link to="/dashboard/calendar" onClick={closeSidebar} className={navClass('/dashboard/calendar')}>
                <CalendarDays size={20} /> Calendar
              </Link>
            </>
          )}

          {/* ASSESSMENT MENU (staff) */}
          {(isAdmin || isTeacher) && (
            <>
              <Link to="/dashboard/assessment/questions" onClick={closeSidebar} className={navClass('/dashboard/assessment/questions')}>
                <FileQuestion size={20} /> Bank Soal
              </Link>
              <Link to="/dashboard/assessment/builder" onClick={closeSidebar} className={navClass('/dashboard/assessment/builder')}>
                <ClipboardEdit size={20} /> Assessment Builder
              </Link>
              <Link to="/dashboard/assessment/review" onClick={closeSidebar} className={navClass('/dashboard/assessment/review')}>
                <FileText size={20} /> Penilaian Manual
              </Link>
              <Link to="/dashboard/assessment/monitor" onClick={closeSidebar} className={navClass('/dashboard/assessment/monitor')}>
                <MonitorSmartphone size={20} /> Monitoring Ujian
              </Link>
              <Link to="/dashboard/assessment/analytics" onClick={closeSidebar} className={navClass('/dashboard/assessment/analytics')}>
                <BarChart3 size={20} /> Analitik Ujian
              </Link>
            </>
          )}

          {/* TEACHER MENU */}
          {isTeacher && (
            <>
              <Link to="/dashboard/teacher/courses" onClick={closeSidebar} className={navClass('/dashboard/teacher/courses')}>
                <Library size={20} /> My Courses
              </Link>
              <Link to="/dashboard/materials" onClick={closeSidebar} className={navClass('/dashboard/materials')}>
                <FileStack size={20} /> Learning Materials
              </Link>
              <Link to="/dashboard/teacher/modules" onClick={closeSidebar} className={navClass('/dashboard/teacher/modules')}>
                <BookMarked size={20} /> Modul Ajar
              </Link>
              <Link to="/dashboard/teacher/presentations" onClick={closeSidebar} className={navClass('/dashboard/teacher/presentations')}>
                <MonitorPlay size={20} /> Presentasi
              </Link>
              <Link to="/dashboard/study" onClick={closeSidebar} className={navClass('/dashboard/study')}>
                <BookOpenCheck size={20} /> Aplikasi Pembelajaran
              </Link>
              <Link to="/dashboard/calendar" onClick={closeSidebar} className={navClass('/dashboard/calendar')}>
                <CalendarDays size={20} /> Calendar
              </Link>
            </>
          )}
          
          {/* STUDENT MENU */}
          {isStudent && (
            <>
              <Link to="/dashboard/student/courses" onClick={closeSidebar} className={navClass('/dashboard/student/courses')}>
                <Library size={20} /> My Courses
              </Link>
              <Link to="/dashboard/student/attendance" onClick={closeSidebar} className={navClass('/dashboard/student/attendance')}>
                <CalendarCheck size={20} /> Attendance
              </Link>
              <Link to="/dashboard/student/grades" onClick={closeSidebar} className={navClass('/dashboard/student/grades')}>
                <Award size={20} /> Grades
              </Link>
              <Link to="/dashboard/student/announcements" onClick={closeSidebar} className={navClass('/dashboard/student/announcements')}>
                <Megaphone size={20} /> Announcements
              </Link>
              <Link to="/dashboard/study" onClick={closeSidebar} className={navClass('/dashboard/study')}>
                <BookOpenCheck size={20} /> Aplikasi Pembelajaran
              </Link>
              <Link to="/dashboard/assessment/attempts" onClick={closeSidebar} className={navClass('/dashboard/assessment/attempts')}>
                <PlayCircle size={20} /> Ujian Saya
              </Link>
              <Link to="/dashboard/assessment/results" onClick={closeSidebar} className={navClass('/dashboard/assessment/results')}>
                <Award size={20} /> Hasil Ujian
              </Link>
              <Link to="/dashboard/calendar" onClick={closeSidebar} className={navClass('/dashboard/calendar')}>
                <CalendarDays size={20} /> Calendar
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="p-3 md:p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold uppercase flex-shrink-0">
            {user?.email?.charAt(0)}
          </div>
          <div className="truncate min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role?.name}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeSidebar} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left-4 duration-200">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 min-w-0">
        <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-8 shadow-sm flex-shrink-0 gap-3">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 -ml-1"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate">Welcome to {user?.tenant?.name}</h2>
        </header>
        
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating AI Chat (Hanya untuk siswa) */}
      {isStudent && <FloatingAIChat />}
    </div>
  );
};