import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket,
  Users,
  Briefcase,
  ChevronRight,
  CheckCircle2,
  Globe,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Star,
  Instagram
} from "lucide-react";
import { db, functions } from "../services/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({
    youngCount: null,
    jobCount: null,
    companyCount: null,
    loading: true
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    console.log("🚀 LandingPage initialized - Fetching live stats via Cloud Functions...");
    const fetchStats = async () => {
      try {
        const response = await fetch("https://v4-getlandingstats-u74la5akbq-uc.a.run.app");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        setStats({
          youngCount: data.youngCount,
          jobCount: data.jobCount,
          companyCount: data.companyCount,
          loading: false
        });
      } catch (error) {
        console.error("Error fetching landing stats via function:", error);

        // Fallback to direct Firestore (will only work if logged in)
        try {
          const usersRef = collection(db, 'users');
          const jobsRef = collection(db, 'jobs');
          const [youngSnap, jobSnap, companySnap] = await Promise.all([
            getCountFromServer(query(usersRef, where('type', '==', 'young'))),
            getCountFromServer(query(jobsRef, where('status', '==', 'active'))),
            getCountFromServer(query(usersRef, where('type', '==', 'company')))
          ]);
          setStats({
            youngCount: youngSnap.data().count,
            jobCount: jobSnap.data().count,
            companyCount: companySnap.data().count,
            loading: false
          });
        } catch (fbError) {
          console.warn("Firestore fallback also failed:", fbError.message);
          setStats(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchStats();
  }, []);

  const formatStat = (num, fallback) => {
    if (num === null) return fallback;
    return num >= 1000 ? `+${(num / 1000).toFixed(1)}k` : `+${num}`;
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] selection:bg-green-100 selection:text-green-900">

      {/* --- Navbar --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
        }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-[var(--color-cta)] rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
              <Rocket className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-primary)]">Jovens<span className="text-[var(--color-cta)]">STP</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--color-secondary)]">
            <a href="#funcionalidades" className="hover:text-[var(--color-cta)] transition-colors cursor-pointer">Funcionalidades</a>
            <a href="#empresas" className="hover:text-[var(--color-cta)] transition-colors cursor-pointer">Para Empresas</a>
            <button
              onClick={() => navigate("/login")}
              className="text-[var(--color-primary)] hover:text-[var(--color-cta)] transition-colors cursor-pointer"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="bg-[var(--color-cta)] text-white px-6 py-2.5 rounded-full hover:opacity-90 transition-all shadow-md shadow-green-100 active:scale-95 cursor-pointer font-bold"
            >
              Criar Conta
            </button>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-green-50 rounded-full blur-[120px] opacity-60"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[50%] bg-blue-50 rounded-full blur-[100px] opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 animate-fade-in shadow-sm border border-green-100">
            <Star size={12} className="fill-green-600" />
            <span>A Rede Profissional nº 1 de São Tomé 🇸🇹</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-[var(--color-primary)] leading-[1.1] mb-6 tracking-tight">
            O seu futuro profissional <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
              começa aqui.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Conectamos os jovens talentos de São Tomé às melhores empresas, cursos e oportunidades de crescimento. Tudo num só lugar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto bg-[var(--color-cta)] text-white px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-green-200 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
            >
              Começar Agora
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto bg-white text-[var(--color-primary)] border border-gray-100 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              Explorar Vagas
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-y border-gray-100">
            <div className="group">
              <p className={`text-4xl font-extrabold text-[var(--color-primary)] leading-none mb-2 transition-all ${stats.loading ? "opacity-30 blur-sm" : "opacity-100 blur-0"}`}>
                {formatStat(stats.youngCount, "---")}
              </p>
              <p className="text-xs text-[var(--color-secondary)] font-bold uppercase tracking-wider">Jovens Ativos</p>
            </div>
            <div className="group">
              <p className={`text-4xl font-extrabold text-[var(--color-primary)] leading-none mb-2 transition-all ${stats.loading ? "opacity-30 blur-sm" : "opacity-100 blur-0"}`}>
                {formatStat(stats.jobCount, "---")}
              </p>
              <p className="text-xs text-[var(--color-secondary)] font-bold uppercase tracking-wider">Vagas Ativas</p>
            </div>
            <div className="group">
              <p className={`text-4xl font-extrabold text-[var(--color-primary)] leading-none mb-2 transition-all ${stats.loading ? "opacity-30 blur-sm" : "opacity-100 blur-0"}`}>
                {formatStat(stats.companyCount, "---")}
              </p>
              <p className="text-xs text-[var(--color-secondary)] font-bold uppercase tracking-wider">Empresas</p>
            </div>
            <div className="group">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-4xl font-extrabold text-[var(--color-primary)] leading-none">100%</p>
                <div className="w-6 h-4 bg-green-600 rounded-sm overflow-hidden flex flex-col">
                  <div className="h-1/3 bg-green-600"></div>
                  <div className="h-1/3 bg-yellow-400"></div>
                  <div className="h-1/3 bg-green-600"></div>
                </div>
              </div>
              <p className="text-xs text-[var(--color-secondary)] font-bold uppercase tracking-wider">Santomense</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Why JovensSTP? --- */}
      <section id="funcionalidades" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[var(--color-primary)] mb-4">Desenvolvido para STP</h2>
            <p className="text-[var(--color-secondary)] max-w-xl mx-auto font-medium">Pensado nos desafios e conquistas reais do nosso mercado local.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                <Briefcase size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Emprego Facilitado</h3>
              <p className="text-[var(--color-secondary)] text-sm leading-relaxed mb-6 font-medium">
                Candidaturas rápidas e diretas. Nada de burocracia, apenas oportunidades.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <CheckCircle2 size={16} className="text-green-500" /> Alertas em tempo real
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <CheckCircle2 size={16} className="text-green-500" /> Chat direto com RH
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer">
              <div className="w-14 h-14 bg-blue-50 text-[var(--color-accent)] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[var(--color-accent)] group-hover:text-white transition-all duration-300">
                <Cpu size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Academia Inteligente</h3>
              <p className="text-[var(--color-secondary)] text-sm leading-relaxed mb-6 font-medium">
                Aprenda rápido com cursos verificados e resumos gerados por IA.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <CheckCircle2 size={16} className="text-[var(--color-accent)]" /> <span>Resumos com <b>IA</b></span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <CheckCircle2 size={16} className="text-[var(--color-accent)]" /> Cursos Práticos
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <Globe size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Rede & Mentoria</h3>
              <p className="text-[var(--color-secondary)] text-sm leading-relaxed mb-6 font-medium">
                Conecte-se com os melhores profissionais e mentores de São Tomé.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <CheckCircle2 size={16} className="text-purple-500" /> Mentoria Profissional
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <CheckCircle2 size={16} className="text-purple-500" /> Networking Local
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- For Companies Section --- */}
      <section id="empresas" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-[var(--color-primary)] rounded-[3rem] p-10 md:p-20 overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-[40%] h-full bg-green-500/10 blur-[100px] -z-0"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight font-heading">
                  Encontre os melhores talentos de STP
                </h2>
                <p className="text-gray-400 text-lg mb-10 max-w-lg font-medium leading-relaxed">
                  Simplificamos o recrutamento. Publique vagas, valide competências e faça a triagem de forma inteligente.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <button className="w-full sm:w-auto bg-white text-[var(--color-primary)] px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg">
                    Recrutar Talentos
                    <ArrowRight size={20} />
                  </button>
                  <div className="flex flex-col justify-center text-left px-6 py-2 border-l border-white/10 hidden sm:flex">
                    <span className="text-green-500 text-sm font-black flex items-center gap-2">
                      <ShieldCheck size={18} /> 100% VERIFICADO
                    </span>
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Candidatos Reais</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-colors">
                  <TrendingUp className="text-green-500 mb-6 w-8 h-8" />
                  <h4 className="text-white text-xl font-bold mb-2">Escalabilidade</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-medium">Acesso a uma base crescente de jovens prontos para trabalhar.</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-colors mt-0 sm:mt-12">
                  <Users className="text-blue-500 mb-6 w-8 h-8" />
                  <h4 className="text-white text-xl font-bold mb-2">Gestão Ágil</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-medium">Painel intuitivo para gerir candidaturas e entrevistas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-white pt-24 pb-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Rocket className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight">JovensSTP</span>
              </div>
              <p className="text-[var(--color-secondary)] text-sm max-w-sm leading-relaxed font-medium">
                Conectando a nova geração de profissionais de São Tomé e Príncipe às oportunidades que definem o futuro.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <h5 className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-400">Plataforma</h5>
              <div className="flex flex-col gap-4 text-sm font-bold text-[var(--color-secondary)]">
                <a href="#" className="hover:text-[var(--color-cta)] transition-colors">Sobre Nós</a>
                <a href="#funcionalidades" className="hover:text-[var(--color-cta)] transition-colors">Funcionalidades</a>
                <a href="#" className="hover:text-[var(--color-cta)] transition-colors">Academia</a>
                <a href="#" className="hover:text-[var(--color-cta)] transition-colors">Mentoria</a>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <h5 className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-400">Recursos</h5>
              <div className="flex flex-col gap-4 text-sm font-bold text-[var(--color-secondary)]">
                <button onClick={() => navigate("/privacy")} className="text-left hover:text-[var(--color-cta)] transition-colors cursor-pointer bg-transparent border-none p-0 inline">Privacidade</button>
                <button onClick={() => navigate("/terms")} className="text-left hover:text-[var(--color-cta)] transition-colors cursor-pointer bg-transparent border-none p-0 inline">Termos</button>
                <a href="#" className="hover:text-[var(--color-cta)] transition-colors">Blog</a>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">© 2026 JovensSTP. Made in São Tomé 🇸🇹</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-[var(--color-primary)] transition-all transform hover:scale-110"><Globe size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-[var(--color-primary)] transition-all transform hover:scale-110"><Instagram size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-[var(--color-primary)] transition-all transform hover:scale-110"><Briefcase size={20} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
