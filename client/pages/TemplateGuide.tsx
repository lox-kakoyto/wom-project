
import React from 'react';
import { Book, Code, Layers } from 'lucide-react';

const TemplateExample: React.FC<{ title: string, description: string, code: string }> = ({ title, description, code }) => (
    <div className="mb-10 bg-wom-panel border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 bg-wom-primary/10 border-b border-white/5 flex items-center gap-3">
            <Code size={20} className="text-wom-accent" />
            <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <div className="p-6">
            <p className="text-gray-300 mb-4">{description}</p>
            <div className="bg-black/50 p-4 rounded-lg border border-white/10 font-mono text-sm text-green-400 overflow-x-auto whitespace-pre-wrap">
                {code}
            </div>
        </div>
    </div>
);

export const TemplateGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-wom-primary/30">
            <div className="p-4 bg-wom-primary rounded-lg shadow-lg shadow-purple-900/50">
                <Layers size={32} className="text-white" />
            </div>
            <div>
                <h1 className="text-4xl font-display font-bold text-white">Справочник Шаблонов</h1>
                <p className="text-gray-400 mt-2">Руководство по использованию специальных вики-кодов для оформления статей.</p>
            </div>
        </div>

        <div className="prose prose-invert max-w-none mb-12">
            <p className="text-lg text-gray-300">
                Шаблоны (Templates) — это специальные конструкции в двойных фигурных скобках <code>{'{{...}}'}</code>, которые позволяют добавлять сложные элементы на страницу.
            </p>
        </div>

        <h2 className="text-2xl font-bold text-wom-accent mb-6">Новые Шаблоны (WOM Exclusives)</h2>

        <TemplateExample 
            title="Frame (Универсальная Рамка)"
            description="Заменяет шаблоны рамок с эмблемами. Позволяет создать красивый контейнер с заголовком и иконкой."
            code={`{{Frame
|title=Особые Навыки
|content=Здесь идет описание навыков...
|icon=zap
|border=#ef4444}}

Параметры:
icon: box, shield, zap, skull, crown
border: hex код цвета (например #ff0000)`}
        />

        <TemplateExample 
            title="HoverImage (Смена Картинки)"
            description="Показывает одну картинку, но при наведении курсора плавно заменяет её на другую. Идеально для демонстрации трансформаций или вида 'до/после'."
            code={`{{HoverImage|File:Normal.jpg|File:DemonMode.jpg|width=300px}}

1 аргумент: Базовая картинка
2 аргумент: Картинка при наведении`}
        />

        <TemplateExample 
            title="ImageTooltip (Картинка-подсказка)"
            description="Текст, при наведении на который всплывает маленькое окошко с картинкой. Полезно для иконок способностей в тексте."
            code={`Этот персонаж использует {{ImageTooltip|text=Огненный Шар|image=File:FireballIcon.png}} для атаки.`}
        />

        <TemplateExample 
            title="HoverText (Скрытый текст)"
            description="Текст, который меняется на другой при наведении."
            code={`{{HoverText|Наведи на меня|Секретное сообщение!}}`}
        />

        <TemplateExample 
            title="SpoilerList (Спойлер-список)"
            description="Компактный раскрывающийся список, отлично подходит для перечисления большого количества способностей или подвигов."
            code={`{{SpoilerList|title=Список Подвигов|content=
* Уничтожил гору
* Победил дракона
* Пережил взрыв сверхновой
}}`}
        />

        <TemplateExample 
            title="BattleResult (Итоги Битвы - Расширенный)"
            description="Теперь поддерживает фоновое изображение для создания эпичных баннеров побед/поражений."
            code={`{{BattleResult|result=Victory|score=Low Diff|image=File:BattleScene.jpg}}`}
        />

        <h2 className="text-2xl font-bold text-wom-primary mb-6 border-t border-white/10 pt-6">Базовые Шаблоны</h2>

        <TemplateExample 
            title="IMG2 (Изображение)"
            description="Основной способ добавить картинку в текст статьи."
            code={`{{IMG2|File:ИмяФайла.jpg|right|300px}}`}
        />

        <TemplateExample 
            title="Infobox (Карточка)"
            description="Таблица характеристик персонажа."
            code={`{{Infobox
| name = Имя
| image = File:Avatar.jpg
| origin = Вселенная
| classification = Класс
}}`}
        />

        <TemplateExample 
            title="MessageBlock (Блок Внимания)"
            description="Цветной блок уведомления."
            code={`{{MessageBlock|type=warning|title=Внимание|text=Текст предупреждения.}}`}
        />

        <TemplateExample 
            title="Tabber (Вкладки)"
            description="Переключаемые вкладки."
            code={`{{Tabber
|Форма 1=Текст...
|Форма 2=Текст...
}}`}
        />

        <TemplateExample 
            title="Spoiler (Спойлер)"
            description="Скрывает блок контента."
            code={`{{Spoiler|Заголовок|Скрытый текст}}`}
        />

        <TemplateExample 
            title="Navbox (Навигация)"
            description="Список ссылок внизу страницы."
            code={`{{Navbox|title=Группа|list=Персонаж 1, Персонаж 2}}`}
        />

    </div>
  );
};
