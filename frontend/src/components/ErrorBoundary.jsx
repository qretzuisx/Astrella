import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Log the error - keep console logging for developer visibility
    // In production you could send this to an error reporting service
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 24, textAlign: 'center'}}>
          <h1>Something went wrong.</h1>
          <p>Try reloading the page or contact support if the issue persists.</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
