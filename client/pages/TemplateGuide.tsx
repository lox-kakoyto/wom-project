
import React from 'react';
import { Book, Code, Layers, Image, Video, Palette, Fingerprint, Music, Swords, Trello } from 'lucide-react';

const TemplateExample: React.FC<{ title: string, description: string, code: string, icon?: React.ReactNode }> = ({ title, description, code, icon }) => (
    <div className="mb-10 bg-wom-panel border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 bg-wom-primary/10 border-b border-white/5 flex items-center gap-3">
            {icon || <Code size={20} className="text-wom-accent" />}
            <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <div className="p-6">
            <p className="text-gray-300 mb-4 whitespace-pre-wrap">{description}</p>
            <div className="bg-black/50 p-4 rounded-lg border border-white/10 font-mono text-sm text-green-400 overflow-x-auto whitespace-pre-wrap">
                {code}
            </div>
        </div>
    </div>
);

export const TemplateGuide: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-wom-primary/30">
            <div className="p-4 bg-wom-primary rounded-lg shadow-lg shadow-purple-900/50">
                <Layers size={32} className="text-white" />
            </div>
            <div>
                <h1 className="text-4xl font-display font-bold text-white">Справочник Шаблонов</h1>
                <p className="text-gray-400 mt-2">Руководство по оформлению статей в World of Madness.</p>
            </div>
        </div>

        <div className="prose prose-invert max-w-none mb-12">
            <p className="text-lg text-gray-300">
                Здесь собраны все доступные коды (шаблоны) для украшения ваших статей. Просто скопируйте код и замените текст на свой.
            </p>
        </div>

        {/* SECTION: TABS & INTERACTIVE */}
        <h2 className="text-2xl font-bold text-wom-accent mb-6 flex items-center gap-2 border-t border-white/10 pt-8">
            <Trello className="text-wom-primary" /> Интерактивные Вкладки
        </h2>
        
        <TemplateExample 
            title="Tabber (Переключатель Вкладок)"
            description="Новая система вкладок. Вы можете выбрать один из 4 стилей: classic, cyberpunk, folder, pills. Теперь поддерживает вложенные картинки и видео без дублей!"
            code={`{{Tabber
|style=cyberpunk
|Обычная Форма={{IMG2|File:Base.jpg|center|100%}}
|Супер Форма={{IMG2|File:Super.jpg|center|100%}}
|Видео Битвы={{Video|File:Fight.mp4|center|100%}}
}}`}
        />

        <TemplateExample 
            title="MusicTabber (Музыкальный Плеер)"
            description="Специальный плеер для переключения музыкальных тем персонажа. Не конфликтует с обычным Tabber."
            icon={<Music size={20} className="text-wom-accent" />}
            code={`{{MusicTabber
|Theme 1=File:Theme.mp3
|Battle Theme=File:Battle.mp3
|Sad Theme=File:Sad.mp3
}}`}
        />

        {/* SECTION: BATTLE RESULTS */}
        <h2 className="text-2xl font-bold text-wom-accent mb-6 flex items-center gap-2 border-t border-white/10 pt-8">
            <Swords className="text-wom-primary" /> Результаты Битв (Колизей)
        </h2>
        <p className="text-gray-400 mb-6">Записывайте победы и поражения персонажей. Доступно 3 стиля: classic (таблица), cards (карточки), compact (список).</p>

        <TemplateExample 
            title="BattleResults (Результаты Битв)"
            description="Шаблон для записи рекорда боев. Поддерживает ссылки на противников."
            code={`{{BattleResults
|style=cards
|wins=[[Goku]] (Low Diff), [[Naruto]] (No Diff)
|draws=[[Vegeta]] (Interrupted)
|losses=[[Saitama]] (One Shot)
}}`}
        />

        {/* SECTION: MEDIA */}
        <h2 className="text-2xl font-bold text-wom-accent mb-6 flex items-center gap-2 border-t border-white/10 pt-8">
            <Video className="text-wom-primary" /> Медиа (Видео и GIF)
        </h2>
        <TemplateExample 
            title="Video (Видео MP4)"
            description="Вставка видеофайла. Теперь с красивой рамкой!"
            code={`{{Video|File:Name.mp4|right|300px}}`}
        />
        <TemplateExample 
            title="GIF (Анимация)"
            description="Вставка GIF изображений. Работает аналогично картинкам."
            code={`{{GIF|File:Anime.gif|center|400px}}`}
        />
        <TemplateExample 
            title="Gallery (Галерея)"
            description="Раскрывающийся список изображений. Можно переименовать заголовок."
            code={`{{Gallery|title=Галерея Форм|
File:Form1.jpg
File:Form2.jpg
File:Form3.jpg
}}`}
        />

        {/* SECTION: IDENTIFIERS */}
        <h2 className="text-2xl font-bold text-wom-accent mb-6 flex items-center gap-2 border-t border-white/10 pt-8">
            <Fingerprint className="text-wom-primary" /> Идентификаторы (ID)
        </h2>
        <p className="text-gray-400 mb-6">Выберите один из трех стилей для оформления шапки персонажа.</p>
        
        <TemplateExample 
            title="IDV1: Киберпанк (Техно)"
            description="Стильный цифровой блок с эффектом сканирования. Идеально для роботов, киборгов и sci-fi."
            code={`{{IDV1
|title=PROJECT 01
|name=GENOS
|rank=S-CLASS
|image=File:Genos.jpg
|color=#00eaff
}}`}
        />
        <TemplateExample 
            title="IDV2: Свиток (Мистика)"
            description="Элегантный стиль для магов, фэнтези и божеств. Свечение и двойные рамки."
            code={`{{IDV2
|name=Ainz Ooal Gown
|title=Supreme Being
|image=File:Ainz.jpg
|color=#ffd700
}}`}
        />
        <TemplateExample 
            title="IDV3: Карточка (Модерн)"
            description="Современная карточка с градиентом и статистикой."
            code={`{{IDV3
|name=GOJO SATORU
|image=File:Gojo.jpg
|stats=HP: ∞ | MP: ∞
|bg=#0f0c29
}}`}
        />

        {/* SECTION: DECORATION */}
        <h2 className="text-2xl font-bold text-wom-accent mb-6 flex items-center gap-2 border-t border-white/10 pt-8">
            <Palette className="text-wom-primary" /> Оформление Текста
        </h2>
        <TemplateExample 
            title="Gradient (Градиентный Текст)"
            description="Создание уникального текста способностей или имен. Исправлен баг с выравниванием!"
            code={`{{Gradient|Текст Способности|#ff0000|#0000ff}}`}
        />

        {/* SECTION: STRUCTURE */}
        <h2 className="text-2xl font-bold text-wom-accent mb-6 flex items-center gap-2 border-t border-white/10 pt-8">
            <Layers className="text-wom-primary" /> Структура
        </h2>
        <TemplateExample 
            title="Frame (Универсальная Рамка)"
            description="Настраиваемый блок. Можно менять цвет границ и фона."
            code={`{{Frame
|title=Заголовок
|icon=zap
|border=#ef4444
|bg=#1a0505
|content=Текст внутри рамки...
}}`}
        />

        {/* LEGACY */}
        <h2 className="text-2xl font-bold text-wom-primary mb-6 border-t border-white/10 pt-6">Базовые Шаблоны</h2>
        <TemplateExample 
            title="Infobox (Карточка Персонажа)"
            description="Основная таблица с данными."
            code={`{{Infobox
| name = Имя
| image = File:Avatar.jpg
| origin = Вселенная
| classification = Класс
| age = Возраст
}}`}
        />
    </div>
  );
};