'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { 
  BrainCircuit, 
  Target, 
  Timer, 
  CalendarDays, 
  Layers, 
  Activity, 
  Play, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  Download,
  Info,
  Zap,
  ShieldCheck,
  MousePointer2,
  Bot,
  ClipboardList,
  Sparkles,
  Search,
  FileText
} from 'lucide-react';

interface UserGuideProps {
  onClose: () => void;
}

export default function UserGuide({ onClose }: UserGuideProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-8 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" 
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 40 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 40 }} 
        className="relative bg-[#020617] w-full max-w-5xl h-full md:h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl border border-slate-800 overflow-hidden flex flex-col print:h-auto print:static print:border-none print:shadow-none"
      >
        {/* Header - Non-printable controls */}
        <div className="p-6 md:p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BrainCircuit className="text-white" size={24} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Guia StudyFlow</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-bold text-sm"
            >
              <Download size={18} />
              Salvar PDF
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <XCircle size={32} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-20 scrollbar-hide print:overflow-visible print:p-0">
          
          {/* Hero Section */}
          <section className="text-center space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-black uppercase tracking-[0.3em] mb-4"
            >
              Manual do Usuário v2.0
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
              Domine seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Aprendizado.</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              Bem-vindo ao StudyFlow. Este guia ensinará você a utilizar o poder da Revisão Espaçada para nunca mais esquecer o que estuda.
            </p>
          </section>

          {/* Key Concepts Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GuideCard 
              icon={<Zap className="text-amber-400" />}
              title="Revisão Espaçada"
              description="O sistema agenda revisões em 1, 7, 15 e 30 dias, combatendo a Curva do Esquecimento de forma científica."
            />
            <GuideCard 
              icon={<Target className="text-emerald-400" />}
              title="Foco em Dados"
              description="Acompanhe sua taxa de acerto e tempo de estudo para identificar onde você precisa melhorar."
            />
            <GuideCard 
              icon={<ShieldCheck className="text-indigo-400" />}
              title="Controle Total"
              description="Pause conteúdos, pule revisões ou cancele ciclos mensais conforme sua necessidade e ritmo."
            />
          </section>

          {/* Step by Step Sections */}
          <div className="space-y-32">
            
            {/* Step 1 */}
            <StepSection 
              number="01"
              title="Perfil & Concurso"
              description="Personalize sua experiência. Cadastre seu nome e o concurso que está focando. Isso ajuda a manter a motivação e o foco no seu objetivo principal."
              image="https://picsum.photos/seed/profile/800/450"
              highlights={["Cadastro de nome personalizado", "Definição de concurso alvo", "Interface adaptativa"]}
            />

            {/* Step 2 */}
            <StepSection 
              number="02"
              title="Editais & Robozinho de Concursos"
              description="Nossa IA ajuda você a encontrar e organizar editais. Use o 'Robozinho' para buscar concursos abertos baseados no seu perfil de interesse e nível de escolaridade."
              image="https://picsum.photos/seed/ai-search/800/450"
              reverse
              highlights={["Busca automática de concursos", "Extração de datas e salários", "Verticalização instantânea de PDF"]}
            />

            {/* Step 3 */}
            <StepSection 
              number="03"
              title="Simulados Inteligentes"
              description="Teste seus conhecimentos com questões geradas por IA. Escolha a matéria e a quantidade de questões. Receba feedback imediato e explicações detalhadas para cada alternativa."
              image="https://picsum.photos/seed/simulados/800/450"
              highlights={["Questões inéditas por IA", "Explicações pedagógicas", "Histórico de desempenho por matéria"]}
            />

            {/* Step 4 */}
            <StepSection 
              number="04"
              title="Cadastrando Conteúdo"
              description="Tudo começa com o registro. Insira o título e a categoria. O sistema criará automaticamente todo o cronograma de revisões futuras (1d, 7d, 15d, 30d) para você."
              image="https://picsum.photos/seed/study1/800/450"
              reverse
              highlights={["Cálculo automático de datas", "Categorização por cores", "Ciclo de revisão completo"]}
            />

            {/* Step 5 */}
            <StepSection 
              number="05"
              title="A Sessão de Estudo"
              description="Ao iniciar uma tarefa, o cronômetro começa. Use este tempo para foco total. Ao terminar, registre seu desempenho em questões para alimentar suas estatísticas."
              image="https://picsum.photos/seed/study2/800/450"
              highlights={["Timer integrado", "Registro de questões/acertos", "Nível de dificuldade"]}
            />

            {/* Step 6 */}
            <StepSection 
              number="06"
              title="Dashboard & Analytics"
              description="Sua central de comando. Veja gráficos de produtividade semanal e a distribuição do seu tempo entre as matérias. Agora com separação entre novos estudos e revisões."
              image="https://picsum.photos/seed/study3/800/450"
              reverse
              highlights={["Gráficos interativos", "Métricas de precisão", "Calendário mensal"]}
            />

            {/* Step 7 */}
            <StepSection 
              number="07"
              title="Segurança & Acesso"
              description="Seus dados estão protegidos. O sistema exige login e oferece recuperação de senha via e-mail cadastrado no seu perfil."
              image="https://picsum.photos/seed/security/800/450"
              reverse
              highlights={["Login obrigatório", "Recuperação de senha por e-mail", "Privacidade total"]}
            />

          </div>

          {/* Pro Tips */}
          <section className="bg-indigo-600 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative z-10 space-y-8">
              <h3 className="text-3xl md:text-4xl font-black tracking-tight">Dicas de Especialista 💡</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <h4 className="font-black text-xl">Não acumule revisões</h4>
                  <p className="text-indigo-100 font-medium">O segredo da revisão espaçada é a constância. Tente limpar sua lista de &apos;Hoje&apos; todos os dias.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-xl">Use as observações</h4>
                  <p className="text-indigo-100 font-medium">Anote o que você errou. Na próxima revisão, leia suas notas antes de começar os exercícios.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-xl">Pause, não apague</h4>
                  <p className="text-indigo-100 font-medium">Se uma matéria saiu do seu foco temporário, use o botão &apos;Pausar&apos;. Seus dados ficarão salvos para quando voltar.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-xl">Analise sua precisão</h4>
                  <p className="text-indigo-100 font-medium">Se a precisão estiver abaixo de 70%, considere revisar a teoria base antes de seguir para novas questões.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer Guide */}
          <footer className="text-center py-20 border-t border-slate-800">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-4">StudyFlow - Sistema de Revisão Inteligente</p>
            <p className="text-slate-600 text-xs">© 2026 Todos os direitos reservados. Estude com inteligência.</p>
          </footer>

        </div>
      </motion.div>
    </div>
  );
}

function GuideCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-4 hover:border-indigo-500/30 transition-all">
      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <h4 className="text-xl font-black text-white">{title}</h4>
      <p className="text-slate-400 font-medium leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function StepSection({ number, title, description, image, highlights, reverse = false }: { number: string; title: string; description: string; image: string; highlights: string[]; reverse?: boolean }) {
  return (
    <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 items-center`}>
      <div className="flex-1 space-y-6">
        <span className="text-6xl font-black text-slate-800 tracking-tighter">{number}</span>
        <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">{title}</h3>
        <p className="text-slate-400 text-lg font-medium leading-relaxed">{description}</p>
        <ul className="space-y-3">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-center gap-3 text-slate-300 font-bold">
              <div className="w-5 h-5 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={12} />
              </div>
              {h}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 w-full">
        <div className="aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative group">
          <Image 
            src={image} 
            alt={title} 
            fill 
            className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <MousePointer2 size={16} className="text-white" />
             </div>
             <span className="text-[10px] font-black text-white uppercase tracking-widest bg-slate-950/50 backdrop-blur px-3 py-1 rounded-full">Interface do Sistema</span>
          </div>
        </div>
      </div>
    </div>
  );
}
