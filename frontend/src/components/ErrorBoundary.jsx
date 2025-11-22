import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    // You can also log the error to an external service here
    // console.error('Caught by ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-3xl w-full bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-4">The application encountered an error while rendering. See details below.</p>
            <div className="mb-4 p-3 bg-gray-100 rounded text-xs overflow-auto" style={{maxHeight: '40vh'}}>
              <pre className="whitespace-pre-wrap">{this.state.error && this.state.error.toString()}</pre>
              <pre className="whitespace-pre-wrap mt-2 text-xs text-gray-700">{this.state.errorInfo?.componentStack}</pre>
            </div>
            <div className="flex gap-3">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded">Reload</button>
              <button onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} className="px-4 py-2 border rounded">Dismiss</button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
