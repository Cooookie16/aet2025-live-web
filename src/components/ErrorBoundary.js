'use client';

import React from 'react';

/**
 * 通用 Error Boundary。任何子樹拋錯時改顯示 fallback。
 * 提供 onError 回呼，可上報或記錄。
 *
 * 使用：
 *   <ErrorBoundary fallback={<div>Reconnecting...</div>}>
 *     <Page />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === 'function') {
      try { this.props.onError(error, errorInfo); } catch {}
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback, renderFallback } = this.props;
      if (typeof renderFallback === 'function') {
        return renderFallback(this.state.error);
      }
      return fallback ?? null;
    }
    return this.props.children;
  }
}
