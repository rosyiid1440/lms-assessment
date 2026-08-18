import React, { Component } from 'react';
import type { ErrorInfo } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50/50">
              <AlertTriangle size={32} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              We're sorry, but an unexpected error occurred in the application. 
              {this.state.error?.message && (
                <span className="block mt-2 px-3 py-2 bg-red-50 text-red-700 text-xs font-mono rounded-lg overflow-x-auto text-left">
                  {this.state.error.message}
                </span>
              )}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                <RefreshCcw size={16} /> Reload Application
              </button>
              <Link 
                to="/dashboard"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
              >
                <Home size={16} /> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
