
import React from 'react';
import { Link } from 'react-router-dom';
import { Swords, Image, PenTool, Clock, ArrowRight, BookOpen, Zap, HelpCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export const Dashboard: React.FC = () => {
  const { articles } = useData();

  // Получаем 5 последних статей, сортируя по дате (если даты нет, берем текущую)
  const recentArticles = [...articles]
    .sort((a, b) => {
        const dateA = new Date(a.lastEdited || 0).getTime();
        const dateB = new Date(b.lastEdited || 0).getTime();
        return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="space-y-12 animate-fade-in pb-10">
      
      {/* 1. HERO SECTION: Приветствие */}
      <div className="relative rounded-3xl overflow-hidden bg-wom-panel border border-wom-primary/20 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
         {/* Background Glow */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-wom-primary/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
         
         <div className="relative z-10 max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-wom-text to-wom-primary tracking-tighter mb-4 drop-shadow-lg">
               WORLD OF <br/> MADNESS
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed border-l-4 border-wom-accent pl-4 mb-8">
               Добро пожаловать в энциклопедию безумия. Здесь сильнейшие персонажи вселенных сталкиваются в вечной битве, а их истории записываются в веках.
            </p>
            <div className="flex flex-wrap gap-4">
               <Link to="/wiki" className="px-8 py-3 bg-wom-primary text-white font-bold rounded-xl hover:bg-wom-glow transition-all shadow-lg shadow-wom-primary/30 flex items-center gap-2">
                  <BookOpen size={20} /> Читать Вики
               </Link>
               <Link to="/register" className="px-8 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">
                  <Zap size={20} className="text-yellow-400"/> Присоединиться
               </Link>
            </div>
         </div>

         {/* Decorative Icon */}
         <div className="hidden md:flex relative z-10 items-center justify-center w-64 h-64">
            <div className="absolute inset-0 border-4 border-dashed border-wom-primary/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute inset-4 border-4 border-wom-accent/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
            <Swords size={80} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
         </div>
      </div>

      {/* 2. ONBOARDING GRID: Гайды для новичков */}
      <div>
         <h2 className="text-3xl font-display font-bold text-white mb-6 flex items-center gap-3">
            <HelpCircle className="text-wom-accent" /> Руководство Странника
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Editor */}
            <Link to="/editor" className="group glass-panel p-6 rounded-2xl border border-white/5 hover:border-wom-primary/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <PenTool size={100} />
               </div>
               <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 text-blue-400 group-hover:text-white group-hover:bg-blue-500 transition-colors">
                  <PenTool size={24} />
               </div>
               <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">Создание Статей</h3>
               <p className="text-sm text-gray-400 mb-4">
                  Напиши свой первый профиль. Используй наш мощный редактор и готовые шаблоны для оформления способностей и характеристик.
               </p>
               <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                  Перейти к редактору <ArrowRight size={12} />
               </span>
            </Link>

            {/* Card 2: Media */}
            <Link to="/media" className="group glass-panel p-6 rounded-2xl border border-white/5 hover:border-wom-accent/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Image size={100} />
               </div>
               <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4 text-pink-400 group-hover:text-white group-hover:bg-pink-500 transition-colors">
                  <Image size={24} />
               </div>
               <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-300 transition-colors">Медиа Банк</h3>
               <p className="text-sm text-gray-400 mb-4">
                  Прежде чем добавить картинку в статью, загрузи её сюда. Мы поддерживаем арты, гифки и видео до 12 МБ.
               </p>
               <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1">
                  Загрузить файлы <ArrowRight size={12} />
               </span>
            </Link>

            {/* Card 3: Coliseum */}
            <Link to="/coliseum" className="group glass-panel p-6 rounded-2xl border border-white/5 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Swords size={100} />
               </div>
               <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4 text-red-400 group-hover:text-white group-hover:bg-red-500 transition-colors">
                  <Swords size={24} />
               </div>
               <h3 className="text-xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">Колизей</h3>
               <p className="text-sm text-gray-400 mb-4">
                  Арена для дебатов. Создавай темы "Кто кого?", прикрепляй профили персонажей и обсуждай исходы битв.
               </p>
               <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                  Начать битву <ArrowRight size={12} />
               </span>
            </Link>
         </div>
      </div>

      {/* 3. RECENT UPDATES: Динамический список */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden">
         <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <Clock className="text-green-400" /> Последние изменения
            </h3>
            <Link to="/wiki" className="text-xs text-gray-400 hover:text-white transition-colors">Показать все</Link>
         </div>
         
         <div className="divide-y divide-white/5">
            {recentArticles.length > 0 ? (
               recentArticles.map((article) => (
                  <Link key={article.id} to={`/wiki/${article.slug}`} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group">
                     <div className="w-16 h-16 rounded-lg bg-gray-900 overflow-hidden border border-white/10 shrink-0">
                        {article.imageUrl ? (
                           <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-600 font-display font-bold text-xl">
                              {article.title.charAt(0)}
                           </div>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-white group-hover:text-wom-primary transition-colors truncate">
                           {article.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-xs px-2 py-0.5 bg-wom-primary/10 text-wom-primary rounded border border-wom-primary/20 uppercase tracking-wider">
                              {article.category}
                           </span>
                           <span className="text-xs text-gray-500">
                              Обновлено: {new Date(article.lastEdited).toLocaleDateString()}
                           </span>
                        </div>
                     </div>
                     <ArrowRight size={16} className="text-gray-600 group-hover:text-white transition-colors mr-2" />
                  </Link>
               ))
            ) : (
               <div className="p-12 text-center">
                  <div className="inline-block p-4 rounded-full bg-white/5 mb-4">
                     <BookOpen size={32} className="text-gray-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-300 mb-2">Хроники пусты... пока что.</h4>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                     В этой вселенной еще не записаны легенды. Стань первым, кто увековечит имя героя в истории WOM.
                  </p>
                  <Link to="/editor" className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors">
                     Создать первую статью
                  </Link>
               </div>
            )}
         </div>
      </div>

    </div>
  );
};