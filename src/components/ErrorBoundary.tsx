import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[250px] p-6 m-4 bg-white border border-red-200 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-zinc-900 text-base">Ocorreu um imprevisto ao carregar este conteúdo</h3>
          <p className="text-xs text-zinc-600 max-w-md mx-auto">
            {this.props.fallbackMessage || "Ocorreu um erro temporário de renderização. Você pode tentar novamente ou atualizar a página."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
