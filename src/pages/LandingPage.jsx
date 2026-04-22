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
  Instagram,
  MessageCircle,
  Lightbulb,
  Zap
} from "lucide-react";
import { db } from "../services/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";

const STPFlag = ({ className = "w-6 h-4" }) => (
  <svg viewBox="0 0 28 14" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="14" fill="#009739"/>
    <rect y="3.5" width="28" height="7" fill="#FFD100"/>
    <polygon points="0,0 10,7 0,14" fill="#D21034"/>
    <path d="M16 7l.882 2.714H19.72l-2.295 1.667.876 2.714L16 12.428l-2.3 1.667.876-2.714-2.295-1.667h2.836z" transform="translate(0, -3.5)" fill="black"/>
    <path d="M23 7l.882 2.714H26.72l-2.295 1.667.876 2.714L23 12.428l-2.3 1.667.876-2.714-2.295-1.667h2.836z" transform="translate(0, -3.5)" fill="black"/>
  </svg>
);

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
        // Fallback to direct Firestore
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
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
        }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
              <Rocket className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#003B32]">Jovens<span className="text-green-600">STP</span></span>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-gray-600">
            <button onClick={() => navigate("/blog")} className="hover:text-green-600 transition-colors cursor-pointer bg-transparent border-none">Blog</button>
            <a href="#funcionalidades" className="hover:text-green-600 transition-colors">Funcionalidades</a>
            <a href="#empresas" className="hover:text-green-600 transition-colors">Empresas</a>
            <div className="h-4 w-[1px] bg-gray-200 mx-2"></div>
            <button
              onClick={() => navigate("/login")}
              className="text-[#003B32] hover:text-green-600 transition-colors cursor-pointer"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="bg-green-600 text-white px-7 py-3 rounded-2xl hover:bg-[#005a4d] transition-all shadow-xl shadow-green-200/50 active:scale-95 cursor-pointer"
            >
              Criar Conta
            </button>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-green-50 rounded-full blur-[120px] opacity-60"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[50%] bg-blue-50 rounded-full blur-[100px] opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 animate-bounce-slow shadow-sm border border-green-100">
            <Zap size={14} className="fill-green-600" />
            <div className="flex items-center gap-2">
              <span>O Ecossistema de Inovação de São Tomé</span>
              <STPFlag className="w-5 h-3 rounded-[2px] shadow-sm" />
            </div>
          </div>

          <h1 className="text-5xl md:text-8xl font-black text-[#003B32] leading-[1] mb-8 tracking-tighter">
            O seu talento cria <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400">
              o futuro de STP.
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-gray-500 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
            Conectamos os jovens mais brilhantes às melhores empresas, conhecimento prático e uma rede global sem fronteiras linguísticas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto bg-[#003B32] text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-black transition-all flex items-center justify-center gap-3 group active:scale-[0.98] cursor-pointer shadow-2xl shadow-green-900/10"
            >
              Começar Agora
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/blog")}
              className="w-full sm:w-auto bg-white text-[#003B32] border-2 border-gray-100 px-12 py-5 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="text-green-600" />
              Explorar o Blog
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-10 py-12 border-y border-gray-100">
            {[
              { label: "Jovens Ativos", value: formatStat(stats.youngCount, "---") },
              { label: "Vagas Ativas", value: formatStat(stats.jobCount, "---") },
              { label: "Empresas", value: formatStat(stats.companyCount, "---") },
              { label: "Santomense", value: "100%", isBadge: true }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-4xl md:text-5xl font-black text-[#003B32] ${stats.loading && !stat.isBadge ? "opacity-30 blur-sm" : ""}`}>
                    {stat.value}
                  </span>
                  {stat.isBadge && (
                    <STPFlag className="w-8 h-5 rounded-sm shadow-md" />
                  )}
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="funcionalidades" className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-[#003B32] mb-6">Desenvolvido para Evoluir</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium italic">"O segredo do futuro é a conexão entre o que sabemos e quem somos."</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Card 1: Mural */}
            <div className="group bg-gradient-to-b from-gray-50 to-white p-10 rounded-[3rem] border border-gray-100 hover:border-green-200 transition-all cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-green-200 group-hover:rotate-6 transition-transform">
                <Sparkles className="text-white w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-[#003B32]">Blog & Sabedoria</h3>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Partilha a tua voz com o mundo. Quer escrevas ou prefiras <b>falar para a nossa IA transcrever</b>, o teu conhecimento em cultura, finanças ou tecnologia será lido em qualquer idioma com a nossa <b>tradução instantânea</b>.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-bold text-gray-400"><CheckCircle2 className="text-green-500" /> Transcrição por Voz & IA</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-400"><CheckCircle2 className="text-green-500" /> Tradução Global Automática</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-400"><CheckCircle2 className="text-green-500" /> Cultura, Tech, Finanças & Mais</li>
              </ul>
            </div>

            {/* Card 2: Academia */}
            <div className="group bg-gradient-to-b from-gray-50 to-white p-10 rounded-[3rem] border border-gray-100 hover:border-green-200 transition-all cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 bg-[#003B32] rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:-rotate-6 transition-transform">
                <Lightbulb className="text-white w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-[#003B32]">Academia Colaborativa</h3>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Onde o saber é partilhado sem filtros. <b>Grava as tuas sessões</b>, publica recursos valiosos e contribui diretamente para o crescimento de outros jovens. Um espaço feito por nós, para nós.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-bold text-gray-400"><CheckCircle2 className="text-green-500" /> Partilha de Sessões & Reuniões</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-400"><CheckCircle2 className="text-green-500" /> Publicação de Recursos Úteis</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-400"><CheckCircle2 className="text-green-500" /> Mentoria Comunitária Direta</li>
              </ul>
            </div>

            {/* Card 3: Chat */}
            <div className="group bg-gradient-to-b from-gray-50 to-white p-10 rounded-[3rem] border border-gray-100 hover:border-green-200 transition-all cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Globe className="text-white w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-[#003B32]">Chat Sem Fronteiras</h3>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Comunica com parceiros globais. O nosso sistema traduz as tuas mensagens instantaneamente para qualquer língua.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-bold text-gray-400"><CheckCircle2 className="text-green-500" /> Tradução em Real-Time</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-400"><CheckCircle2 className="text-green-500" /> Conexão Internacional</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- Companies Section --- */}
      <section id="empresas" className="py-32 bg-[#003B32] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-green-500/5 blur-[120px]"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 text-green-400 text-xs font-black uppercase tracking-widest mb-6 border border-green-400/20 px-4 py-2 rounded-full">
                <ShieldCheck size={16} />
                <span>Recrutamento de Elite</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.1]">
                Encontre o talento que se destaca.
              </h2>
              <p className="text-gray-400 text-xl mb-12 max-w-xl leading-relaxed">
                Descubra candidatos através dos seus contributos no Blog. Recrute jovens validados pela comunidade e por perícia real.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 items-center">
                <button
                   onClick={() => navigate("/signup")}
                   className="w-full sm:w-auto bg-green-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  Recrutar Talentos
                  <ArrowRight size={20} />
                </button>
                <div className="flex flex-col text-left px-8 py-2 border-l border-white/10">
                  <span className="text-white text-lg font-black">100% Verificado</span>
                  <span className="text-gray-500 text-xs font-bold uppercase">Candidatos Reais de STP</span>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
               <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] hover:bg-white/10 transition-all group">
                  <TrendingUp className="text-green-500 mb-6 w-10 h-10 group-hover:scale-125 transition-transform" />
                  <h4 className="text-white text-2xl font-black mb-4">Visibilidade</h4>
                  <p className="text-gray-400 leading-relaxed">Sua empresa ligada diretamente à maior base de talentos qualificados de STP.</p>
               </div>
               <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] hover:bg-white/10 transition-all group lg:mt-12">
                  <Users className="text-blue-400 mb-6 w-10 h-10 group-hover:scale-125 transition-transform" />
                  <h4 className="text-white text-2xl font-black mb-4">Gestão Ágil</h4>
                  <p className="text-gray-400 leading-relaxed">Analise perfis completos, portfólios e artigos de candidatos de forma centralizada.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-white pt-32 pb-16 border-t border-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-24">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-[#003B32] rounded-xl flex items-center justify-center">
                  <Rocket className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-[#003B32]">JovensSTP</span>
              </div>
              <p className="text-gray-500 text-lg max-w-sm leading-relaxed font-medium">
                Dando voz e oportunidades à nova geração que está a transformar São Tomé e Príncipe.
              </p>
              <div className="mt-8 flex gap-5">
                <a href="#" className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-600 transition-all"><Instagram size={20} /></a>
                <a href="#" className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-600 transition-all"><Globe size={20} /></a>
              </div>
            </div>

            <div>
              <h5 className="font-black text-[11px] uppercase tracking-[0.2em] text-[#003B32] mb-8">Plataforma</h5>
              <div className="flex flex-col gap-5 text-gray-500 font-bold">
                <button onClick={() => navigate("/blog")} className="text-left hover:text-green-600 transition-colors">Blog & Conhecimento</button>
                <button onClick={() => navigate("/academy")} className="text-left hover:text-green-600 transition-colors">Academia</button>
                <button onClick={() => navigate("/talents")} className="text-left hover:text-green-600 transition-colors">Encontrar Talentos</button>
                <button onClick={() => navigate("/jobs")} className="text-left hover:text-green-600 transition-colors">Ver Vagas</button>
              </div>
            </div>

            <div>
              <h5 className="font-black text-[11px] uppercase tracking-[0.2em] text-[#003B32] mb-8">Suporte</h5>
              <div className="flex flex-col gap-5 text-gray-500 font-bold">
                <button onClick={() => navigate("/privacy")} className="text-left hover:text-green-600 transition-colors">Privacidade</button>
                <button onClick={() => navigate("/terms")} className="text-left hover:text-green-600 transition-colors">Termos de Uso</button>
                <button className="text-left hover:text-green-600 transition-colors">Contactar Suporte</button>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-black uppercase tracking-widest">© 2026 JovensSTP x MIT Engineer.</span>
              <STPFlag className="w-4 h-2 opacity-60" />
            </div>
            <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 text-[10px] font-black text-gray-400">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               SYSTEM ONLINE V1.0.3
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
