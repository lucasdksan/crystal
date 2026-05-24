import { runAnalysis } from "@/backend/actions/analysis";
import { mapAnalysisResultToDashboard } from "@/frontend/lib/mapper";
import { Dashboard } from "@/frontend/components/Dashboard";
import { AlertOctagon, RefreshCw } from "lucide-react";

export default async function Page() {
  const result = await runAnalysis();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-[#fafbfe] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-100 shadow-sm p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto">
            <AlertOctagon className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900 font-sans">
              Falha ao Carregar a Análise
            </h1>
            <p className="text-sm text-slate-500 font-sans leading-relaxed">
              Não foi possível buscar os dados da VTEX ou executar o pipeline de
              análise.
            </p>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 text-left">
            <span className="text-xs font-mono text-rose-700 font-semibold block mb-1">
              Detalhes do erro:
            </span>
            <p className="text-xs text-rose-600 font-mono wrap-break-word">
              {result.error}
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold font-sans transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </a>
        </div>
      </div>
    );
  }

  const dashboardData = mapAnalysisResultToDashboard(result.data);

  return <Dashboard initialData={dashboardData} />;
}
