import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { api } from '../../lib/axios';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export const FloatingAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Halo! Saya asisten AI sekolah. Ada yang bisa saya bantu hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await api.post('/ai/student-chat', { messages: newMessages });
      setMessages([...newMessages, { role: 'model', content: res.data.text }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'model', content: 'Maaf, saya sedang mengalami kendala jaringan. Coba lagi nanti ya.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 hover:scale-105 transition-all focus:outline-none"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '500px', maxHeight: '80vh' }}>
          {/* Header */}
          <div className="bg-purple-600 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <h3 className="font-semibold text-sm">Asisten AI Sekolah</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-purple-100 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-sm'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 border border-gray-200 shadow-sm rounded-2xl rounded-tl-sm px-4 py-2 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Mengetik...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik pesan..."
                className="flex-1 px-4 py-2 bg-gray-100 border-transparent rounded-full text-sm focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-purple-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
