import React from 'react';
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export const SafeHtml = ({ html, className = '' }: SafeHtmlProps) => {
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'pre', 'code', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class']
  });

  return (
    <div 
      className={`prose max-w-none ${className}`} 
      dangerouslySetInnerHTML={{ __html: cleanHtml }} 
    />
  );
};
