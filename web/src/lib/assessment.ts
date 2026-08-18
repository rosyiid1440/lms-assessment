import { api } from './axios';

export const assessmentApi = {
  // Categories
  listCategories: (params?: Record<string, any>) => api.get('/assessment/categories', { params }),
  createCategory: (data: any) => api.post('/assessment/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/assessment/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/assessment/categories/${id}`),

  // Tags
  listTags: () => api.get('/assessment/tags'),
  createTag: (data: any) => api.post('/assessment/tags', data),
  deleteTag: (id: string) => api.delete(`/assessment/tags/${id}`),

  // Questions
  listQuestions: (params?: Record<string, any>) => api.get('/assessment/questions', { params }),
  getQuestion: (id: string) => api.get(`/assessment/questions/${id}`),
  createQuestion: (data: any) => api.post('/assessment/questions', data),
  updateQuestion: (id: string, data: any) => api.put(`/assessment/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete(`/assessment/questions/${id}`),
  duplicateQuestion: (id: string) => api.post(`/assessment/questions/${id}/duplicate`),
  setQuestionStatus: (id: string, status: string) => api.post(`/assessment/questions/${id}/status`, { status }),
  listVersions: (id: string) => api.get(`/assessment/questions/${id}/versions`),
  restoreVersion: (id: string, version: number) => api.post(`/assessment/questions/${id}/versions/${version}/restore`),
  importQuestions: (rows: any[]) => api.post('/assessment/questions/import', { rows }),
  exportQuestions: (params?: Record<string, any>) => api.get('/assessment/questions/export', { params }),

  // Assessments
  listAssessments: (params?: Record<string, any>) => api.get('/assessment/assessments', { params }),
  getAssessment: (id: string) => api.get(`/assessment/assessments/${id}`),
  createAssessment: (data: any) => api.post('/assessment/assessments', data),
  updateAssessment: (id: string, data: any) => api.put(`/assessment/assessments/${id}`, data),
  deleteAssessment: (id: string) => api.delete(`/assessment/assessments/${id}`),
  setAssessmentStatus: (id: string, status: string) => api.post(`/assessment/assessments/${id}/status`, { status }),
  attachQuestions: (id: string, questionIds: string[], points?: number) =>
    api.post(`/assessment/assessments/${id}/questions`, { questionIds, points }),
  removeQuestion: (assessmentId: string, questionId: string) =>
    api.delete(`/assessment/assessments/${assessmentId}/questions/${questionId}`),
  addPoolRule: (id: string, data: any) => api.post(`/assessment/assessments/${id}/pool-rules`, data),
  removePoolRule: (id: string, ruleId: string) => api.delete(`/assessment/assessments/${id}/pool-rules/${ruleId}`),

  // Analytics / results
  getAnalytics: (id: string) => api.get(`/assessment/assessments/${id}/analytics`),
  refreshAnalytics: (id: string) => api.post(`/assessment/assessments/${id}/analytics/refresh`),
  listResults: (id: string, params?: Record<string, any>) => api.get(`/assessment/assessments/${id}/results`, { params }),

  // Review / grading
  listReviewable: (params?: Record<string, any>) => api.get('/assessment/reviews', { params }),
  listPendingByAttempt: (attemptId: string) => api.get(`/assessment/attempts/${attemptId}/reviews`),
  gradeAnswer: (attemptId: string, questionId: string, data: any) =>
    api.post(`/assessment/attempts/${attemptId}/questions/${questionId}/grade`, data),
  bulkGrade: (items: any[]) => api.post('/assessment/reviews/bulk', { items }),

  // Student
  listStudentAssessments: (params?: Record<string, any>) => api.get('/assessment/my/assessments', { params }),
  startAttempt: (assessmentId: string) => api.post(`/assessment/assessments/${assessmentId}/start`),
  resumeAttempt: (attemptId: string) => api.post(`/assessment/attempts/${attemptId}/resume`),
  saveAnswer: (attemptId: string, questionRefId: string, data: any) =>
    api.put(`/assessment/attempts/${attemptId}/questions/${questionRefId}/answer`, data),
  submitAttempt: (attemptId: string) => api.post(`/assessment/attempts/${attemptId}/submit`),
  listStudentResults: (params?: Record<string, any>) => api.get('/assessment/my/results', { params }),
};
