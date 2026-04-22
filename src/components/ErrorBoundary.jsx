import React from 'react';
import { AlertTriangle, RefreshCcw, WifiOff } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('Network') ||
        this.state.error?.message?.includes('fetch') ||
        !navigator.onLine;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isNetworkError ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
              {isNetworkError ? <WifiOff size={40} /> : <AlertTriangle size={40} />}
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {isNetworkError ? 'Sem Conexão' : 'Oops! Algo correu mal.'}
            </h2>

            <p className="text-gray-500 mb-8 font-medium">
              {isNetworkError
                ? 'Verifica a tua internet. O JovemSTP precisa de conexão para carregar novos conteúdos.'
                : 'Detectámos um erro inesperado. A nossa equipa técnica já foi notificada.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw size={20} />
                Tentar Novamente
              </button>

              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all"
              >
                Tentar Ignorar Erro
              </button>
            </div>

            {import.meta.env.MODE === 'development' && (
              <div className="mt-8 text-left bg-gray-900 text-green-400 p-4 rounded-xl overflow-auto text-xs font-mono max-h-40">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
